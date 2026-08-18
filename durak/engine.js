(function (root, factory) {
    const rules = typeof module === 'object' && module.exports
        ? require('./rules.js')
        : root.DurakRules;
    const api = factory(rules);
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.DurakGameEngine = api.DurakGameEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules) {
    'use strict';

    const MAX_PLAYERS = 6;
    const HAND_SIZE = 6;

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    class DurakGameEngine {
        constructor(options = {}) {
            this.random = options.random || Math.random;
            this.now = options.now || (() => Date.now());
            this.idFactory = options.idFactory || (() => `d-${Math.random().toString(36).slice(2, 11)}`);
            this.state = this.createInitialState();
        }

        createInitialState() {
            return {
                phase: 'lobby',
                roundNumber: 0,
                players: [],
                talon: [],
                trumpSuit: null,
                trumpCardId: null,
                battle: [],
                discardCount: 0,
                mainAttackerId: null,
                defenderId: null,
                attackTurnId: null,
                waitingAttackerId: null,
                lastAttackerId: null,
                attackLimit: 0,
                passedAttackers: [],
                pickupDeclared: false,
                finishedOrder: [],
                durakId: null,
                history: [],
                logs: [],
                nextLogId: 0,
                lastAction: null,
                lastRoundResult: null,
                thinkingBots: [],
                typingBots: [],
                startedAt: 0
            };
        }

        addPlayer(player) {
            if (this.state.phase !== 'lobby') return { ok: false, reason: 'The deal has already started.' };
            if (this.state.players.length >= MAX_PLAYERS) return { ok: false, reason: 'This table is full.' };
            if (!player?.id || this.state.players.some(existing => existing.id === player.id)) {
                return { ok: false, reason: 'That player is already seated.' };
            }
            this.state.players.push({
                id: String(player.id),
                name: String(player.name || 'Player').slice(0, 24),
                isHost: Boolean(player.isHost),
                isBot: Boolean(player.isBot),
                botDifficulty: Number(player.botDifficulty || 0),
                historicalPersona: String(player.historicalPersona || '').slice(0, 40),
                sessionToken: String(player.sessionToken || '').slice(0, 80),
                connected: player.connected !== false,
                disconnectTurns: 0,
                hand: [],
                out: false,
                finishPlace: null
            });
            this.log(`${player.name || 'Player'} joined the Durak table.`, 'system');
            return { ok: true };
        }

        removePlayer(playerId) {
            if (this.state.phase !== 'lobby') return { ok: false, reason: 'Players cannot be removed during a deal.' };
            const before = this.state.players.length;
            this.state.players = this.state.players.filter(player => player.id !== playerId);
            return { ok: this.state.players.length !== before };
        }

        log(message, type = 'system', name = null) {
            this.state.nextLogId += 1;
            this.state.logs.push({
                id: this.state.nextLogId,
                type,
                name,
                message: String(message).slice(0, 260),
                time: this.now()
            });
            if (this.state.logs.length > 140) this.state.logs.splice(0, this.state.logs.length - 140);
        }

        addChat(playerId, message) {
            const player = this.getPlayer(playerId);
            const clean = String(message || '').trim().slice(0, 240);
            if (!player || !clean) return { ok: false, reason: 'Empty message.' };
            this.log(clean, 'chat', player.name);
            return { ok: true };
        }

        getPlayer(playerId) {
            return this.state.players.find(player => player.id === playerId);
        }

        getCard(cardId) {
            for (const player of this.state.players) {
                const card = player.hand.find(candidate => candidate.id === cardId);
                if (card) return card;
            }
            for (const pair of this.state.battle) {
                if (pair.attackCard?.id === cardId) return pair.attackCard;
                if (pair.defenseCard?.id === cardId) return pair.defenseCard;
            }
            return this.state.talon.find(card => card.id === cardId) || null;
        }

        activePlayers() {
            return this.state.players.filter(player => !player.out);
        }

        availablePlayers() {
            return this.state.players.filter(player => !player.out && (player.isBot || player.connected !== false));
        }

        clockwiseFrom(playerId, includeStart = false) {
            const players = this.state.players;
            const startIndex = players.findIndex(player => player.id === playerId);
            if (startIndex < 0) return [];
            const result = [];
            for (let offset = includeStart ? 0 : 1; offset <= players.length; offset++) {
                const player = players[(startIndex + offset) % players.length];
                if (!player.out && (player.isBot || player.connected !== false) && !result.some(existing => existing.id === player.id)) result.push(player);
            }
            return result;
        }

        nextActiveAfter(playerId) {
            return this.clockwiseFrom(playerId, false)[0] || null;
        }

        recycleDisconnectedPlayer(playerId) {
            const player = this.getPlayer(playerId);
            if (!player || player.isBot || player.connected !== false) return false;
            const recycled = player.hand.splice(0);
            for (const card of recycled) {
                card.ownerId = null;
                card.loc = 'talon';
            }
            const turnUp = this.state.talon.find(card => card.id === this.state.trumpCardId) || null;
            const pool = [...this.state.talon.filter(card => card.id !== this.state.trumpCardId), ...recycled];
            const shuffled = Rules.shuffle(pool, this.random);
            this.state.talon = turnUp ? [turnUp, ...shuffled] : shuffled;
            this.state.players = this.state.players.filter(candidate => candidate.id !== playerId);
            this.state.finishedOrder = this.state.finishedOrder.filter(id => id !== playerId);
            this.state.passedAttackers = this.state.passedAttackers.filter(id => id !== playerId);
            this.log(`${player.name} missed more than three turns. Their ${recycled.length} card${recycled.length === 1 ? '' : 's'} returned to the talon and their seat was closed.`, 'warning');
            return true;
        }

        advanceDisconnectClock() {
            const expired = [];
            for (const player of this.state.players) {
                if (player.isBot || player.connected !== false || player.out) continue;
                player.disconnectTurns = (player.disconnectTurns || 0) + 1;
                if (player.disconnectTurns > 3) expired.push(player.id);
            }
            expired.forEach(playerId => this.recycleDisconnectedPlayer(playerId));
            return expired;
        }

        disconnectPlayer(playerId) {
            const player = this.getPlayer(playerId);
            if (!player || player.isBot || player.connected === false) return false;
            player.connected = false;
            player.disconnectTurns = 0;
            this.log(`${player.name} disconnected and will be skipped until they return.`, 'warning');
            if (this.state.phase === 'lobby' || this.state.phase === 'game_over') return true;
            if (this.state.defenderId === playerId && this.state.battle.length) {
                this.resolveRound(true);
                return true;
            }
            if (this.state.attackTurnId === playerId) {
                if (this.state.battle.length) this.passAttack(player);
                else {
                    const next = this.nextActiveAfter(playerId) || this.availablePlayers()[0];
                    if (next) this.beginRound(next.id);
                }
            }
            return true;
        }

        reconnectPlayer(oldId, newId) {
            const player = this.getPlayer(oldId);
            if (!player || player.isBot) return false;
            player.id = String(newId);
            player.connected = true;
            player.disconnectTurns = 0;
            player.hand.forEach(card => { card.ownerId = player.id; });
            const replace = value => value === oldId ? player.id : value;
            this.state.mainAttackerId = replace(this.state.mainAttackerId);
            this.state.defenderId = replace(this.state.defenderId);
            this.state.attackTurnId = replace(this.state.attackTurnId);
            this.state.waitingAttackerId = replace(this.state.waitingAttackerId);
            this.state.lastAttackerId = replace(this.state.lastAttackerId);
            this.state.durakId = replace(this.state.durakId);
            this.state.finishedOrder = this.state.finishedOrder.map(replace);
            this.state.passedAttackers = this.state.passedAttackers.map(replace);
            for (const pair of this.state.battle) {
                pair.attackerId = replace(pair.attackerId);
            }
            this.log(`${player.name} reconnected to their seat.`, 'success');
            if (this.state.phase === 'waiting' && this.availablePlayers().length >= 2) {
                this.beginRound(this.state.waitingAttackerId || player.id);
            }
            return true;
        }

        startGame() {
            if (!['lobby', 'game_over'].includes(this.state.phase)) {
                return { ok: false, reason: 'The deal has already started.' };
            }
            const activePlayers = this.state.players.filter(player => player.isBot || player.connected !== false);
            if (activePlayers.length < 2 || activePlayers.length > MAX_PLAYERS) {
                return { ok: false, reason: 'Durak needs 2 to 6 players.' };
            }
            this.state.players = activePlayers;
            const deck = Rules.shuffle(Rules.createDeck(), this.random);
            const turnUp = deck.pop();
            this.state.talon = [turnUp, ...deck];
            this.state.trumpSuit = turnUp.suit;
            this.state.trumpCardId = turnUp.id;
            this.state.battle = [];
            this.state.discardCount = 0;
            this.state.finishedOrder = [];
            this.state.durakId = null;
            this.state.roundNumber = 0;
            this.state.thinkingBots = [];
            this.state.typingBots = [];
            this.state.lastAction = null;
            this.state.lastRoundResult = null;
            this.state.waitingAttackerId = null;
            this.state.startedAt = this.now();
            this.state.players.forEach(player => {
                player.hand = [];
                player.out = false;
                player.finishPlace = null;
                player.disconnectTurns = 0;
            });

            for (let cardNumber = 0; cardNumber < HAND_SIZE; cardNumber++) {
                for (const player of this.state.players) {
                    const card = this.drawOne(player);
                    if (!card) break;
                }
            }

            const trumpHolders = this.state.players
                .flatMap(player => player.hand
                    .filter(card => card.suit === this.state.trumpSuit)
                    .map(card => ({ player, card })))
                .sort((first, second) => Rules.rankValue(first.card) - Rules.rankValue(second.card));
            const firstAttacker = trumpHolders[0]?.player || this.state.players[0];
            this.log(`${firstAttacker.name} opens with the lowest trump at the table.`, 'system');
            this.beginRound(firstAttacker.id);
            return { ok: true };
        }

        drawOne(player) {
            const card = this.state.talon.pop();
            if (!card) return null;
            card.ownerId = player.id;
            card.loc = 'hand';
            player.hand.push(card);
            return card;
        }

        beginRound(attackerId) {
            this.advanceDisconnectClock();
            let attacker = this.getPlayer(attackerId);
            if (!attacker || attacker.out || (!attacker.isBot && attacker.connected === false)) {
                attacker = this.nextActiveAfter(attackerId) || this.availablePlayers()[0];
            }
            if (!attacker) return this.finishIfNeeded();
            const defender = this.nextActiveAfter(attacker.id);
            if (!defender || defender.id === attacker.id) {
                const disconnected = this.activePlayers().filter(player => !player.isBot && player.connected === false);
                if (disconnected.length) {
                    this.state.phase = 'waiting';
                    this.state.mainAttackerId = attacker.id;
                    this.state.defenderId = null;
                    this.state.attackTurnId = null;
                    this.state.waitingAttackerId = attacker.id;
                    this.state.lastAction = { type: 'waiting_for_player', attackerId: attacker.id, time: this.now() };
                    this.log('Waiting for a disconnected player to return. Their seat is reserved for three skipped turns.', 'warning');
                    return false;
                }
                if (this.availablePlayers().length < 2) return this.finishIfNeeded();
                return false;
            }
            this.state.waitingAttackerId = null;
            this.state.roundNumber += 1;
            this.state.phase = 'attack';
            this.state.mainAttackerId = attacker.id;
            this.state.defenderId = defender.id;
            this.state.attackTurnId = attacker.id;
            this.state.lastAttackerId = attacker.id;
            this.state.attackLimit = Math.min(6, Math.max(1, defender.hand.length));
            this.state.battle = [];
            this.state.passedAttackers = [];
            this.state.pickupDeclared = false;
            this.state.lastAction = {
                type: 'round_started',
                attackerId: attacker.id,
                defenderId: defender.id,
                time: this.now()
            };
            return true;
        }

        resumeWaitingRound() {
            if (this.state.phase !== 'waiting') return false;
            const attackerId = this.state.waitingAttackerId || this.availablePlayers()[0]?.id;
            if (!attackerId) return this.finishIfNeeded();
            this.beginRound(attackerId);
            return true;
        }

        attackOrder(startId = this.state.mainAttackerId) {
            const start = this.getPlayer(startId);
            if (!start || start.out || start.id === this.state.defenderId) {
                const fallback = this.activePlayers().find(player => player.id !== this.state.defenderId);
                if (!fallback) return [];
                startId = fallback.id;
            }
            const ordered = this.clockwiseFrom(startId, true);
            return ordered.filter(player => player.id !== this.state.defenderId);
        }

        advanceAttackPriority(startId = this.state.attackTurnId) {
            const order = this.attackOrder(startId);
            const currentIndex = order.findIndex(player => player.id === startId);
            for (let step = 1; step <= order.length; step++) {
                const candidate = order[(Math.max(0, currentIndex) + step) % order.length];
                if (!this.state.passedAttackers.includes(candidate.id)) {
                    this.state.attackTurnId = candidate.id;
                    return true;
                }
            }
            this.resolveRound(this.state.pickupDeclared);
            return false;
        }

        resetAttackPriority(startId = this.state.mainAttackerId) {
            this.state.passedAttackers = [];
            const order = this.attackOrder(startId);
            this.state.attackTurnId = order[0]?.id || null;
        }

        removeCard(player, cardId) {
            const index = player.hand.findIndex(card => card.id === cardId);
            if (index < 0) return null;
            return player.hand.splice(index, 1)[0];
        }

        processAction(action, playerId) {
            const player = this.getPlayer(playerId);
            if (!player || !action?.type) return { ok: false, reason: 'Invalid action.' };
            if (action.type === 'CHAT') return this.addChat(playerId, action.message);
            if (action.type === 'RENAME') return this.renamePlayer(playerId, action.name);
            if (this.state.phase === 'game_over') return { ok: false, reason: 'The deal is over.' };

            switch (action.type) {
                case 'ATTACK':
                    return this.playAttack(player, action.cardId);
                case 'DEFEND':
                    return this.playDefense(player, action.cardId, action.pairId);
                case 'TAKE_CARDS':
                    return this.declarePickup(player);
                case 'PASS_ATTACK':
                    return this.passAttack(player);
                default:
                    return { ok: false, reason: 'Unknown action.' };
            }
        }

        renamePlayer(playerId, requestedName) {
            const player = this.getPlayer(playerId);
            if (!player || player.isBot) return { ok: false, reason: 'That seat cannot be renamed.' };
            const base = String(requestedName || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24);
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
            this.log(`${previous} is now playing as ${name}.`, 'system');
            return { ok: true, name };
        }

        setHost(playerId) {
            const player = this.getPlayer(playerId);
            if (!player || player.isBot || player.connected === false) return false;
            this.state.players.forEach(item => { item.isHost = item.id === playerId; });
            this.log(`${player.name} is now the table host.`, 'system');
            return true;
        }

        playAttack(player, cardId) {
            if (!['attack', 'throw_in'].includes(this.state.phase)) {
                return { ok: false, reason: 'The defender must act first.' };
            }
            if (this.state.attackTurnId !== player.id || player.id === this.state.defenderId || player.out) {
                return { ok: false, reason: 'It is not your attack opportunity.' };
            }
            const card = player.hand.find(candidate => candidate.id === cardId);
            if (!Rules.canAttack(card, this.state.battle, this.state.attackLimit)) {
                return { ok: false, reason: 'Attack with a matching rank and stay within the attack limit.' };
            }
            const played = this.removeCard(player, cardId);
            played.ownerId = null;
            played.loc = 'battle';
            const pair = {
                id: this.idFactory(),
                attackCard: played,
                defenseCard: null,
                attackerId: player.id
            };
            this.state.battle.push(pair);
            this.state.lastAttackerId = player.id;
            this.state.lastAction = {
                type: this.state.pickupDeclared ? 'throw_in' : 'attack',
                playerId: player.id,
                card: clone(played),
                pairId: pair.id,
                time: this.now()
            };
            this.state.history.push({
                type: this.state.lastAction.type,
                playerId: player.id,
                card: clone(played)
            });
            this.log(`${player.name} attacks with ${Rules.describeCard(played)}.`, 'play');

            if (this.state.pickupDeclared) {
                if (this.state.battle.length >= this.state.attackLimit) {
                    this.resolveRound(true);
                    return { ok: true };
                }
                if (!player.hand.length) {
                    this.state.passedAttackers.push(player.id);
                    this.advanceAttackPriority(player.id);
                }
                return { ok: true };
            }
            this.state.phase = 'defend';
            this.state.attackTurnId = null;
            const defender = this.getPlayer(this.state.defenderId);
            if (defender && !defender.isBot && defender.connected === false) this.resolveRound(true);
            return { ok: true };
        }

        playDefense(player, cardId, pairId) {
            if (this.state.phase !== 'defend' || player.id !== this.state.defenderId) {
                return { ok: false, reason: 'Only the defender may beat an attack.' };
            }
            const pair = this.state.battle.find(candidate => candidate.id === pairId && !candidate.defenseCard);
            if (!pair) return { ok: false, reason: 'Choose an uncovered attack card.' };
            const card = player.hand.find(candidate => candidate.id === cardId);
            if (!Rules.canBeat(card, pair.attackCard, this.state.trumpSuit)) {
                return { ok: false, reason: 'Use a higher card of the same suit or a trump.' };
            }
            const played = this.removeCard(player, cardId);
            played.ownerId = null;
            played.loc = 'battle';
            pair.defenseCard = played;
            this.state.lastAction = {
                type: 'defend',
                playerId: player.id,
                card: clone(played),
                pairId: pair.id,
                time: this.now()
            };
            this.state.history.push({ type: 'defend', playerId: player.id, card: clone(played) });
            this.log(`${player.name} covers ${Rules.describeCard(pair.attackCard)} with ${Rules.describeCard(played)}.`, 'play');

            if (this.state.battle.length >= this.state.attackLimit) {
                this.resolveRound(false);
                return { ok: true };
            }
            this.state.phase = 'attack';
            this.resetAttackPriority(this.state.mainAttackerId);
            return { ok: true };
        }

        declarePickup(player) {
            if (this.state.phase !== 'defend' || player.id !== this.state.defenderId) {
                return { ok: false, reason: 'Only the defender may take the battle cards.' };
            }
            this.state.pickupDeclared = true;
            this.state.phase = 'throw_in';
            this.state.lastAction = { type: 'pickup_declared', playerId: player.id, time: this.now() };
            this.log(`${player.name} gives up the defence and will take the table.`, 'warning');
            this.resetAttackPriority(this.state.lastAttackerId || this.state.mainAttackerId);
            if (this.state.battle.length >= this.state.attackLimit) this.resolveRound(true);
            return { ok: true };
        }

        passAttack(player) {
            if (!['attack', 'throw_in'].includes(this.state.phase) || this.state.attackTurnId !== player.id) {
                return { ok: false, reason: 'It is not your attack opportunity.' };
            }
            if (!this.state.battle.length) return { ok: false, reason: 'The opening attacker must play a card.' };
            if (!this.state.passedAttackers.includes(player.id)) this.state.passedAttackers.push(player.id);
            this.state.lastAction = {
                type: this.state.pickupDeclared ? 'finish_throw_in' : 'pass_attack',
                playerId: player.id,
                time: this.now()
            };
            return { ok: true, roundEnded: !this.advanceAttackPriority(player.id) };
        }

        refillHands() {
            const mainAttacker = this.getPlayer(this.state.mainAttackerId);
            const defender = this.getPlayer(this.state.defenderId);
            const order = mainAttacker
                ? this.clockwiseFrom(mainAttacker.id, true).filter(player => player.id !== defender?.id)
                : [];
            if (defender && !defender.out) order.push(defender);
            const drawn = [];
            for (const player of order) {
                let count = 0;
                while (player.hand.length < HAND_SIZE && this.state.talon.length) {
                    this.drawOne(player);
                    count += 1;
                }
                if (count) drawn.push({ playerId: player.id, count });
            }
            return drawn;
        }

        resolveRound(pickup) {
            const defender = this.getPlayer(this.state.defenderId);
            const oldDefenderId = this.state.defenderId;
            const cards = this.state.battle.flatMap(pair => [pair.attackCard, pair.defenseCard].filter(Boolean));
            if (pickup && defender) {
                for (const card of cards) {
                    card.ownerId = defender.id;
                    card.loc = 'hand';
                    defender.hand.push(card);
                }
            } else {
                this.state.discardCount += cards.length;
            }
            const drawn = this.refillHands();
            const talonEmpty = this.state.talon.length === 0;
            if (talonEmpty) {
                for (const player of this.state.players) {
                    if (!player.out && player.hand.length === 0) {
                        player.out = true;
                        player.finishPlace = this.state.finishedOrder.length + 1;
                        this.state.finishedOrder.push(player.id);
                        this.log(`${player.name} is out of cards.`, 'success');
                    }
                }
            }
            const roundResult = {
                type: pickup ? 'round_pickup' : 'round_defended',
                defenderId: oldDefenderId,
                cardCount: cards.length,
                drawn,
                time: this.now()
            };
            this.state.lastAction = roundResult;
            this.state.lastRoundResult = roundResult;
            this.log(
                pickup
                    ? `${defender?.name || 'The defender'} takes ${cards.length} table cards.`
                    : `${defender?.name || 'The defender'} beats the attack. The table is discarded.`,
                pickup ? 'warning' : 'success'
            );
            this.state.battle = [];
            this.state.pickupDeclared = false;
            this.state.passedAttackers = [];
            if (this.finishIfNeeded()) return;

            let nextAttacker;
            if (pickup) nextAttacker = this.nextActiveAfter(oldDefenderId);
            else {
                const oldDefender = this.getPlayer(oldDefenderId);
                nextAttacker = oldDefender && !oldDefender.out ? oldDefender : this.nextActiveAfter(oldDefenderId);
            }
            this.beginRound(nextAttacker.id);
        }

        finishIfNeeded() {
            const active = this.activePlayers();
            if (this.state.players.length <= 1) {
                this.state.phase = 'game_over';
                this.state.durakId = null;
                this.state.lastAction = { type: 'game_over', durakId: null, time: this.now() };
                this.log(active[0] ? `${active[0].name} is the last connected player and wins by default.` : 'The table closed without a fool.', 'game_over');
                return true;
            }
            if (this.state.talon.length === 0 && active.length <= 1) {
                this.state.phase = 'game_over';
                this.state.durakId = active[0]?.id || null;
                if (active[0]) this.log(`${active[0].name} is the Durak — the last player holding cards.`, 'game_over');
                else this.log('The deal ends without a fool.', 'game_over');
                this.state.lastAction = {
                    type: 'game_over',
                    durakId: this.state.durakId,
                    time: this.now()
                };
                return true;
            }
            return false;
        }

        getViewState(viewerId, spectator = false) {
            const state = clone(this.state);
            const viewer = this.getPlayer(viewerId);
            state.players = this.state.players.map(player => {
                const own = spectator || player.id === viewerId;
                return {
                    id: player.id,
                    name: player.name,
                    isHost: player.isHost,
                    isBot: player.isBot,
                    botDifficulty: player.botDifficulty,
                    historicalPersona: player.historicalPersona,
                    sessionToken: !spectator && player.id === viewerId ? player.sessionToken : '',
                    connected: player.connected,
                    disconnectTurns: player.disconnectTurns || 0,
                    out: player.out,
                    finishPlace: player.finishPlace,
                    handCount: player.hand.length,
                    hand: own
                        ? clone(player.hand)
                        : player.hand.map((card, index) => ({
                            id: `hidden-${player.id}-${index}`,
                            ownerId: player.id,
                            hidden: true
                        }))
                };
            });
            const turnUp = this.state.talon.find(card => card.id === this.state.trumpCardId);
            state.talonCount = this.state.talon.length;
            state.trumpCard = turnUp ? clone(turnUp) : null;
            delete state.talon;
            state.viewerId = viewer?.id || viewerId;
            state.spectatorMode = Boolean(spectator);
            return state;
        }
    }

    return { DurakGameEngine, MAX_PLAYERS, HAND_SIZE };
});
