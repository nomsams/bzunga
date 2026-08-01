(function (root, factory) {
    const rules = root.PresidentRules || (typeof require === 'function' ? require('./rules.js') : null);
    const api = factory(rules);
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.PresidentGameEngine = api.PresidentGameEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules) {
    'use strict';

    if (!Rules) throw new Error('PresidentRules must be loaded before PresidentGameEngine.');

    const ROLE_LABELS = {
        president: 'President',
        vice_president: 'Vice-President',
        citizen: 'Citizen',
        vice_slave: 'Vice-Slave',
        slave: 'Slave'
    };

    const cleanText = (value, maximum = 240, fallback = '') => {
        const text = String(value ?? '')
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, maximum);
        return text || fallback;
    };

    class PresidentGameEngine {
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
                phase: 'lobby',
                roundNumber: 0,
                settings: { exchangeCount: 2 },
                players: [],
                turnIndex: 0,
                trick: this.createEmptyTrick(),
                history: [],
                discardedTricks: 0,
                setAsideCount: 0,
                finishOrder: [],
                result: null,
                exchange: null,
                logs: [],
                nextLogId: 0,
                lastAction: null,
                thinkingBots: [],
                typingBots: []
            };
        }

        createEmptyTrick() {
            return {
                id: `trick-${this.makeId()}`,
                rank: null,
                rankPower: null,
                count: 0,
                lastPlayerId: null,
                plays: []
            };
        }

        addPlayer(player) {
            if (this.state.phase !== 'lobby') return false;
            if (!player?.id || this.state.players.some(existing => existing.id === player.id)) return false;
            this.state.players.push({
                id: player.id,
                name: cleanText(player.name, 24, 'Player'),
                sessionToken: cleanText(player.sessionToken, 80),
                isHost: Boolean(player.isHost),
                isBot: Boolean(player.isBot),
                botDifficulty: Number(player.botDifficulty) || 0,
                connected: player.connected !== false,
                hand: [],
                role: null,
                passed: false,
                finishPosition: null,
                lastChatAt: 0
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
            if (this.state.phase !== 'lobby') return { ok: false, reason: 'The game has already started.' };
            const activePlayers = this.state.players.filter(player => player.isBot || player.connected);
            if (activePlayers.length < 2) return { ok: false, reason: 'At least two players are required.' };
            if (activePlayers.length > 8) return { ok: false, reason: 'The table supports up to eight players.' };
            this.state.players = activePlayers;
            this.state.settings.exchangeCount = [2, 3].includes(Number(settings.exchangeCount))
                ? Number(settings.exchangeCount)
                : 2;
            this._dealRound(false);
            return { ok: true };
        }

        startNextRound(playerId) {
            const player = this.getPlayer(playerId);
            if (!player?.isHost || this.state.phase !== 'game_over') return false;
            this._dealRound(true);
            return true;
        }

        _dealRound(usePreviousRoles) {
            this.state.roundNumber += 1;
            this.state.phase = 'dealing';
            this.state.finishOrder = [];
            this.state.result = null;
            this.state.exchange = null;
            this.state.history = [];
            this.state.discardedTricks = 0;
            this.state.trick = this.createEmptyTrick();
            this.state.lastAction = {
                type: 'deal',
                nonce: this.makeId(),
                roundNumber: this.state.roundNumber,
                time: this.now()
            };

            for (const player of this.state.players) {
                player.hand = [];
                player.passed = false;
                player.finishPosition = null;
            }

            const deck = Rules.createDeck(this.random);
            const remainder = deck.length % this.state.players.length;
            const setAside = [];
            while (setAside.length < remainder) {
                let removeIndex = deck.length - 1;
                while (removeIndex >= 0 && deck[removeIndex].rank === '3' && deck[removeIndex].suit === '♥') {
                    removeIndex -= 1;
                }
                if (removeIndex < 0) removeIndex = deck.length - 1;
                setAside.push(...deck.splice(removeIndex, 1));
            }
            this.state.setAsideCount = setAside.length;
            deck.forEach((card, index) => {
                const player = this.state.players[index % this.state.players.length];
                card.ownerId = player.id;
                player.hand.push(card);
            });

            if (usePreviousRoles && this.state.players.some(player => player.role === 'president')) {
                this._prepareExchange();
            } else {
                for (const player of this.state.players) player.role = null;
                const heartThreeOwner = this.state.players.find(player =>
                    player.hand.some(card => card.rank === '3' && card.suit === '♥')
                );
                this.state.phase = 'play';
                this.state.turnIndex = Math.max(0, this.state.players.findIndex(player => player.id === heartThreeOwner?.id));
                this._log(`${heartThreeOwner?.name || this.state.players[0].name} holds the 3♥ and opens the first pile.`, 'success');
            }

            this._log(
                `Round ${this.state.roundNumber} begins. ${deck.length} cards were dealt evenly`
                    + (setAside.length ? `; ${setAside.length} ${setAside.length === 1 ? 'card was' : 'cards were'} set aside.` : '.'),
                'info'
            );
            this._emit({ type: 'round_started', roundNumber: this.state.roundNumber });
        }

        _prepareExchange() {
            const president = this.state.players.find(player => player.role === 'president');
            const slave = this.state.players.find(player => player.role === 'slave');
            if (!president || !slave) {
                this.state.phase = 'play';
                this.state.turnIndex = 0;
                return;
            }

            const tasks = [];
            const addPair = (upper, lower, count, pairName) => {
                if (!upper || !lower) return;
                const safeCount = Math.max(1, Math.min(count, upper.hand.length, lower.hand.length));
                tasks.push(this._createExchangeTask(lower, upper, safeCount, true, pairName));
                tasks.push(this._createExchangeTask(upper, lower, safeCount, false, pairName));
            };

            addPair(president, slave, this.state.settings.exchangeCount, 'primary');
            if (this.state.players.length >= 5) {
                addPair(
                    this.state.players.find(player => player.role === 'vice_president'),
                    this.state.players.find(player => player.role === 'vice_slave'),
                    1,
                    'vice'
                );
            }

            this.state.exchange = {
                id: `exchange-${this.makeId()}`,
                tasks,
                activeTaskId: null
            };
            this.state.phase = 'exchange';
            this._advanceExchange();
        }

        _createExchangeTask(giver, receiver, count, forcedBest, pairName) {
            const selectedIds = forcedBest
                ? Rules.getBestCards(giver.hand, count).map(card => card.id)
                : [];
            return {
                id: `exchange-task-${this.makeId()}`,
                giverId: giver.id,
                receiverId: receiver.id,
                count,
                pairName,
                forcedBest,
                eligibleIds: giver.hand.map(card => card.id),
                selectedIds,
                locked: forcedBest
            };
        }

        _advanceExchange() {
            const exchange = this.state.exchange;
            if (!exchange) return;
            const pendingTask = exchange.tasks.find(task => !task.locked);
            if (pendingTask) {
                exchange.activeTaskId = pendingTask.id;
                this.state.turnIndex = this.state.players.findIndex(player => player.id === pendingTask.giverId);
                const giver = this.getPlayer(pendingTask.giverId);
                const receiver = this.getPlayer(pendingTask.receiverId);
                this._log(`${giver.name} must choose ${pendingTask.count} card${pendingTask.count === 1 ? '' : 's'} for ${receiver.name}.`, 'warning');
                return;
            }
            this._applyExchange();
        }

        submitExchange(playerId, cardIds) {
            if (this.state.phase !== 'exchange' || !this.state.exchange) {
                return { ok: false, reason: 'There is no active exchange.' };
            }
            const task = this.state.exchange.tasks.find(item => item.id === this.state.exchange.activeTaskId);
            if (!task || task.giverId !== playerId || task.locked) {
                return { ok: false, reason: 'It is not your exchange choice.' };
            }
            const uniqueIds = [...new Set(Array.isArray(cardIds) ? cardIds : [])];
            if (uniqueIds.length !== task.count) {
                return { ok: false, reason: `Choose exactly ${task.count} card${task.count === 1 ? '' : 's'}.` };
            }
            if (uniqueIds.some(cardId => !task.eligibleIds.includes(cardId))) {
                return { ok: false, reason: 'One of those cards is not available for this exchange.' };
            }

            task.selectedIds = uniqueIds;
            task.locked = true;
            this._advanceExchange();
            this._emit({ type: 'exchange_choice', playerId, count: uniqueIds.length });
            return { ok: true };
        }

        _applyExchange() {
            const exchange = this.state.exchange;
            if (!exchange) return;
            const transfers = [];
            for (const task of exchange.tasks) {
                const giver = this.getPlayer(task.giverId);
                const receiver = this.getPlayer(task.receiverId);
                const cards = task.selectedIds.map(cardId => giver.hand.find(card => card.id === cardId)).filter(Boolean);
                if (cards.length !== task.count) throw new Error('Exchange became invalid before transfer.');
                transfers.push({ task, giver, receiver, cards });
            }

            for (const transfer of transfers) {
                const ids = new Set(transfer.cards.map(card => card.id));
                transfer.giver.hand = transfer.giver.hand.filter(card => !ids.has(card.id));
            }
            for (const transfer of transfers) {
                for (const card of transfer.cards) {
                    card.ownerId = transfer.receiver.id;
                    transfer.receiver.hand.push(card);
                }
            }

            const slave = this.state.players.find(player => player.role === 'slave');
            for (const player of this.state.players) player.passed = false;
            this.state.exchange.activeTaskId = null;
            this.state.phase = 'play';
            this.state.turnIndex = Math.max(0, this.state.players.findIndex(player => player.id === slave?.id));
            this.state.lastAction = {
                type: 'exchange_complete',
                nonce: this.makeId(),
                time: this.now()
            };
            this._log(`The role exchange is complete. ${slave?.name || this.state.players[0].name} opens the new round.`, 'success');
        }

        processAction(action, playerId) {
            const player = this.getPlayer(playerId);
            if (!player || !action || typeof action.type !== 'string') return { ok: false, reason: 'Invalid action.' };

            if (action.type === 'CHAT') return this._handleChat(player, action.message);
            if (action.type === 'START_NEXT_ROUND') {
                return { ok: this.startNextRound(playerId), reason: 'Only the host can start the next round.' };
            }
            if (action.type === 'EXCHANGE') return this.submitExchange(playerId, action.cardIds);
            if (action.type === 'PLAY_CARDS') return this.playCards(playerId, action.cardIds);
            if (action.type === 'PASS') return this.pass(playerId);
            return { ok: false, reason: 'Unknown action.' };
        }

        playCards(playerId, cardIds) {
            if (this.state.phase !== 'play') return { ok: false, reason: 'Cards cannot be played right now.' };
            const player = this.getPlayer(playerId);
            if (!player || this.activePlayer()?.id !== playerId) return { ok: false, reason: 'Wait for your turn.' };
            if (player.passed) return { ok: false, reason: 'You already passed this pile.' };

            const uniqueIds = [...new Set(Array.isArray(cardIds) ? cardIds : [])];
            const cards = uniqueIds.map(cardId => player.hand.find(card => card.id === cardId)).filter(Boolean);
            if (cards.length !== uniqueIds.length) return { ok: false, reason: 'One of those cards is no longer in your hand.' };

            const combo = Rules.validateSelection(cards, this.state.trick, player.hand.length);
            if (!combo.valid) return { ok: false, reason: combo.reason };

            const playedCards = cards.map(card => ({ ...card }));
            const playedIds = new Set(uniqueIds);
            player.hand = player.hand.filter(card => !playedIds.has(card.id));
            const play = {
                id: `play-${this.makeId()}`,
                playerId,
                playerName: player.name,
                cards: playedCards,
                combo: { ...combo },
                time: this.now()
            };
            this.state.trick.rank = combo.rank;
            this.state.trick.rankPower = combo.rankPower;
            this.state.trick.count = combo.count;
            this.state.trick.lastPlayerId = playerId;
            this.state.trick.plays.push(play);
            this.state.history.push(play);
            if (this.state.history.length > 120) this.state.history.splice(0, this.state.history.length - 120);
            this.state.lastAction = {
                type: 'play',
                nonce: this.makeId(),
                playerId,
                playerName: player.name,
                cards: playedCards,
                combo: { ...combo },
                cleared: false,
                time: this.now()
            };
            this._log(`${player.name} played ${combo.count} × ${combo.rank}${combo.wildCount ? ` with ${combo.wildCount} wild 2${combo.wildCount === 1 ? '' : 's'}` : ''}.`, 'play');

            if (player.hand.length === 0) {
                this.state.finishOrder.push(player.id);
                player.finishPosition = this.state.finishOrder.length;
                player.passed = true;
                this._log(`${player.name} finishes in position ${player.finishPosition}!`, player.finishPosition === 1 ? 'success' : 'info');
                const unfinished = this._unfinishedPlayers();
                if (unfinished.length <= 1) {
                    if (unfinished.length === 1) {
                        unfinished[0].finishPosition = this.state.players.length;
                        this.state.finishOrder.push(unfinished[0].id);
                    }
                    this._finishGame();
                    this._emit({ type: 'play', playerId, combo, cards: playedCards, finished: true, gameOver: true });
                    return { ok: true };
                }
            }

            const event = { type: 'play', playerId, combo, cards: playedCards, finished: player.hand.length === 0 };
            if (combo.clearsTrick) {
                this.state.lastAction.cleared = true;
                const leader = player.hand.length ? player : this._nextUnfinishedAfter(playerId);
                this._clearTrick(leader?.id, 'Ace clears the pile');
            } else {
                this._advanceAfterAction(playerId);
            }
            event.gameOver = this.state.phase === 'game_over';
            this._emit(event);
            return { ok: true };
        }

        pass(playerId) {
            if (this.state.phase !== 'play') return { ok: false, reason: 'Passing is not available right now.' };
            const player = this.getPlayer(playerId);
            if (!player || this.activePlayer()?.id !== playerId) return { ok: false, reason: 'Wait for your turn.' };
            if (!this.state.trick.rank) {
                if (Rules.getLegalPlays(player.hand, this.state.trick).length > 0) {
                    return { ok: false, reason: 'You must open an empty pile.' };
                }
                this.state.lastAction = {
                    type: 'blocked_opening',
                    nonce: this.makeId(),
                    playerId,
                    playerName: player.name,
                    time: this.now()
                };
                const resolution = this._resolveFreshPileLeader(playerId);
                if (!resolution.gameOver) {
                    const blockedNames = resolution.blocked.map(item => item.name).join(', ');
                    this._log(`${blockedNames} cannot open with only wild 2s. ${resolution.leader?.name || 'The next player'} starts the pile.`, 'pass');
                }
                this._emit({ type: 'blocked_opening', playerId, gameOver: resolution.gameOver });
                return { ok: true };
            }
            if (player.passed) return { ok: false, reason: 'You already passed this pile.' };

            player.passed = true;
            this.state.lastAction = {
                type: 'pass',
                nonce: this.makeId(),
                playerId,
                playerName: player.name,
                time: this.now()
            };
            this._log(`${player.name} passes and is out until the pile resets.`, 'pass');
            this._advanceAfterAction(playerId);
            this._emit({ type: 'pass', playerId });
            return { ok: true };
        }

        _advanceAfterAction(playerId) {
            const eligible = this._unfinishedPlayers().filter(player => !player.passed);
            if (eligible.length <= 1) {
                const leader = eligible[0] || this._nextUnfinishedAfter(playerId);
                if (this.state.lastAction) this.state.lastAction.cleared = true;
                this._clearTrick(leader?.id, 'Every other player passed');
                return;
            }
            const nextIndex = this._nextIndexAfter(playerId, player => !this.isFinished(player.id) && !player.passed);
            if (nextIndex >= 0) this.state.turnIndex = nextIndex;
        }

        _clearTrick(leaderId, reason) {
            this.state.discardedTricks += 1;
            for (const player of this.state.players) {
                if (!this.isFinished(player.id)) player.passed = false;
            }
            this.state.trick = this.createEmptyTrick();
            const leaderIndex = this.state.players.findIndex(player => player.id === leaderId && !this.isFinished(player.id));
            this.state.turnIndex = leaderIndex >= 0 ? leaderIndex : Math.max(0, this._nextIndexAfter(leaderId, player => !this.isFinished(player.id)));
            const resolution = this._resolveFreshPileLeader(this.state.players[this.state.turnIndex]?.id || leaderId);
            if (resolution.gameOver) return;
            const blockedText = resolution.blocked.length
                ? ` ${resolution.blocked.map(player => player.name).join(', ')} cannot open with only wild 2s.`
                : '';
            this._log(`${reason}.${blockedText} ${resolution.leader?.name || 'The next player'} starts a fresh pile.`, 'clear');
        }

        _resolveFreshPileLeader(preferredLeaderId) {
            const unfinished = this._unfinishedPlayers();
            const blocked = unfinished.filter(player => Rules.getLegalPlays(player.hand, this.state.trick).length === 0);
            const blockedIds = new Set(blocked.map(player => player.id));
            for (const player of blocked) player.passed = true;

            const playable = unfinished.filter(player => !blockedIds.has(player.id));
            if (playable.length === 0) {
                const preferredIndex = Math.max(0, this.state.players.findIndex(player => player.id === preferredLeaderId));
                const seatDistance = player => {
                    const playerIndex = this.state.players.findIndex(candidate => candidate.id === player.id);
                    const distance = (playerIndex - preferredIndex + this.state.players.length) % this.state.players.length;
                    return distance === 0 ? this.state.players.length : distance;
                };
                const finalOrder = [...unfinished].sort((left, right) =>
                    left.hand.length - right.hand.length || seatDistance(left) - seatDistance(right)
                );
                for (const player of finalOrder) {
                    if (this.isFinished(player.id)) continue;
                    this.state.finishOrder.push(player.id);
                    player.finishPosition = this.state.finishOrder.length;
                }
                this._log('No unfinished player can legally open: only wild 2s remain. Final positions use fewest cards, then turn order.', 'warning');
                this._finishGame();
                return { gameOver: true, blocked, leader: null };
            }

            let leader = playable.find(player => player.id === preferredLeaderId) || null;
            if (!leader) {
                const nextIndex = this._nextIndexAfter(preferredLeaderId, player =>
                    !this.isFinished(player.id) && !blockedIds.has(player.id)
                );
                leader = nextIndex >= 0 ? this.state.players[nextIndex] : playable[0];
            }
            this.state.turnIndex = this.state.players.findIndex(player => player.id === leader.id);
            return { gameOver: false, blocked, leader };
        }

        _finishGame() {
            const total = this.state.players.length;
            this.state.players.forEach(player => { player.role = 'citizen'; player.passed = false; });
            const playerAt = position => this.getPlayer(this.state.finishOrder[position]);
            const president = playerAt(0);
            const slave = playerAt(total - 1);
            if (president) president.role = 'president';
            if (slave) slave.role = 'slave';
            if (total >= 5) {
                const vicePresident = playerAt(1);
                const viceSlave = playerAt(total - 2);
                if (vicePresident) vicePresident.role = 'vice_president';
                if (viceSlave) viceSlave.role = 'vice_slave';
            }

            this.state.phase = 'game_over';
            this.state.turnIndex = -1;
            this.state.thinkingBots = [];
            this.state.typingBots = [];
            this.state.result = {
                presidentId: president?.id || null,
                slaveId: slave?.id || null,
                order: [...this.state.finishOrder]
            };
            this.state.lastAction = {
                type: 'game_over',
                nonce: this.makeId(),
                presidentId: president?.id || null,
                slaveId: slave?.id || null,
                time: this.now()
            };
            this._log(`${president?.name || 'The winner'} is President. ${slave?.name || 'The final player'} is Slave.`, 'result');
        }

        _handleChat(player, message) {
            const now = this.now();
            if (now - (player.lastChatAt || 0) < 650) return { ok: false, reason: 'Please wait before sending another message.' };
            const safeMessage = cleanText(message, 240);
            if (!safeMessage) return { ok: false, reason: 'Message is empty.' };
            player.lastChatAt = now;
            this._appendLog({ type: 'chat', name: player.name, playerId: player.id, message: safeMessage });
            this._emit({ type: 'chat', playerId: player.id, name: player.name, message: safeMessage, isBot: player.isBot });
            return { ok: true };
        }

        addBotChat(playerId, message) {
            const player = this.getPlayer(playerId);
            const safeMessage = cleanText(message, 240);
            if (!player?.isBot || !safeMessage) return false;
            this._appendLog({ type: 'chat', name: player.name, playerId, message: safeMessage, isBot: true });
            this._emit({ type: 'bot_chat', playerId, name: player.name, message: safeMessage });
            return true;
        }

        setBotActivity(playerId, activity, active) {
            if (!['thinking', 'typing'].includes(activity)) return;
            const key = activity === 'typing' ? 'typingBots' : 'thinkingBots';
            const currentlyActive = this.state[key].includes(playerId);
            if (currentlyActive === active) return;
            this.state[key] = active
                ? [...this.state[key], playerId]
                : this.state[key].filter(id => id !== playerId);
            this.onChange(this.state);
        }

        disconnectPlayer(playerId) {
            const player = this.getPlayer(playerId);
            if (!player || player.isBot) return;
            player.connected = false;
            this._log(`${player.name} disconnected.`, 'warning');
            if (this.state.phase === 'play' && this.activePlayer()?.id === playerId) {
                if (this.state.trick.rank) this.pass(playerId);
                else {
                    player.passed = true;
                    this._advanceAfterAction(playerId);
                    this._emit({ type: 'disconnect_skip', playerId });
                }
                return;
            }
            if (this.state.phase === 'exchange') {
                const task = this.state.exchange?.tasks.find(item => item.id === this.state.exchange.activeTaskId);
                if (task?.giverId === playerId) {
                    const fallbackCards = Rules.getWorstCards(player.hand.filter(card => task.eligibleIds.includes(card.id)), task.count);
                    this.submitExchange(playerId, fallbackCards.map(card => card.id));
                    return;
                }
            }
            this._emit({ type: 'player_disconnected', playerId });
        }

        reconnectPlayer(oldId, newId) {
            const player = this.getPlayer(oldId);
            if (!player) return false;
            player.id = newId;
            player.connected = true;
            for (const card of player.hand) card.ownerId = newId;
            this.state.finishOrder = this.state.finishOrder.map(id => id === oldId ? newId : id);
            if (this.state.result) {
                if (this.state.result.presidentId === oldId) this.state.result.presidentId = newId;
                if (this.state.result.slaveId === oldId) this.state.result.slaveId = newId;
                this.state.result.order = this.state.result.order.map(id => id === oldId ? newId : id);
            }
            if (this.state.trick.lastPlayerId === oldId) this.state.trick.lastPlayerId = newId;
            for (const play of [...this.state.trick.plays, ...this.state.history]) {
                if (play.playerId === oldId) play.playerId = newId;
            }
            if (this.state.exchange) {
                for (const task of this.state.exchange.tasks) {
                    if (task.giverId === oldId) task.giverId = newId;
                    if (task.receiverId === oldId) task.receiverId = newId;
                }
            }
            this._emit({ type: 'player_reconnected', playerId: newId });
            return true;
        }

        activePlayer() {
            return this.state.players[this.state.turnIndex] || null;
        }

        getPlayer(playerId) {
            return this.state.players.find(player => player.id === playerId) || null;
        }

        isFinished(playerId) {
            return this.state.finishOrder.includes(playerId);
        }

        _unfinishedPlayers() {
            return this.state.players.filter(player => !this.isFinished(player.id));
        }

        _nextUnfinishedAfter(playerId) {
            const index = this._nextIndexAfter(playerId, player => !this.isFinished(player.id));
            return index >= 0 ? this.state.players[index] : null;
        }

        _nextIndexAfter(playerId, predicate) {
            const startIndex = Math.max(0, this.state.players.findIndex(player => player.id === playerId));
            for (let offset = 1; offset <= this.state.players.length; offset++) {
                const index = (startIndex + offset) % this.state.players.length;
                if (predicate(this.state.players[index])) return index;
            }
            return -1;
        }

        _appendLog(entry) {
            this.state.nextLogId += 1;
            this.state.logs.push({ ...entry, id: this.state.nextLogId, time: this.now() });
            if (this.state.logs.length > 160) this.state.logs.splice(0, this.state.logs.length - 160);
        }

        _log(message, kind = 'info') {
            this._appendLog({ type: 'system', message: cleanText(message, 240), kind });
        }

        _emit(event) {
            if (event) this.onEvent(event, this.state);
            this.onChange(this.state);
        }

        getViewState(viewerId) {
            const view = JSON.parse(JSON.stringify(this.state));
            for (const player of view.players) {
                if (player.id !== viewerId) {
                    player.hand = player.hand.map(card => ({
                        id: card.id,
                        ownerId: player.id,
                        hidden: true
                    }));
                }
            }
            if (view.exchange) {
                view.exchange.tasks = view.exchange.tasks.map(task => {
                    if (task.giverId === viewerId) return task;
                    return { ...task, eligibleIds: [], selectedIds: [] };
                });
            }
            return view;
        }

        getRoleLabel(role) {
            return ROLE_LABELS[role] || 'Citizen';
        }
    }

    return { PresidentGameEngine, ROLE_LABELS, cleanText };
});
