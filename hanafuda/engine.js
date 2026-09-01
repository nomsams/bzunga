(function (root, factory) {
    const rules = root.HanafudaRules || (typeof require === 'function' ? require('./rules.js') : null);
    const api = factory(rules);
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.HanafudaGameEngine = api.HanafudaGameEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules) {
    'use strict';
    if (!Rules) throw new Error('HanafudaRules must be loaded first.');

    const cleanText = (value, maximum = 240, fallback = '') => String(value ?? '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximum) || fallback;

    class HanafudaGameEngine {
        constructor(options = {}) {
            this.random = options.random || Math.random;
            this.now = options.now || (() => Date.now());
            this.makeId = options.makeId || (() => Math.random().toString(36).slice(2, 11));
            this.onChange = options.onChange || (() => {});
            this.onEvent = options.onEvent || (() => {});
            this.state = this.createInitialState();
        }

        createInitialState() {
            return {
                phase: 'lobby', settings: { mode: 'duel', rounds: 6, viewingYaku: false, bustedViewing: false, cardBack: 'hana-red', cardFront: 'original', cardArt: 'hawaii-svg' },
                players: [], dealerId: null, turnPlayerId: null, roundNumber: 0, deck: [], field: [],
                pending: null, currentTurn: null, turnAnimation: null, koiKoi: {}, roundBaselines: {}, roundResult: null,
                matchResult: null, logs: [], nextLogId: 0, lastAction: null, redeals: 0,
                thinkingBots: [], typingBots: []
            };
        }

        addPlayer(player) {
            const mode = Rules.tableMode(this.state.settings.mode);
            if (this.state.phase !== 'lobby' || !player?.id || this.state.players.length >= mode.playerCount) return false;
            if (this.state.players.some(existing => existing.id === player.id)) return false;
            this.state.players.push({
                id: player.id, name: cleanText(player.name, 24, 'Player'), sessionToken: cleanText(player.sessionToken, 80),
                isHost: Boolean(player.isHost), isBot: Boolean(player.isBot), botDifficulty: Number(player.botDifficulty) || 0,
                historicalPersona: cleanText(player.historicalPersona, 40), connected: player.connected !== false,
                hand: [], captured: [], score: 0, lastChatAt: 0
            });
            this._emit({ type: 'player_joined', playerId: player.id });
            return true;
        }

        setTableMode(playerId, modeId) {
            const host = this.getPlayer(playerId);
            const mode = Rules.tableMode(modeId);
            if (this.state.phase !== 'lobby') return { ok: false, reason: 'Table mode cannot change after the deal.' };
            if (!host?.isHost) return { ok: false, reason: 'Only the host can change the table mode.' };
            if (!Rules.TABLE_MODES[modeId]) return { ok: false, reason: 'Choose a valid Hanafuda table mode.' };
            if (this.state.players.length > mode.playerCount) {
                return { ok: false, reason: `${mode.name} has ${mode.playerCount} seats. Remove ${this.state.players.length - mode.playerCount} player${this.state.players.length - mode.playerCount === 1 ? '' : 's'} first.` };
            }
            if (this.state.settings.mode === mode.id) return { ok: true, mode: mode.id };
            this.state.settings.mode = mode.id;
            this.state.lastAction = { type: 'mode_changed', nonce: this.makeId(), playerId, mode: mode.id, time: this.now() };
            this._log(`${host.name} changed the table to ${mode.name} (${mode.playerCount} players).`, 'info');
            this._emit({ type: 'mode_changed', playerId, mode: mode.id });
            return { ok: true, mode: mode.id };
        }

        removePlayer(playerId) {
            if (this.state.phase !== 'lobby') return false;
            const before = this.state.players.length;
            this.state.players = this.state.players.filter(player => player.id !== playerId);
            if (this.state.players.length === before) return false;
            this._emit({ type: 'player_removed', playerId });
            return true;
        }

        startGame(settings = {}) {
            if (this.state.phase !== 'lobby') return { ok: false, reason: 'The match has already started.' };
            const mode = Rules.tableMode(settings.mode || this.state.settings.mode);
            const active = this.state.players.filter(player => player.isBot || player.connected !== false);
            if (active.length !== mode.playerCount) {
                const difference = Math.abs(mode.playerCount - active.length);
                const instruction = active.length < mode.playerCount ? `Add ${difference} more` : `Remove ${difference}`;
                return { ok: false, reason: `${mode.name} requires exactly ${mode.playerCount} active players. ${instruction} player${difference === 1 ? '' : 's'} or choose another mode.` };
            }
            this.state.players = active;
            this.state.settings = {
                mode: mode.id,
                rounds: [3, 6, 12].includes(Number(settings.rounds)) ? Number(settings.rounds) : 6,
                viewingYaku: Boolean(settings.viewingYaku),
                bustedViewing: Boolean(settings.viewingYaku && settings.bustedViewing),
                cardBack: cleanText(settings.cardBack, 20, 'hana-red'),
                cardFront: ['original', 'invert', 'white-red'].includes(settings.cardFront) ? settings.cardFront : 'original',
                cardArt: ['scanned-svg', 'mantia-png', 'hawaii-svg'].includes(settings.cardArt) ? settings.cardArt : 'hawaii-svg'
            };
            const dealerIndex = Math.min(active.length - 1, Math.max(0, Math.floor(Number(this.random()) * active.length) || 0));
            this.state.dealerId = active[dealerIndex].id;
            this._dealRound();
            return { ok: true };
        }

        _dealRound() {
            const mode = Rules.tableMode(this.state.settings.mode);
            const dealRandom = () => Math.min(0.999999999999, Math.max(0, Number(this.random()) || 0));
            let prepared = null;
            let attempts = 0;
            while (attempts++ < 200) {
                const deck = Rules.createDeck(dealRandom);
                const hands = new Map(this.state.players.map(player => [player.id, []]));
                const field = [];
                for (let index = 0; index < mode.handSize; index++) {
                    for (const player of this.state.players) {
                        const card = deck.pop(); card.ownerId = player.id; hands.get(player.id).push(card);
                    }
                }
                for (let index = 0; index < mode.fieldSize; index++) {
                    const fieldCard = deck.pop(); fieldCard.ownerId = null; field.push(fieldCard);
                }
                if (Object.values(Rules.byMonth(field)).some(group => group.length === 4)) {
                    this.state.redeals += 1;
                    continue;
                }
                prepared = { deck, field, hands };
                break;
            }
            if (!prepared) {
                const deck = Rules.createDeck(() => 0.2);
                const hands = new Map(this.state.players.map(player => [player.id, []]));
                const field = [];
                for (let index = 0; index < mode.handSize; index++) {
                    for (const player of this.state.players) {
                        const card = deck.pop(); card.ownerId = player.id; hands.get(player.id).push(card);
                    }
                }
                for (let index = 0; index < mode.fieldSize; index++) {
                    const card = deck.pop(); card.ownerId = null; field.push(card);
                }
                prepared = { deck, field, hands };
            }
            this.state.roundNumber += 1;
            this.state.roundResult = null;
            this.state.pending = null;
            this.state.currentTurn = null;
            this.state.turnAnimation = null;
            this.state.koiKoi = {};
            this.state.roundBaselines = {};
            this.state.thinkingBots = [];
            this.state.typingBots = [];
            this.state.deck = prepared.deck;
            this.state.field = prepared.field;
            for (const player of this.state.players) {
                player.hand = prepared.hands.get(player.id) || [];
                player.captured = [];
            }
            this.state.phase = 'CHECK_BOARD_STATE';
            this.state.lastAction = { type: 'deal', nonce: this.makeId(), roundNumber: this.state.roundNumber, time: this.now() };

            const wins = this.state.players.map(player => ({ player, win: Rules.instantWin(player.hand) })).filter(item => item.win);
            if (wins.length) {
                const winner = wins.find(item => item.player.id === this.state.dealerId) || wins[0];
                this._log(`${winner.player.name} has ${winner.win.label} and takes 6 points.`, 'result');
                this._endRound(winner.player.id, 6, 'instant', { retainDealer: true, yaku: [winner.win] });
                return;
            }
            this.state.phase = 'WAIT_HAND_SELECTION';
            this.state.turnPlayerId = this.state.dealerId;
            this._log(`Month ${this.state.roundNumber} begins in ${mode.name}. ${this.getPlayer(this.state.dealerId).name} is Oya and plays first.`, 'info');
            this._emit({ type: 'round_started', roundNumber: this.state.roundNumber, playerId: this.state.dealerId });
        }

        processAction(action, playerId) {
            const player = this.getPlayer(playerId);
            if (!player || !action?.type) return { ok: false, reason: 'Invalid action.' };
            if (action.type === 'CHAT') return this._handleChat(player, action.message);
            if (action.type === 'RENAME') return this.renamePlayer(playerId, action.name);
            if (action.type === 'SET_TABLE_MODE') return this.setTableMode(playerId, action.mode);
            if (action.type === 'PLAY_HAND_CARD') return this.playHandCard(playerId, action.cardId);
            if (action.type === 'CHOOSE_CAPTURE') return this.chooseCapture(playerId, action.cardId);
            if (action.type === 'KOI_KOI') return this.resolveKoiChoice(playerId, true);
            if (action.type === 'SHOBU') return this.resolveKoiChoice(playerId, false);
            if (action.type === 'START_NEXT_ROUND') return this.startNextRound(playerId);
            return { ok: false, reason: 'Unknown action.' };
        }

        renamePlayer(playerId, requestedName) {
            const player = this.getPlayer(playerId);
            if (!player || player.isBot) return { ok: false, reason: 'That seat cannot be renamed.' };
            const base = cleanText(requestedName, 24);
            if (!base) return { ok: false, reason: 'Enter a name first.' };
            const used = new Set(this.state.players.filter(item => item.id !== playerId).map(item => item.name.toLowerCase()));
            let name = base;
            let suffix = 2;
            while (used.has(name.toLowerCase())) {
                const ending = ` ${suffix++}`;
                name = `${base.slice(0, 24 - ending.length)}${ending}`;
            }
            if (name === player.name) return { ok: true, name };
            const previous = player.name;
            player.name = name;
            this._log(`${previous} is now playing as ${name}.`, 'info');
            this._emit({ type: 'rename', playerId, name });
            return { ok: true, name };
        }

        setHost(playerId) {
            const player = this.getPlayer(playerId);
            if (!player || player.isBot || player.connected === false) return false;
            this.state.players.forEach(item => { item.isHost = item.id === playerId; });
            this._log(`${player.name} is now the table host.`, 'info');
            this._emit({ type: 'host_changed', playerId });
            return true;
        }

        playHandCard(playerId, cardId) {
            if (this.state.phase !== 'WAIT_HAND_SELECTION' || this.state.turnPlayerId !== playerId) return { ok: false, reason: 'Wait for your turn.' };
            const player = this.getPlayer(playerId);
            const card = player?.hand.find(item => item.id === cardId);
            if (!card) return { ok: false, reason: 'That card is not in your hand.' };
            player.hand = player.hand.filter(item => item.id !== cardId);
            this.state.currentTurn = { playerId, handCard: card, handCaptured: [], drawCard: null, drawCaptured: [] };
            return this._resolvePlayedCard(player, card, 'hand');
        }

        chooseCapture(playerId, cardId) {
            if (!['WAIT_HAND_CAPTURE', 'WAIT_DRAW_CAPTURE'].includes(this.state.phase)) return { ok: false, reason: 'There is no capture choice.' };
            if (this.state.turnPlayerId !== playerId || this.state.pending?.playerId !== playerId) return { ok: false, reason: 'That choice belongs to the active player.' };
            if (!this.state.pending.choiceIds.includes(cardId)) return { ok: false, reason: 'Choose one of the highlighted matching cards.' };
            const player = this.getPlayer(playerId);
            return this._finishCapture(player, this.state.pending.card, this.state.pending.source, cardId);
        }

        _resolvePlayedCard(player, card, source) {
            const resolution = Rules.resolveCapture(this.state.field, card);
            if (resolution.needsChoice) {
                this.state.pending = { playerId: player.id, source, card, choiceIds: resolution.choices.map(item => item.id) };
                this.state.phase = source === 'hand' ? 'WAIT_HAND_CAPTURE' : 'WAIT_DRAW_CAPTURE';
                this.state.lastAction = { type: 'capture_choice', nonce: this.makeId(), playerId: player.id, source, card: { ...card }, time: this.now() };
                this._emit({ type: 'capture_choice', playerId: player.id, source });
                return { ok: true, needsChoice: true };
            }
            return this._applyCaptureResolution(player, card, source, resolution);
        }

        _finishCapture(player, card, source, targetId) {
            const resolution = Rules.resolveCapture(this.state.field, card, targetId);
            if (resolution.invalid) return { ok: false, reason: resolution.reason };
            return this._applyCaptureResolution(player, card, source, resolution);
        }

        _applyCaptureResolution(player, card, source, resolution) {
            this.state.field = resolution.field;
            this.state.pending = null;
            if (resolution.captured.length) {
                resolution.captured.forEach(item => { item.ownerId = player.id; });
                player.captured.push(...resolution.captured);
            } else card.ownerId = null;
            if (source === 'hand') this.state.currentTurn.handCaptured = resolution.captured.map(item => ({ ...item }));
            else this.state.currentTurn.drawCaptured = resolution.captured.map(item => ({ ...item }));
            this.state.lastAction = {
                type: resolution.captured.length ? 'capture' : 'field_play', nonce: this.makeId(), playerId: player.id,
                source, card: { ...card }, captured: resolution.captured.map(item => ({ ...item })), time: this.now()
            };
            this._log(`${player.name} ${resolution.captured.length ? `captured ${resolution.captured.length} cards` : 'added a card to the field'} from the ${source}.`, 'play');
            if (source === 'hand') return this._drawForTurn(player);
            this._publishTurnAnimation();
            return this._finishTurn(player);
        }

        _drawForTurn(player) {
            const card = this.state.deck.pop();
            if (!card) { this._publishTurnAnimation(); return this._finishTurn(player); }
            this.state.currentTurn.drawCard = card;
            this.state.phase = 'AUTO_DECK_DRAW';
            return this._resolvePlayedCard(player, card, 'draw');
        }

        _publishTurnAnimation() {
            const turn = this.state.currentTurn;
            if (!turn?.handCard) return null;
            this.state.turnAnimation = {
                nonce: this.makeId(), playerId: turn.playerId, time: this.now(),
                hand: { card: { ...turn.handCard }, captured: (turn.handCaptured || []).map(card => ({ ...card })) },
                draw: turn.drawCard ? { card: { ...turn.drawCard }, captured: (turn.drawCaptured || []).map(card => ({ ...card })) } : null
            };
            return this.state.turnAnimation;
        }

        _finishTurn(player) {
            const current = Rules.evaluateYaku(player.captured, this.state.settings);
            const previous = this.state.roundBaselines[player.id] || { yaku: [], points: 0, signature: '' };
            const improved = Rules.isNewOrUpgraded(previous, current);
            if (improved && current.points > 0) {
                this.state.pending = { playerId: player.id, evaluation: current, previous };
                const handsEmpty = this.state.players.every(item => item.hand.length === 0);
                if (handsEmpty || player.hand.length === 0) {
                    this.state.phase = 'WAIT_KOI_KOI_CHOICE';
                    this._log(`${player.name} made a Yaku on the final turn. Shobu is automatic.`, 'success');
                    return this.resolveKoiChoice(player.id, false, true);
                }
                this.state.phase = 'WAIT_KOI_KOI_CHOICE';
                this._log(`${player.name} formed ${current.yaku.map(item => item.name).join(', ')}. Koi-Koi or Shobu?`, 'success');
                this._emit({ type: 'yaku', playerId: player.id, evaluation: current });
                return { ok: true, yakuChoice: true };
            }
            this._switchTurn();
            return { ok: true };
        }

        resolveKoiChoice(playerId, continuePlaying, forced = false) {
            if (this.state.phase !== 'WAIT_KOI_KOI_CHOICE' || this.state.pending?.playerId !== playerId) return { ok: false, reason: 'There is no Koi-Koi choice for you.' };
            const player = this.getPlayer(playerId);
            const evaluation = this.state.pending.evaluation;
            if (continuePlaying && player.hand.length > 0 && !forced) {
                this.state.koiKoi[playerId] = (this.state.koiKoi[playerId] || 0) + 1;
                this.state.roundBaselines[playerId] = evaluation;
                this.state.pending = null;
                this._log(`${player.name} calls Koi-Koi and risks the points.`, 'warning');
                this.state.lastAction = { type: 'koi_koi', nonce: this.makeId(), playerId, time: this.now() };
                this._switchTurn();
                return { ok: true };
            }
            const riskyOpponents = this.state.players.filter(item => item.id !== playerId && Boolean(this.state.koiKoi[item.id]));
            const scoring = Rules.scoreWin(evaluation.points, riskyOpponents.length > 0);
            this._log(`${player.name} calls Shobu for ${scoring.total} point${scoring.total === 1 ? '' : 's'}.`, 'result');
            this._endRound(playerId, scoring.total, 'shobu', { scoring, yaku: evaluation.yaku, koiKoiPenaltyPlayerIds: riskyOpponents.map(item => item.id) });
            return { ok: true };
        }

        _switchTurn() {
            this.state.pending = null;
            this.state.currentTurn = null;
            if (this.state.players.every(player => player.hand.length === 0)) {
                this._log(`No new Yaku was completed. Oya receives 6 points.`, 'result');
                this._endRound(this.state.dealerId, 6, 'oya-ken', { retainDealer: true, yaku: [] });
                return;
            }
            const currentIndex = this.state.players.findIndex(player => player.id === this.state.turnPlayerId);
            let next = null;
            for (let offset = 1; offset <= this.state.players.length; offset += 1) {
                const candidate = this.state.players[(Math.max(-1, currentIndex) + offset) % this.state.players.length];
                if (candidate?.hand?.length && (candidate.isBot || candidate.connected !== false)) { next = candidate; break; }
            }
            if (!next) {
                next = this.state.players.find(player => player.hand?.length) || null;
                if (!next) {
                    this._log(`No playable hand remains. Oya receives 6 points.`, 'result');
                    this._endRound(this.state.dealerId, 6, 'oya-ken', { retainDealer: true, yaku: [] });
                    return;
                }
            }
            this.state.turnPlayerId = next.id;
            this.state.phase = 'WAIT_HAND_SELECTION';
            const waiting = !next.isBot && next.connected === false;
            this.state.lastAction = { type: waiting ? 'waiting_reconnect' : 'turn', nonce: this.makeId(), playerId: this.state.turnPlayerId, time: this.now() };
            this._emit({ type: waiting ? 'waiting_reconnect' : 'turn', playerId: this.state.turnPlayerId });
        }

        recoverStalledTurn() {
            const actionable = ['WAIT_HAND_SELECTION', 'WAIT_HAND_CAPTURE', 'WAIT_DRAW_CAPTURE', 'WAIT_KOI_KOI_CHOICE'];
            if (!actionable.includes(this.state.phase)) return false;
            let active = this.activePlayer();
            const referencedId = this.state.pending?.playerId || this.state.currentTurn?.playerId;
            if (!active && referencedId) {
                active = this.getPlayer(referencedId);
                if (active) this.state.turnPlayerId = active.id;
            }
            if (!active) {
                this._log(`The active seat could not be restored. The turn moves on automatically.`, 'warning');
                this._switchTurn();
                return true;
            }
            if (this.state.phase === 'WAIT_HAND_SELECTION') {
                if (active.hand?.length) return false;
                this._log(`${active.name} has no playable card. The turn moves on automatically.`, 'warning');
                this._switchTurn();
                return true;
            }
            if (['WAIT_HAND_CAPTURE', 'WAIT_DRAW_CAPTURE'].includes(this.state.phase)) {
                const source = this.state.phase === 'WAIT_HAND_CAPTURE' ? 'hand' : 'draw';
                const turn = this.state.currentTurn;
                const card = this.state.pending?.card || (source === 'hand' ? turn?.handCard : turn?.drawCard);
                if (!card) {
                    this._log(`${active.name}'s unfinished capture could not be restored. The turn moves on safely.`, 'warning');
                    this._switchTurn();
                    return true;
                }
                if (!turn || turn.playerId !== active.id) {
                    this.state.currentTurn = {
                        playerId: active.id,
                        handCard: source === 'hand' ? card : turn?.handCard || null,
                        handCaptured: turn?.handCaptured || [],
                        drawCard: source === 'draw' ? card : turn?.drawCard || null,
                        drawCaptured: turn?.drawCaptured || []
                    };
                }
                const resolution = Rules.resolveCapture(this.state.field, card);
                if (resolution.needsChoice) {
                    const choiceIds = resolution.choices.map(item => item.id);
                    const pending = this.state.pending;
                    const valid = pending?.playerId === active.id && pending.source === source && pending.card?.id === card.id
                        && choiceIds.length === pending.choiceIds?.length && choiceIds.every(id => pending.choiceIds.includes(id));
                    if (valid) return false;
                    this.state.pending = { playerId: active.id, source, card, choiceIds };
                    this.state.lastAction = { type: 'capture_choice_recovered', nonce: this.makeId(), playerId: active.id, source, card: { ...card }, time: this.now() };
                    this._emit({ type: 'turn_recovered', playerId: active.id, phase: this.state.phase });
                    return true;
                }
                this._log(`${active.name}'s capture state was repaired automatically.`, 'warning');
                this._applyCaptureResolution(active, card, source, resolution);
                return true;
            }
            const evaluation = Rules.evaluateYaku(active.captured || [], this.state.settings || {});
            const previous = this.state.roundBaselines?.[active.id] || { yaku: [], points: 0, signature: '' };
            const improved = evaluation.points > 0 && Rules.isNewOrUpgraded(previous, evaluation);
            const pending = this.state.pending;
            const valid = pending?.playerId === active.id && pending.evaluation?.signature === evaluation.signature && improved;
            if (valid) return false;
            if (improved) {
                this.state.pending = { playerId: active.id, evaluation, previous };
                this.state.lastAction = { type: 'yaku_choice_recovered', nonce: this.makeId(), playerId: active.id, time: this.now() };
                this._emit({ type: 'turn_recovered', playerId: active.id, phase: this.state.phase });
                return true;
            }
            this._log(`${active.name}'s stale Koi-Koi choice was cleared.`, 'warning');
            this._switchTurn();
            return true;
        }

        _endRound(winnerId, points, reason, details = {}) {
            const winner = this.getPlayer(winnerId);
            const awardedPoints = Math.max(0, Math.trunc(Number(points) || 0));
            const scoreBefore = Object.fromEntries(this.state.players.map(player => [player.id, Math.max(0, Number(player.score) || 0)]));
            if (winner) winner.score = scoreBefore[winner.id] + awardedPoints;
            const scoreAfter = Object.fromEntries(this.state.players.map(player => [player.id, Math.max(0, Number(player.score) || 0)]));
            const previousDealerId = this.state.dealerId;
            if (!details.retainDealer) this.state.dealerId = winnerId;
            this.state.roundResult = { winnerId, points: awardedPoints, reason, previousDealerId, dealerId: this.state.dealerId, scoreBefore, scoreAfter, ...details };
            this.state.pending = null;
            this.state.currentTurn = null;
            this.state.thinkingBots = [];
            this.state.typingBots = [];
            if (this.state.roundNumber >= this.state.settings.rounds) {
                const seats = new Map(this.state.players.map((player, index) => [player.id, index]));
                const ordered = [...this.state.players].sort((left, right) => Number(right.score) - Number(left.score)
                    || Number(right.id === this.state.dealerId) - Number(left.id === this.state.dealerId)
                    || seats.get(left.id) - seats.get(right.id));
                this.state.matchResult = { winnerId: ordered[0].id, order: ordered.map(player => player.id) };
                this.state.phase = 'MATCH_OVER';
            } else this.state.phase = 'END_ROUND';
            this.state.lastAction = { type: 'round_end', nonce: this.makeId(), winnerId, points: awardedPoints, reason, time: this.now() };
            this._emit({ type: 'round_ended', winnerId, points: awardedPoints, reason, matchOver: this.state.phase === 'MATCH_OVER' });
        }

        startNextRound(playerId) {
            const player = this.getPlayer(playerId);
            if (!player?.isHost || this.state.phase !== 'END_ROUND') return { ok: false, reason: 'Only the host can deal the next month.' };
            this._dealRound();
            return { ok: true };
        }

        disconnectPlayer(playerId) {
            const player = this.getPlayer(playerId);
            if (!player) return false;
            player.connected = false;
            this._log(`${player.name} disconnected. Their seat is reserved.`, 'warning');
            this._emit({ type: 'disconnect', playerId });
            return true;
        }

        reconnectPlayer(oldId, newId) {
            const player = this.getPlayer(oldId);
            if (!player) return false;
            const targetId = cleanText(newId, 80);
            if (!targetId || (targetId !== oldId && this.getPlayer(targetId))) return false;
            if (oldId === targetId) {
                player.connected = true;
                this._emit({ type: 'reconnect', playerId: oldId });
                return true;
            }
            const replace = value => value === oldId ? targetId : value;
            const replaceScoreKey = scores => {
                if (!scores || !Object.prototype.hasOwnProperty.call(scores, oldId)) return;
                scores[targetId] = scores[oldId]; delete scores[oldId];
            };
            player.id = targetId; player.connected = true;
            for (const card of [...player.hand, ...player.captured]) card.ownerId = targetId;
            this.state.dealerId = replace(this.state.dealerId);
            this.state.turnPlayerId = replace(this.state.turnPlayerId);
            if (this.state.pending?.playerId === oldId) this.state.pending.playerId = targetId;
            if (this.state.pending?.card?.ownerId === oldId) this.state.pending.card.ownerId = targetId;
            if (this.state.currentTurn?.playerId === oldId) this.state.currentTurn.playerId = targetId;
            if (this.state.turnAnimation?.playerId === oldId) this.state.turnAnimation.playerId = targetId;
            const migrateCards = value => {
                if (!value || typeof value !== 'object') return;
                if (value.ownerId === oldId) value.ownerId = targetId;
                Object.values(value).forEach(item => Array.isArray(item) ? item.forEach(migrateCards) : migrateCards(item));
            };
            migrateCards(this.state.currentTurn);
            migrateCards(this.state.turnAnimation);
            if (this.state.koiKoi[oldId]) { this.state.koiKoi[targetId] = this.state.koiKoi[oldId]; delete this.state.koiKoi[oldId]; }
            if (this.state.roundBaselines[oldId]) { this.state.roundBaselines[targetId] = this.state.roundBaselines[oldId]; delete this.state.roundBaselines[oldId]; }
            this.state.thinkingBots = (this.state.thinkingBots || []).map(replace);
            this.state.typingBots = (this.state.typingBots || []).map(replace);
            if (this.state.lastAction?.playerId === oldId) this.state.lastAction.playerId = targetId;
            if (this.state.lastAction?.winnerId === oldId) this.state.lastAction.winnerId = targetId;
            for (const log of this.state.logs || []) if (log.playerId === oldId) log.playerId = targetId;
            if (this.state.roundResult) {
                ['winnerId', 'previousDealerId', 'dealerId'].forEach(key => { this.state.roundResult[key] = replace(this.state.roundResult[key]); });
                this.state.roundResult.koiKoiPenaltyPlayerIds = (this.state.roundResult.koiKoiPenaltyPlayerIds || []).map(replace);
                replaceScoreKey(this.state.roundResult.scoreBefore); replaceScoreKey(this.state.roundResult.scoreAfter);
            }
            if (this.state.matchResult) {
                this.state.matchResult.winnerId = replace(this.state.matchResult.winnerId);
                this.state.matchResult.order = (this.state.matchResult.order || []).map(replace);
            }
            this._emit({ type: 'reconnect', playerId: targetId });
            return true;
        }

        skipDisconnectedTurn() {
            if (!this.state.turnPlayerId || !['WAIT_HAND_SELECTION', 'WAIT_HAND_CAPTURE', 'WAIT_DRAW_CAPTURE', 'WAIT_KOI_KOI_CHOICE'].includes(this.state.phase)) return false;
            const player = this.getPlayer(this.state.turnPlayerId);
            if (!player || player.connected !== false || player.isBot) return false;
            if (this.state.phase === 'WAIT_KOI_KOI_CHOICE') {
                this._log(`${player.name} is away, so the table safely banks the completed yaku.`, 'info');
                this.resolveKoiChoice(player.id, false);
                return true;
            }
            if (this.state.phase === 'WAIT_HAND_SELECTION') {
                const next = this.state.players.some(item => item.id !== player.id && item.hand?.length && (item.isBot || item.connected !== false));
                if (!next) return false;
                this._log(`${player.name} is away, so their turn is skipped.`, 'info');
                this._switchTurn();
                return true;
            }
            const choiceId = this.state.pending?.playerId === player.id && Array.isArray(this.state.pending.choiceIds)
                ? this.state.pending.choiceIds[0]
                : null;
            if (choiceId) this.chooseCapture(player.id, choiceId);
            else this.recoverStalledTurn();
            return true;
        }

        getViewState(viewerId, spectator = false) {
            const state = JSON.parse(JSON.stringify(this.state));
            delete state.deck;
            state.deckCount = this.state.deck.length;
            state.viewerId = viewerId;
            for (const player of state.players) {
                if (!spectator && player.id !== viewerId) {
                    player.hand = player.hand.map((card, index) => ({ id: `hidden-${player.id}-${index}`, ownerId: player.id, hidden: true }));
                }
                player.sessionToken = '';
            }
            return state;
        }

        getPlayer(id) { return this.state.players.find(player => player.id === id); }
        activePlayer() { return this.getPlayer(this.state.turnPlayerId); }

        setBotActivity(playerId, type, active) {
            const key = type === 'typing' ? 'typingBots' : 'thinkingBots';
            const values = new Set(this.state[key]);
            active ? values.add(playerId) : values.delete(playerId);
            this.state[key] = [...values];
            this.onChange(this.state);
        }

        addBotChat(playerId, message) {
            const player = this.getPlayer(playerId);
            if (!player?.isBot) return false;
            return this._handleChat(player, message, true).ok;
        }

        _handleChat(player, rawMessage, isBot = false) {
            const message = cleanText(rawMessage, 180);
            if (!message) return { ok: false, reason: 'Write a message first.' };
            const now = this.now();
            if (!isBot && now - player.lastChatAt < 650) return { ok: false, reason: 'Slow down a little.' };
            player.lastChatAt = now;
            this.state.logs.push({ id: ++this.state.nextLogId, type: 'chat', playerId: player.id, name: player.name, message, time: now });
            if (this.state.logs.length > 100) this.state.logs.splice(0, this.state.logs.length - 100);
            this._emit({ type: 'chat', playerId: player.id, name: player.name, message, isBot });
            return { ok: true };
        }

        _log(message, kind = 'info') {
            this.state.logs.push({ id: ++this.state.nextLogId, type: 'system', kind, message, time: this.now() });
            if (this.state.logs.length > 100) this.state.logs.splice(0, this.state.logs.length - 100);
        }

        _emit(event) {
            this.onEvent(event, this.state);
            this.onChange(this.state);
        }
    }

    return { HanafudaGameEngine };
});
