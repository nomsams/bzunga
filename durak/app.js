(function () {
    'use strict';

    const MAX_PLAYERS = 6;
    const BOT_NAMES = {
        1: 'Misha [Rookie]',
        2: 'Katya [Street]',
        3: 'Volkov [Tactician]',
        4: 'Irina [Grandmaster]',
        5: 'Baba Gupta'
    };

    const Utils = {
        uuid() {
            if (globalThis.crypto?.randomUUID) return crypto.randomUUID().replaceAll('-', '').slice(0, 12);
            return Math.random().toString(36).slice(2, 14);
        },
        clean(value, max = 80, fallback = '') {
            const result = String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
            return result || fallback;
        },
        escape(value) {
            return String(value ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#039;');
        }
    };

    const App = {
        peer: null,
        hostConnection: null,
        connections: {},
        localId: null,
        localName: '',
        isHost: false,
        gameState: null,
        sessionToken: '',
        ui: {
            selectedCardId: null,
            sortMode: 'rank',
            chatOpen: false,
            unread: 0,
            lastLogId: 0,
            lastActionToken: '',
            lastRoundResultToken: '',
            resultsShown: false,
            previousCardRects: new Map()
        }
    };

    const Game = {
        engine: null,
        bots: null,

        createEngine() {
            Game.engine = new DurakGameEngine();
            Game.bots = new DurakBots.DurakBotController(Game.engine, {
                onStateChange: () => Net.broadcast()
            });
            return Game.engine;
        }
    };

    const Net = {
        initialize(name, hostId = null) {
            App.localName = Utils.clean(name, 24, `Player ${Math.floor(Math.random() * 900 + 100)}`);
            App.sessionToken = localStorage.getItem('durak-session-token') || Utils.uuid();
            localStorage.setItem('durak-session-token', App.sessionToken);
            App.peer = new Peer(Utils.uuid(), {
                secure: true,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            App.peer.on('open', peerId => {
                App.localId = peerId;
                if (App.isHost) Net.hostOpened(peerId);
                else Net.connectToHost(hostId);
            });
            App.peer.on('connection', connection => Net.acceptConnection(connection));
            App.peer.on('error', error => {
                UI.resetLobbyButtons();
                UI.showToast(error?.message || 'Unable to open the P2P table.', 'danger');
            });
        },

        hostOpened(peerId) {
            const engine = Game.createEngine();
            engine.addPlayer({
                id: peerId,
                name: App.localName,
                connected: true,
                isBot: false
            });
            UI.showRoom(peerId, true);
            UI.renderQr(peerId);
            Net.broadcast();
        },

        connectToHost(hostId) {
            const cleanHostId = Utils.clean(hostId, 80).replace(/[^a-zA-Z0-9-]/g, '');
            if (!cleanHostId) {
                UI.resetLobbyButtons();
                return UI.showToast('Paste a valid Game ID.', 'danger');
            }
            const connection = App.peer.connect(cleanHostId, { reliable: true });
            App.hostConnection = connection;
            connection.on('open', () => {
                connection.send({
                    type: 'JOIN',
                    name: App.localName,
                    sessionToken: App.sessionToken
                });
            });
            connection.on('data', data => Net.receiveFromHost(data, cleanHostId));
            connection.on('close', () => UI.showToast('The host connection closed.', 'danger'));
            connection.on('error', () => UI.showToast('Could not connect to that Durak room.', 'danger'));
        },

        acceptConnection(connection) {
            if (!App.isHost || !Game.engine) return;
            connection.on('data', data => {
                if (!data || typeof data !== 'object') return;
                if (data.type === 'JOIN') {
                    const name = Utils.clean(data.name, 24, 'Player');
                    if (Game.engine.state.phase !== 'lobby') {
                        connection.send({ type: 'JOIN_REJECTED', reason: 'This deal has already started.' });
                        return;
                    }
                    if (Game.engine.state.players.length >= MAX_PLAYERS) {
                        connection.send({ type: 'JOIN_REJECTED', reason: 'This table already has six players.' });
                        return;
                    }
                    const result = Game.engine.addPlayer({
                        id: connection.peer,
                        name,
                        connected: true,
                        isBot: false
                    });
                    if (!result.ok) {
                        connection.send({ type: 'JOIN_REJECTED', reason: result.reason });
                        return;
                    }
                    App.connections[connection.peer] = connection;
                    Net.broadcast();
                    return;
                }
                if (data.type === 'ACTION') {
                    const result = Game.engine.processAction(data.action, connection.peer);
                    if (!result?.ok) connection.send({ type: 'ACTION_REJECTED', reason: result?.reason || 'Action rejected.' });
                    Net.broadcast();
                }
            });
            connection.on('close', () => {
                delete App.connections[connection.peer];
                const player = Game.engine?.getPlayer(connection.peer);
                if (player) player.connected = false;
                Net.broadcast();
            });
        },

        receiveFromHost(data, hostId) {
            if (!data || typeof data !== 'object') return;
            if (data.type === 'STATE_UPDATE') {
                if (data.state.phase === 'lobby') UI.showRoom(`Connected to ${hostId}`, false);
                UI.render(data.state);
            } else if (data.type === 'JOIN_REJECTED') {
                UI.resetLobbyButtons();
                UI.showToast(data.reason || 'The host rejected this join.', 'danger');
            } else if (data.type === 'ACTION_REJECTED') {
                UI.showToast(data.reason || 'That move is not legal.', 'danger');
            }
        },

        sendAction(action) {
            if (App.isHost) {
                const result = Game.engine?.processAction(action, App.localId);
                if (!result?.ok) UI.showToast(result?.reason || 'That move is not legal.', 'danger');
                Net.broadcast();
                return result;
            }
            if (!App.hostConnection?.open) {
                UI.showToast('The host is not connected.', 'danger');
                return { ok: false };
            }
            App.hostConnection.send({ type: 'ACTION', action });
            return { ok: true, pending: true };
        },

        broadcast() {
            if (!App.isHost || !Game.engine) return;
            for (const [peerId, connection] of Object.entries(App.connections)) {
                if (!connection.open) continue;
                connection.send({
                    type: 'STATE_UPDATE',
                    state: Game.engine.getViewState(peerId)
                });
            }
            UI.render(Game.engine.getViewState(App.localId));
        }
    };

    const UI = {
        initialize() {
            const query = new URLSearchParams(window.location.search);
            const requestedGame = query.get('game');
            const joinId = query.get('join');
            if (requestedGame === 'bazunga') {
                const url = new URL('../index.html', window.location.href);
                url.searchParams.set('game', 'bazunga');
                if (joinId) url.searchParams.set('join', joinId);
                window.location.replace(url.href);
                return;
            }
            if (requestedGame === 'president') {
                const url = new URL('../president/index.html', window.location.href);
                url.searchParams.set('game', 'president');
                if (joinId) url.searchParams.set('join', joinId);
                window.location.replace(url.href);
                return;
            }
            if (joinId) document.getElementById('join-id').value = joinId.replace(/[^a-zA-Z0-9-]/g, '');

            document.getElementById('btn-host').onclick = event => {
                event.currentTarget.disabled = true;
                event.currentTarget.textContent = 'CONNECTING…';
                App.isHost = true;
                Net.initialize(document.getElementById('player-name').value);
            };
            document.getElementById('btn-join').onclick = event => {
                const room = document.getElementById('join-id').value.trim();
                if (!room) return UI.showToast('Paste a Game ID first.', 'danger');
                event.currentTarget.disabled = true;
                event.currentTarget.textContent = 'JOINING…';
                App.isHost = false;
                Net.initialize(document.getElementById('player-name').value, room);
            };
            document.getElementById('btn-add-bot').onclick = UI.addBot;
            document.getElementById('btn-start-game').onclick = UI.startGame;
            document.getElementById('btn-sort-hand').onclick = UI.toggleSort;
            document.getElementById('btn-primary-action').onclick = UI.primaryAction;
            document.getElementById('btn-finish-attack').onclick = () => Net.sendAction({ type: 'PASS_ATTACK' });
            document.getElementById('btn-take-cards').onclick = () => Net.sendAction({ type: 'TAKE_CARDS' });
            document.getElementById('chat-fab').onclick = () => UI.setChatOpen(true);
            document.getElementById('chat-close').onclick = () => UI.setChatOpen(false);
            document.getElementById('chat-send').onclick = UI.sendChat;
            document.getElementById('chat-input').addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    UI.sendChat();
                } else if (event.key === 'Escape') UI.setChatOpen(false);
            });
            ['btn-open-rules', 'btn-room-rules', 'btn-table-rules'].forEach(id => {
                document.getElementById(id).onclick = UI.openRules;
            });
            document.getElementById('btn-close-rules').onclick = UI.closeRules;
            document.getElementById('btn-rules-done').onclick = UI.closeRules;
            document.getElementById('btn-view-table').onclick = UI.hideResults;
            document.getElementById('btn-leave-game').onclick = UI.leaveGame;
            document.getElementById('btn-play-again').onclick = UI.playAgain;
            document.getElementById('modal-overlay').onclick = () => {
                if (!document.getElementById('rules-modal').classList.contains('hidden')) UI.closeRules();
            };
            window.addEventListener('resize', () => App.gameState && UI.render(App.gameState));
            if (joinId) document.getElementById('btn-join').click();
        },

        resetLobbyButtons() {
            const host = document.getElementById('btn-host');
            const join = document.getElementById('btn-join');
            host.disabled = false;
            host.textContent = 'CREATE A DURAK TABLE';
            join.disabled = false;
            join.textContent = 'JOIN';
        },

        showRoom(roomText, isHost) {
            document.getElementById('lobby-start').classList.add('hidden');
            document.getElementById('lobby-room').classList.remove('hidden');
            document.getElementById('room-id-display').textContent = roomText;
            document.getElementById('host-controls').classList.toggle('hidden', !isHost);
            document.getElementById('client-waiting').classList.toggle('hidden', isHost);
        },

        renderQr(peerId) {
            const container = document.getElementById('qr-container');
            container.replaceChildren();
            const url = new URL(window.location.origin + window.location.pathname);
            url.searchParams.set('game', 'durak');
            url.searchParams.set('join', peerId);
            container.dataset.inviteUrl = url.href;
            container.setAttribute('aria-label', 'Scan to join this Durak room');
            if (typeof QRCode === 'function') new QRCode(container, { text: url.href, width: 56, height: 56 });
        },

        addBot() {
            if (!App.isHost || !Game.engine || Game.engine.state.phase !== 'lobby') return;
            if (Game.engine.state.players.length >= MAX_PLAYERS) return UI.showToast('This table already has six players.', 'danger');
            const difficulty = Number(document.getElementById('bot-difficulty').value) || 1;
            if (difficulty === 5 && Game.engine.state.players.some(player => player.isBot && player.botDifficulty === 5)) {
                return UI.showToast('There is only one Baba Gupta.', 'danger');
            }
            const existing = Game.engine.state.players.filter(player => player.isBot && player.botDifficulty === difficulty).length;
            const name = `${BOT_NAMES[difficulty]}${existing ? ` ${existing + 1}` : ''}`;
            Game.engine.addPlayer({
                id: `bot-${difficulty}-${Utils.uuid()}`,
                name,
                isBot: true,
                botDifficulty: difficulty,
                connected: true
            });
            Net.broadcast();
        },

        startGame() {
            if (!App.isHost || !Game.engine) return;
            const result = Game.engine.startGame();
            if (!result.ok) return UI.showToast(result.reason, 'danger');
            App.ui.resultsShown = false;
            Game.bots.start();
            Net.broadcast();
        },

        playAgain() {
            if (!App.isHost || !Game.engine) return;
            UI.hideResults();
            const result = Game.engine.startGame();
            if (!result.ok) return UI.showToast(result.reason, 'danger');
            App.ui.resultsShown = false;
            Game.bots.start();
            Net.broadcast();
        },

        render(state) {
            UI.captureCurrentCardRects();
            App.gameState = state;
            if (state.phase === 'lobby') {
                UI.renderLobby(state);
                return;
            }
            document.getElementById('lobby').classList.add('hidden');
            document.getElementById('game-view').classList.remove('hidden');
            UI.renderStatus(state);
            UI.renderOpponents(state);
            UI.renderBattle(state);
            UI.renderTalon(state);
            UI.renderHand(state);
            UI.renderActions(state);
            UI.renderChat(state);
            UI.renderLastAction(state);
            if (state.phase === 'game_over') UI.showResults(state);
        },

        renderLobby(state) {
            const list = document.getElementById('lobby-players');
            list.innerHTML = state.players.map(player => `
                <div class="lobby-player">
                    <span>${Utils.escape(player.name)} ${player.id === App.localId ? '<small>(YOU)</small>' : ''}</span>
                    <span>
                        <small>${player.isBot ? `BOT L${player.botDifficulty}` : player.connected ? 'CONNECTED' : 'OFFLINE'}</small>
                        ${App.isHost && player.isBot ? `<button data-remove-bot="${Utils.escape(player.id)}">REMOVE</button>` : ''}
                    </span>
                </div>
            `).join('');
            list.querySelectorAll('[data-remove-bot]').forEach(button => {
                button.onclick = () => {
                    Game.engine.removePlayer(button.dataset.removeBot);
                    Net.broadcast();
                };
            });
            const start = document.getElementById('btn-start-game');
            if (start) {
                start.disabled = state.players.length < 2;
                start.textContent = state.players.length < 2 ? 'ADD AT LEAST ONE OPPONENT' : `DEAL TO ${state.players.length} PLAYERS`;
            }
        },

        renderStatus(state) {
            const phaseNames = {
                attack: state.pickupDeclared ? 'THROW IN' : 'ATTACK',
                defend: 'DEFEND',
                throw_in: 'PICKUP',
                game_over: 'COMPLETE'
            };
            document.getElementById('phase-display').textContent = phaseNames[state.phase] || state.phase.toUpperCase();
            const me = state.players.find(player => player.id === App.localId);
            const attacker = state.players.find(player => player.id === state.attackTurnId);
            const defender = state.players.find(player => player.id === state.defenderId);
            let status;
            if (state.phase === 'game_over') {
                status = `${state.players.find(player => player.id === state.durakId)?.name || 'Nobody'} is the Durak.`;
            } else if (state.phase === 'defend') {
                status = defender?.id === App.localId
                    ? DurakRules.getPrompt(state)
                    : `${defender?.name || 'The defender'} must cover the attack or take the table.`;
            } else {
                status = attacker?.id === App.localId
                    ? DurakRules.getPrompt(state)
                    : `${attacker?.name || 'An attacker'} may ${state.phase === 'throw_in' ? 'throw in or finish' : 'attack or finish'}.`;
            }
            document.getElementById('status-text').textContent = status;
            const activeIds = new Set([...(state.thinkingBots || []), ...(state.typingBots || [])]);
            const activity = [...activeIds].map(id => {
                const player = state.players.find(candidate => candidate.id === id);
                if (!player) return null;
                return `${player.name} ${(state.typingBots || []).includes(id) ? 'is typing…' : 'is thinking…'}`;
            }).filter(Boolean);
            document.getElementById('activity-text').textContent = activity.join(' · ');
            document.getElementById('hand-dock').classList.toggle(
                'current-turn',
                state.attackTurnId === me?.id || (state.phase === 'defend' && state.defenderId === me?.id)
            );
        },

        seatPositions(count) {
            const maps = {
                1: [[50, 14]],
                2: [[25, 18], [75, 18]],
                3: [[15, 30], [50, 12], [85, 30]],
                4: [[10, 38], [34, 12], [66, 12], [90, 38]],
                5: [[8, 42], [25, 15], [50, 9], [75, 15], [92, 42]]
            };
            return maps[count] || [];
        },

        renderOpponents(state) {
            const layer = document.getElementById('opponent-layer');
            const opponents = state.players.filter(player => player.id !== App.localId);
            const positions = UI.seatPositions(opponents.length);
            layer.innerHTML = opponents.map((player, index) => {
                const role = player.out
                    ? `OUT #${player.finishPlace || ''}`
                    : player.id === state.defenderId
                    ? 'DEFENDER'
                    : player.id === state.attackTurnId
                    ? 'ATTACKING'
                    : '';
                const backs = Array.from({ length: Math.min(8, player.handCount) }, () => '<i class="card-back-mini"></i>').join('');
                return `
                    <div class="opponent-seat ${player.id === state.attackTurnId ? 'current' : ''} ${player.id === state.defenderId ? 'defender' : ''} ${player.out ? 'out' : ''}"
                         id="seat-${Utils.escape(player.id)}"
                         style="left:${positions[index]?.[0] || 50}%;top:${positions[index]?.[1] || 15}%"
                         aria-label="${Utils.escape(player.name)}, ${player.handCount} cards, ${role}">
                        <div class="seat-badge">
                            <span class="seat-role">${role}</span>
                            <span class="seat-name">${Utils.escape(player.name)}</span>
                            <span class="seat-count">${player.handCount}</span>
                        </div>
                        <div class="opponent-cards">${backs}</div>
                    </div>
                `;
            }).join('');
        },

        cardMarkup(card, classes = '') {
            if (!card || card.hidden) return '<div class="playing-card card-back"></div>';
            return `
                <div class="playing-card ${card.isRed ? 'red' : ''} ${classes}" data-card-id="${Utils.escape(card.id)}">
                    <span class="card-corner">${Utils.escape(card.rank)}<small>${Utils.escape(card.suit)}</small></span>
                    <span class="card-suit">${Utils.escape(card.suit)}</span>
                    <span class="card-corner bottom">${Utils.escape(card.rank)}<small>${Utils.escape(card.suit)}</small></span>
                </div>
            `;
        },

        renderBattle(state) {
            const container = document.getElementById('battle-pairs');
            const me = state.players.find(player => player.id === App.localId);
            const selected = me?.hand.find(card => card.id === App.ui.selectedCardId);
            const canTarget = state.phase === 'defend' && state.defenderId === App.localId && selected;
            container.innerHTML = state.battle.map(pair => {
                const legal = canTarget && !pair.defenseCard && DurakRules.canBeat(selected, pair.attackCard, state.trumpSuit);
                const attacker = state.players.find(player => player.id === pair.attackerId);
                return `
                    <div class="battle-pair" data-pair-id="${Utils.escape(pair.id)}"
                         ${legal ? `role="button" tabindex="0" aria-label="Cover ${Utils.escape(DurakRules.describeCard(pair.attackCard))} with ${Utils.escape(DurakRules.describeCard(selected))}"` : ''}>
                        ${UI.cardMarkup(pair.attackCard, `attack-card ${legal ? 'legal-target' : ''}`)}
                        ${pair.defenseCard ? UI.cardMarkup(pair.defenseCard, 'defense-card') : ''}
                        <span class="pair-label">${pair.defenseCard ? 'COVERED' : `FROM ${Utils.escape(attacker?.name || 'ATTACKER')}`}</span>
                    </div>
                `;
            }).join('');
            container.querySelectorAll('[data-pair-id]').forEach(pairElement => {
                pairElement.onclick = () => {
                    const current = App.gameState;
                    if (current.phase !== 'defend' || current.defenderId !== App.localId || !App.ui.selectedCardId) return;
                    const pair = current.battle.find(candidate => candidate.id === pairElement.dataset.pairId);
                    const card = current.players.find(player => player.id === App.localId)?.hand.find(candidate => candidate.id === App.ui.selectedCardId);
                    if (!pair || pair.defenseCard || !DurakRules.canBeat(card, pair.attackCard, current.trumpSuit)) {
                        return UI.showToast('That selected card cannot beat this attack.', 'danger');
                    }
                    Net.sendAction({ type: 'DEFEND', cardId: card.id, pairId: pair.id });
                    App.ui.selectedCardId = null;
                };
                pairElement.onkeydown = event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        pairElement.click();
                    }
                };
            });
            document.getElementById('battle-empty').classList.toggle('hidden', state.battle.length > 0);
            document.getElementById('battle-count').textContent = `${state.battle.length} / ${state.attackLimit || 6}`;
        },

        renderTalon(state) {
            const slot = document.getElementById('trump-card-slot');
            slot.innerHTML = state.trumpCard
                ? UI.cardMarkup(state.trumpCard, 'trump-turnup')
                : `<div class="phase-chip">${Utils.escape(state.trumpSuit || '—')} TRUMP</div>`;
            const stack = document.getElementById('talon-stack');
            stack.classList.toggle('empty', state.talonCount === 0);
            stack.setAttribute('aria-label', state.talonCount ? `${state.talonCount} cards remain in the talon` : 'The talon is empty');
            document.getElementById('talon-count').textContent = state.talonCount;
            document.getElementById('trump-suit').textContent = state.trumpSuit || '—';
            document.getElementById('trump-reminder').textContent = `TRUMP ${state.trumpSuit || '—'}`;
        },

        renderHand(state) {
            const me = state.players.find(player => player.id === App.localId);
            if (!me) return;
            if (!me.hand.some(card => card.id === App.ui.selectedCardId)) App.ui.selectedCardId = null;
            const sorted = DurakRules.sortHand(me.hand, state.trumpSuit, App.ui.sortMode);
            const container = document.getElementById('local-hand');
            container.innerHTML = sorted.map(card => UI.cardMarkup(card, `hand-card ${card.id === App.ui.selectedCardId ? 'selected' : ''}`)).join('');
            container.querySelectorAll('.hand-card').forEach(cardElement => {
                cardElement.setAttribute('role', 'button');
                cardElement.setAttribute('tabindex', '0');
                const card = me.hand.find(candidate => candidate.id === cardElement.dataset.cardId);
                cardElement.setAttribute('aria-label', `${card.rank} of ${card.suit}${card.id === App.ui.selectedCardId ? ', selected' : ''}`);
                const select = () => {
                    App.ui.selectedCardId = App.ui.selectedCardId === card.id ? null : card.id;
                    UI.render(App.gameState);
                };
                cardElement.onclick = select;
                cardElement.onkeydown = event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        select();
                    }
                };
            });
            document.getElementById('hand-count').textContent = `${me.handCount} card${me.handCount === 1 ? '' : 's'}`;
        },

        renderActions(state) {
            const panel = document.getElementById('action-panel');
            const gameView = document.getElementById('game-view');
            const me = state.players.find(player => player.id === App.localId);
            const selected = me?.hand.find(card => card.id === App.ui.selectedCardId);
            const isDefender = state.phase === 'defend' && state.defenderId === App.localId;
            const isAttacker = ['attack', 'throw_in'].includes(state.phase) && state.attackTurnId === App.localId;
            panel.classList.toggle('hidden', !isDefender && !isAttacker);
            gameView.classList.toggle('action-visible', isDefender || isAttacker);
            if (!isDefender && !isAttacker) return;

            const primary = document.getElementById('btn-primary-action');
            const finish = document.getElementById('btn-finish-attack');
            const take = document.getElementById('btn-take-cards');
            const role = document.getElementById('role-label');
            const prompt = document.getElementById('action-prompt');

            if (isDefender) {
                role.textContent = 'YOU ARE DEFENDING';
                prompt.textContent = selected
                    ? 'Now tap the uncovered attack card you want to beat.'
                    : 'Select a card, then tap the attack it should cover.';
                primary.textContent = selected ? 'SELECT AN ATTACK ABOVE' : 'SELECT A HAND CARD';
                primary.disabled = true;
                finish.classList.add('hidden');
                take.classList.remove('hidden');
                return;
            }

            const legal = selected && DurakRules.canAttack(selected, state.battle, state.attackLimit);
            role.textContent = state.phase === 'throw_in' ? 'THROW-IN OPPORTUNITY' : 'YOUR ATTACK';
            prompt.textContent = selected
                ? legal
                    ? `${selected.rank}${selected.suit} is ready.`
                    : 'That rank cannot be added to this battle.'
                : state.battle.length
                ? 'Select a matching rank or finish the attack.'
                : 'Select any card to open the attack.';
            primary.textContent = state.phase === 'throw_in' ? 'THROW IN SELECTED' : 'ATTACK WITH SELECTED';
            primary.disabled = !legal;
            finish.textContent = state.phase === 'throw_in' ? 'DONE THROWING' : 'FINISH ATTACK';
            finish.classList.toggle('hidden', state.battle.length === 0);
            take.classList.add('hidden');
        },

        primaryAction() {
            const state = App.gameState;
            if (!state || !App.ui.selectedCardId) return;
            const result = Net.sendAction({ type: 'ATTACK', cardId: App.ui.selectedCardId });
            if (result?.ok) App.ui.selectedCardId = null;
        },

        toggleSort() {
            App.ui.sortMode = App.ui.sortMode === 'rank' ? 'suit' : 'rank';
            document.getElementById('btn-sort-hand').textContent = `AUTO-SORT: ${App.ui.sortMode.toUpperCase()}`;
            if (App.gameState) UI.renderHand(App.gameState);
        },

        captureCurrentCardRects() {
            App.ui.previousCardRects.clear();
            document.querySelectorAll('.hand-card[data-card-id]').forEach(element => {
                const rect = element.getBoundingClientRect();
                App.ui.previousCardRects.set(element.dataset.cardId, {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    html: element.outerHTML
                });
            });
        },

        renderLastAction(state) {
            const action = state.lastAction;
            if (action) {
                const token = `${action.type}:${action.time}:${action.card?.id || ''}`;
                if (token !== App.ui.lastActionToken) {
                    App.ui.lastActionToken = token;
                    if (['attack', 'throw_in', 'defend'].includes(action.type) && action.card) {
                        requestAnimationFrame(() => UI.animateCard(action));
                    }
                }
            }

            const roundResult = state.lastRoundResult;
            if (!roundResult) return;
            const roundToken = `${roundResult.type}:${roundResult.time}:${roundResult.cardCount}`;
            if (roundToken === App.ui.lastRoundResultToken) return;
            App.ui.lastRoundResultToken = roundToken;
            if (roundResult.type === 'round_pickup' || roundResult.type === 'round_defended') {
                const names = (roundResult.drawn || []).map(item => {
                    const player = state.players.find(candidate => candidate.id === item.playerId);
                    return `${player?.name || 'Player'} drew ${item.count}`;
                });
                const message = roundResult.type === 'round_pickup'
                    ? `${state.players.find(player => player.id === roundResult.defenderId)?.name || 'Defender'} takes ${roundResult.cardCount}. ${names.join(' → ')}`
                    : `Defence complete. ${names.join(' → ') || 'The talon is empty — no more drawing.'}`;
                UI.showRoundCallout(message);
            }
        },

        animateCard(action) {
            const source = App.ui.previousCardRects.get(action.card.id);
            const pair = [...document.querySelectorAll('[data-pair-id]')]
                .find(element => element.dataset.pairId === String(action.pairId));
            const target = pair?.querySelector(action.type === 'defend' ? '.defense-card' : '.attack-card');
            if (!target) return;
            const targetRect = target.getBoundingClientRect();
            const actorSeat = document.getElementById(`seat-${action.playerId}`);
            const actorRect = actorSeat?.getBoundingClientRect();
            const flight = document.createElement('div');
            flight.className = `playing-card ${action.card.isRed ? 'red' : ''} flight-card`;
            flight.innerHTML = UI.cardMarkup(action.card).replace(/^<div[^>]*>|<\/div>$/g, '');
            flight.style.left = `${source?.left ?? actorRect?.left ?? window.innerWidth / 2}px`;
            flight.style.top = `${source?.top ?? actorRect?.top ?? 20}px`;
            flight.style.setProperty('--fly-x', `${targetRect.left}px`);
            flight.style.setProperty('--fly-y', `${targetRect.top}px`);
            document.getElementById('animation-layer').appendChild(flight);
            setTimeout(() => flight.remove(), 700);
        },

        showRoundCallout(message) {
            const callout = document.getElementById('round-callout');
            callout.textContent = message;
            callout.classList.remove('hidden');
            clearTimeout(callout._timer);
            callout._timer = setTimeout(() => callout.classList.add('hidden'), Math.min(8500, 3800 + message.length * 35));
        },

        renderChat(state) {
            const box = document.getElementById('chat-messages');
            const wasBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 30;
            box.innerHTML = state.logs.map(log => log.type === 'chat'
                ? `<div class="chat-message"><strong>${Utils.escape(log.name)}:</strong> ${Utils.escape(log.message)}</div>`
                : `<div class="chat-message system">${Utils.escape(log.message)}</div>`
            ).join('');
            if (wasBottom) box.scrollTop = box.scrollHeight;

            const newChats = state.logs.filter(log => log.id > App.ui.lastLogId && log.type === 'chat');
            for (const log of newChats) UI.showChatBubble(log.name, log.message);
            if (state.logs.length) App.ui.lastLogId = Math.max(...state.logs.map(log => log.id));
            const typing = (state.typingBots || [])
                .map(id => state.players.find(player => player.id === id)?.name)
                .filter(Boolean);
            document.getElementById('typing-indicator').textContent = typing.length
                ? `${typing.slice(0, 2).join(' & ')} ${typing.length > 1 ? 'are' : 'is'} typing…`
                : '';
            document.getElementById('chat-unread').textContent = App.ui.unread || '';
        },

        showChatBubble(name, message) {
            const container = document.getElementById('chat-bubbles');
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble';
            const speaker = document.createElement('strong');
            speaker.textContent = `${name}: `;
            bubble.append(speaker, document.createTextNode(message));
            container.appendChild(bubble);
            while (container.children.length > 3) container.firstElementChild.remove();
            const duration = Math.min(10500, 4800 + message.length * 42);
            setTimeout(() => bubble.remove(), duration);
            if (!App.ui.chatOpen) {
                App.ui.unread += 1;
                document.getElementById('chat-unread').textContent = App.ui.unread;
            }
        },

        setChatOpen(open) {
            App.ui.chatOpen = open;
            document.getElementById('chat-drawer').classList.toggle('open', open);
            document.getElementById('chat-fab').setAttribute('aria-expanded', String(open));
            if (open) {
                App.ui.unread = 0;
                document.getElementById('chat-unread').textContent = '';
                const box = document.getElementById('chat-messages');
                box.scrollTop = box.scrollHeight;
                setTimeout(() => document.getElementById('chat-input').focus(), 180);
            }
        },

        sendChat() {
            const input = document.getElementById('chat-input');
            const message = Utils.clean(input.value, 240);
            if (!message) return;
            Net.sendAction({ type: 'CHAT', message });
            input.value = '';
        },

        openRules() {
            document.getElementById('modal-overlay').classList.remove('hidden');
            document.getElementById('rules-modal').classList.remove('hidden');
        },

        closeRules() {
            document.getElementById('rules-modal').classList.add('hidden');
            if (document.getElementById('results-modal').classList.contains('hidden')) {
                document.getElementById('modal-overlay').classList.add('hidden');
            }
        },

        showResults(state) {
            if (App.ui.resultsShown) return;
            App.ui.resultsShown = true;
            const durak = state.players.find(player => player.id === state.durakId);
            document.getElementById('durak-result').textContent = durak ? `${durak.name} — THE DURAK` : 'NO FOOL THIS DEAL';
            const finishIds = [...state.finishedOrder];
            if (state.durakId) finishIds.push(state.durakId);
            document.getElementById('finish-order').innerHTML = finishIds.map((playerId, index) => {
                const player = state.players.find(candidate => candidate.id === playerId);
                return `<div class="finish-row"><span>${index + 1}. ${Utils.escape(player?.name || 'Player')}</span><strong>${playerId === state.durakId ? 'FOOL' : 'OUT'}</strong></div>`;
            }).join('');
            document.getElementById('btn-play-again').classList.toggle('hidden', !App.isHost);
            setTimeout(() => {
                document.getElementById('modal-overlay').classList.remove('hidden');
                document.getElementById('results-modal').classList.remove('hidden');
            }, 1500);
        },

        hideResults() {
            document.getElementById('results-modal').classList.add('hidden');
            if (document.getElementById('rules-modal').classList.contains('hidden')) {
                document.getElementById('modal-overlay').classList.add('hidden');
            }
        },

        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = 'chat-bubble';
            toast.style.position = 'fixed';
            toast.style.zIndex = '300';
            toast.style.left = '50%';
            toast.style.top = '70px';
            toast.style.translate = '-50% 0';
            toast.style.borderColor = type === 'danger' ? 'rgba(220,54,88,.7)' : 'rgba(240,191,89,.4)';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), Math.min(8000, 3800 + String(message).length * 30));
        },

        leaveGame() {
            Game.bots?.stop();
            Object.values(App.connections).forEach(connection => {
                try { connection.close(); } catch (error) {}
            });
            try { App.hostConnection?.close(); } catch (error) {}
            try { App.peer?.destroy(); } catch (error) {}
            const url = new URL(window.location.href);
            url.search = '?game=durak';
            url.hash = '';
            window.location.replace(url.href);
        }
    };

    window.DurakApp = { App, Game, Net, UI, Utils };
    window.addEventListener('load', UI.initialize);
})();
