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
                phase: 'lobby', settings: { rounds: 6, viewingYaku: false, bustedViewing: false, cardBack: 'hana-red' },
                players: [], dealerId: null, turnPlayerId: null, roundNumber: 0, deck: [], field: [],
                pending: null, currentTurn: null, koiKoi: {}, roundBaselines: {}, roundResult: null,
                matchResult: null, logs: [], nextLogId: 0, lastAction: null, redeals: 0,
                thinkingBots: [], typingBots: []
            };
        }

        addPlayer(player) {
            if (this.state.phase !== 'lobby' || !player?.id || this.state.players.length >= 2) return false;
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
            const active = this.state.players.filter(player => player.isBot || player.connected !== false);
            if (active.length !== 2) return { ok: false, reason: 'Koi-Koi requires exactly two players.' };
            this.state.players = active;
            this.state.settings = {
                rounds: [3, 6, 12].includes(Number(settings.rounds)) ? Number(settings.rounds) : 6,
                viewingYaku: Boolean(settings.viewingYaku),
                bustedViewing: Boolean(settings.viewingYaku && settings.bustedViewing),
                cardBack: cleanText(settings.cardBack, 20, 'hana-red')
            };
            this.state.dealerId = active[Math.floor(this.random() * active.length)].id;
            this._dealRound();
            return { ok: true };
        }

        _dealRound() {
            this.state.roundNumber += 1;
            this.state.roundResult = null;
            this.state.pending = null;
            this.state.currentTurn = null;
            this.state.koiKoi = {};
            this.state.roundBaselines = {};
            this.state.thinkingBots = [];
            this.state.typingBots = [];
            let attempts = 0;
            while (attempts++ < 200) {
                const deck = Rules.createDeck(this.random);
                for (const player of this.state.players) {
                    player.hand = [];
                    player.captured = [];
                }
                const field = [];
                for (let index = 0; index < 8; index++) {
                    for (const player of this.state.players) {
                        const card = deck.pop(); card.ownerId = player.id; player.hand.push(card);
                    }
                    const fieldCard = deck.pop(); fieldCard.ownerId = null; field.push(fieldCard);
                }
                if (Object.values(Rules.byMonth(field)).some(group => group.length === 4)) {
                    this.state.redeals += 1;
                    continue;
                }
                this.state.deck = deck;
                this.state.field = field;
                break;
            }
            if (!this.state.deck.length) throw new Error('Could not produce a valid Hanafuda deal.');
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
            this._log(`Month ${this.state.roundNumber} begins. ${this.getPlayer(this.state.dealerId).name} is Oya and plays first.`, 'info');
            this._emit({ type: 'round_started', roundNumber: this.state.roundNumber, playerId: this.state.dealerId });
        }

        processAction(action, playerId) {
            const player = this.getPlayer(playerId);
            if (!player || !action?.type) return { ok: false, reason: 'Invalid action.' };
            if (action.type === 'CHAT') return this._handleChat(player, action.message);
            if (action.type === 'PLAY_HAND_CARD') return this.playHandCard(playerId, action.cardId);
            if (action.type === 'CHOOSE_CAPTURE') return this.chooseCapture(playerId, action.cardId);
            if (action.type === 'KOI_KOI') return this.resolveKoiChoice(playerId, true);
            if (action.type === 'SHOBU') return this.resolveKoiChoice(playerId, false);
            if (action.type === 'START_NEXT_ROUND') return this.startNextRound(playerId);
            return { ok: false, reason: 'Unknown action.' };
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
            return this._finishTurn(player);
        }

        _drawForTurn(player) {
            const card = this.state.deck.pop();
            if (!card) return this._finishTurn(player);
            this.state.currentTurn.drawCard = card;
            this.state.phase = 'AUTO_DECK_DRAW';
            return this._resolvePlayedCard(player, card, 'draw');
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
            const opponent = this.state.players.find(item => item.id !== playerId);
            const scoring = Rules.scoreWin(evaluation.points, Boolean(this.state.koiKoi[opponent?.id]));
            this._log(`${player.name} calls Shobu for ${scoring.total} point${scoring.total === 1 ? '' : 's'}.`, 'result');
            this._endRound(playerId, scoring.total, 'shobu', { scoring, yaku: evaluation.yaku });
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
            this.state.turnPlayerId = this.state.players[(currentIndex + 1) % this.state.players.length].id;
            this.state.phase = 'WAIT_HAND_SELECTION';
            this.state.lastAction = { type: 'turn', nonce: this.makeId(), playerId: this.state.turnPlayerId, time: this.now() };
            this._emit({ type: 'turn', playerId: this.state.turnPlayerId });
        }

        _endRound(winnerId, points, reason, details = {}) {
            const winner = this.getPlayer(winnerId);
            if (winner) winner.score += points;
            const previousDealerId = this.state.dealerId;
            if (!details.retainDealer) this.state.dealerId = winnerId;
            this.state.roundResult = { winnerId, points, reason, previousDealerId, dealerId: this.state.dealerId, ...details };
            this.state.pending = null;
            this.state.currentTurn = null;
            this.state.thinkingBots = [];
            this.state.typingBots = [];
            if (this.state.roundNumber >= this.state.settings.rounds) {
                const ordered = [...this.state.players].sort((left, right) => right.score - left.score || (left.id === this.state.dealerId ? -1 : 1));
                this.state.matchResult = { winnerId: ordered[0].id, order: ordered.map(player => player.id) };
                this.state.phase = 'MATCH_OVER';
            } else this.state.phase = 'END_ROUND';
            this.state.lastAction = { type: 'round_end', nonce: this.makeId(), winnerId, points, reason, time: this.now() };
            this._emit({ type: 'round_ended', winnerId, points, reason, matchOver: this.state.phase === 'MATCH_OVER' });
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
            player.id = newId; player.connected = true;
            for (const card of [...player.hand, ...player.captured]) card.ownerId = newId;
            if (this.state.dealerId === oldId) this.state.dealerId = newId;
            if (this.state.turnPlayerId === oldId) this.state.turnPlayerId = newId;
            if (this.state.pending?.playerId === oldId) this.state.pending.playerId = newId;
            if (this.state.currentTurn?.playerId === oldId) this.state.currentTurn.playerId = newId;
            if (this.state.koiKoi[oldId]) { this.state.koiKoi[newId] = this.state.koiKoi[oldId]; delete this.state.koiKoi[oldId]; }
            if (this.state.roundBaselines[oldId]) { this.state.roundBaselines[newId] = this.state.roundBaselines[oldId]; delete this.state.roundBaselines[oldId]; }
            this._emit({ type: 'reconnect', playerId: newId });
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
                const card = player.hand[0];
                if (card) this.playHandCard(player.id, card.id);
            }
            if (this.state.pending?.playerId === player.id) this.chooseCapture(player.id, this.state.pending.choiceIds[0]);
            return true;
        }

        getViewState(viewerId, spectator = false) {
            const state = JSON.parse(JSON.stringify(this.state));
            delete state.deck;
            state.deckCount = this.state.deck.length;
            state.viewerId = viewerId;
            for (const player of state.players) {
                if (!spectator && player.id !== viewerId) {
                    player.hand = player.hand.map(card => ({ id: card.id, ownerId: player.id, hidden: true }));
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
