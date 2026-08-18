(function () {
    'use strict';

    const MAX_PLAYERS = 8;
    const BOT_NAMES = {
        1: 'Lobby Larry [Casual]',
        2: 'Civic Mind [Clever]',
        3: 'Majority Whip [Hard]',
        4: 'Chancellor Zero [Expert]',
        5: 'Baba Gupta'
    };
    const ROLE_LABELS = {
        president: 'PRESIDENT',
        vice_president: 'VICE-PRESIDENT',
        citizen: 'CITIZEN',
        vice_slave: 'VICE-SLAVE',
        slave: 'SLAVE'
    };

    const Utils = {
        id: () => Math.random().toString(36).slice(2, 11),
        cleanText: (value, maximum = 240, fallback = '') => {
            const text = String(value ?? '')
                .replace(/[\u0000-\u001f\u007f]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, maximum);
            return text || fallback;
        },
        escapeHTML: value => String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]),
        messageDuration: message => Math.min(11000, 5000 + Utils.cleanText(message, 240).length * 38)
    };

    const App = {
        isHost: false,
        offlineHost: false,
        localId: null,
        localName: '',
        sessionToken: null,
        peer: null,
        peerOpenTimer: null,
        hostConnection: null,
        guestLink: null,
        roomRelay: null,
        fallbackClientId: '',
        transport: '',
        connections: {},
        connectionRoles: {},
        spectators: {},
        allowSpectators: true,
        isSpectator: false,
        requestedSpectator: false,
        requestedRoomName: '',
        hostId: '',
        reconnectTimer: null,
        everConnected: false,
        leaving: false,
        joinRejected: false,
        gameState: null,
        ui: {
            selectedIds: new Set(),
            sortMode: 'rank',
            lastActionNonce: null,
            lastSeenLogId: 0,
            dismissedResultsRound: null,
            chatOpen: false
        }
    };

    const Game = {
        engine: null,
        bots: null
    };

    const Net = {
        resetJoinAttempt(resetButtons = true) {
            clearTimeout(App.peerOpenTimer);
            clearTimeout(App.reconnectTimer);
            App.guestLink?.stop?.();
            App.guestLink = null;
            const connection = App.hostConnection;
            App.hostConnection = null;
            if (connection) {
                clearTimeout(connection._openTimer);
                clearTimeout(connection._joinRetryTimer);
                clearTimeout(connection._joinTimeoutTimer);
                try { connection.close(); } catch (error) {}
            }
            const peer = App.peer;
            App.peer = null;
            App.localId = null;
            App.hostId = '';
            App.everConnected = false;
            App.transport = '';
            App.reconnectTimer = null;
            try { peer?.destroy?.(); } catch (error) {}
            if (resetButtons) UI.resetLobbyButtons();
        },

        initialize(name, hostId = null, spectator = false) {
            App.localName = Utils.cleanText(name, 24, `Player ${Math.floor(Math.random() * 1000)}`);
            App.requestedSpectator = Boolean(spectator);
            App.isSpectator = Boolean(spectator);
            App.joinRejected = false;
            App.sessionToken = String(localStorage.getItem('president_slave_token') || Utils.id()).slice(0, 80);
            localStorage.setItem('president_slave_token', App.sessionToken);
            if (!App.isHost) {
                App.fallbackClientId = Utils.id();
                RoomTools.ConnectionProgress.start({
                    spectator: App.requestedSpectator,
                    roomId: hostId,
                    retry: () => {
                        Net.resetJoinAttempt();
                        App.isHost = false;
                        Net.initialize(App.localName, hostId, App.requestedSpectator);
                    }
                });
            }
            if (App.isHost && (!navigator.onLine || typeof Peer !== 'function')) {
                Net.openOfflineHost();
                return;
            }
            if (typeof Peer !== 'function') {
                App.localId = App.fallbackClientId;
                Net.connectToHost(hostId);
                return;
            }
            try {
                const requestedId = App.isHost
                    ? RoomTools.makeRoomId('president', App.requestedRoomName)
                    : App.fallbackClientId;
                App.peer = new Peer(requestedId, RoomTools.peerOptions());
            } catch (error) {
                if (App.isHost) return Net.openOfflineHost();
                App.peer = null;
                App.localId = App.fallbackClientId;
                Net.connectToHost(hostId);
                return;
            }

            App.peerOpenTimer = setTimeout(() => {
                if (App.localId) return;
                if (App.isHost) return Net.openOfflineHost();
                try { App.peer?.destroy?.(); } catch (error) {}
                App.peer = null;
                App.localId = App.fallbackClientId;
                Net.connectToHost(hostId);
            }, RoomTools.PEER_OPEN_TIMEOUT_MS);

            App.peer.on('open', peerId => {
                clearTimeout(App.peerOpenTimer);
                if (App.localId) return;
                if (App.isHost) Net.createHost(peerId, false);
                else {
                    App.localId = peerId;
                    RoomTools.ConnectionProgress.step('room', 'Room service reached. Locating the host...');
                    Net.connectToHost(hostId);
                }
            });
            App.peer.on('connection', connection => Net.acceptConnection(connection));
            App.peer.on('disconnected', () => {
                if (!App.peer?.destroyed) {
                    try { App.peer.reconnect(); } catch (error) {}
                }
            });
            App.peer.on('error', error => {
                console.error(error);
                clearTimeout(App.peerOpenTimer);
                if (App.isHost && !App.localId && RoomTools.isNameCollision(error)) {
                    try { App.peer?.destroy?.(); } catch (destroyError) {}
                    App.peer = null;
                    UI.showRoomCollision(App.requestedRoomName);
                    UI.resetLobbyButtons();
                    return;
                }
                if (App.isHost && !App.localId) {
                    Net.openOfflineHost();
                    return;
                }
                if (!App.localId && !App.guestLink) {
                    try { App.peer?.destroy?.(); } catch (destroyError) {}
                    App.peer = null;
                    App.localId = App.fallbackClientId;
                    Net.connectToHost(hostId);
                }
            });
        },

        openOfflineHost() {
            if (App.localId) return;
            clearTimeout(App.peerOpenTimer);
            try { App.peer?.destroy?.(); } catch (error) {}
            App.peer = null;
            Net.createHost(`offline-${Utils.id()}`, true);
        },

        createHost(peerId, offline = false) {
            if (Game.engine) return;
            App.localId = peerId;
            App.offlineHost = offline;
            App.allowSpectators = document.getElementById('allow-spectators')?.checked !== false;
            Game.engine = new PresidentGameEngine({
                makeId: Utils.id,
                onEvent: (event, state) => Game.bots?.handleEvent(event, state),
                onChange: () => Net.broadcast()
            });
            Game.bots = new PresidentBotController(Game.engine);
            Game.bots.start();
            Game.engine.addPlayer({
                id: peerId,
                name: App.localName,
                sessionToken: App.sessionToken,
                isHost: true,
                connected: true
            });

            document.getElementById('lobby-start').classList.add('hidden');
            document.getElementById('lobby-room').classList.remove('hidden');
            document.getElementById('host-controls').classList.remove('hidden');
            document.getElementById('room-id-display').textContent = offline ? 'OFFLINE • BOTS ONLY' : peerId;
            document.getElementById('qr-container').classList.toggle('hidden', offline);
            if (!offline) UI.renderQr(peerId);
            Net.broadcast();
            if (!offline) Net.startHostRelay(peerId);
            if (offline) UI.showToast('Offline bot table ready. Add bots and deal normally.', 'success');
        },

        async startHostRelay(peerId) {
            try {
                const relay = await RoomTools.RoomRelay.host(
                    peerId,
                    connection => Net.acceptConnection(connection),
                    message => console.info(`[multiplayer relay] ${message}`)
                );
                if (!App.isHost || App.localId !== peerId || App.leaving) return relay.close();
                App.roomRelay?.close?.();
                App.roomRelay = relay;
            } catch (error) {
                console.warn('Cloud join fallback unavailable; direct multiplayer remains active.', error);
            }
        },

        connectToHost(hostId, reconnecting = false) {
            const safeHostId = Utils.cleanText(hostId, 80).replace(/[^a-zA-Z0-9-]/g, '');
            if (!safeHostId) {
                RoomTools.ConnectionProgress.fail('Invalid room code', 'Enter a valid room name or scan a fresh invite.', 'INVALID_ROOM_ID');
                UI.showToast('Enter a valid Game ID.', 'danger');
                UI.resetLobbyButtons();
                return;
            }
            App.hostId = safeHostId;
            App.guestLink?.stop?.();
            App.guestLink = RoomTools.ResilientJoin.connect({
                hostId: safeHostId,
                peerId: App.fallbackClientId || App.localId,
                peer: App.peer,
                joinPayload: {
                    type: 'JOIN',
                    name: App.localName,
                    sessionToken: App.sessionToken,
                    role: App.requestedSpectator ? 'spectator' : 'player'
                },
                onConnection: (connection, transport) => {
                    App.hostConnection = connection;
                    App.transport = transport;
                },
                onChannelOpen: () => {
                    clearTimeout(App.reconnectTimer);
                    App.reconnectTimer = null;
                },
                onReady: () => {
                    App.everConnected = true;
                    document.getElementById('lobby-start').classList.add('hidden');
                    document.getElementById('lobby-room').classList.remove('hidden');
                    document.getElementById('client-waiting').classList.remove('hidden');
                    document.getElementById('room-id-display').textContent = `Connected to ${safeHostId}`;
                },
                onData: data => Net.receiveHostData(data),
                onDrop: () => {
                    if (App.leaving || App.joinRejected) return;
                    UI.showToast('Connection dropped. Rejoining your seat...', 'danger');
                    Net.scheduleReconnect(safeHostId);
                },
                onFailure: ({ detail }) => {
                    UI.showToast(detail, 'danger');
                    Net.resetJoinAttempt();
                }
            });
        },

        scheduleReconnect(hostId) {
            if (App.leaving || App.isHost || App.reconnectTimer) return;
            App.reconnectTimer = setTimeout(() => {
                App.reconnectTimer = null;
                if (!App.leaving) Net.connectToHost(hostId, true);
            }, 1700);
        },

        acceptConnection(connection) {
            if (!App.isHost) return;
            connection.on('data', data => {
                if (!data || typeof data !== 'object') return;
                if (data.type === 'JOIN') {
                    Net.handleJoin(connection, data);
                    return;
                }
                if (data.type === 'SPECTATOR_PERSPECTIVE') {
                    Net.changeSpectatorPerspective(connection.peer, Number(data.direction) || 1);
                    return;
                }
                if (App.connectionRoles[connection.peer]?.role === 'spectator') return;
                const result = Game.engine?.processAction(data, connection.peer);
                if (result && !result.ok && connection.open) {
                    connection.send({ type: 'ACTION_REJECTED', reason: result.reason });
                }
            });
            connection.on('close', () => {
                if (App.connections[connection.peer] !== connection) return;
                const wasSpectator = App.connectionRoles[connection.peer]?.role === 'spectator';
                delete App.connections[connection.peer];
                delete App.connectionRoles[connection.peer];
                delete App.spectators[connection.peer];
                if (wasSpectator) Net.broadcast();
                else Game.engine?.disconnectPlayer(connection.peer);
            });
        },

        handleJoin(connection, data) {
            if (!Game.engine) return;
            const state = Game.engine.state;
            if (data.role === 'spectator') {
                if (!App.allowSpectators) {
                    connection.send({ type: 'JOIN_REJECTED', reason: 'Spectator mode is disabled for this table.' });
                    return;
                }
                const perspectiveId = state.players[0]?.id || null;
                App.connections[connection.peer] = connection;
                App.connectionRoles[connection.peer] = { role: 'spectator', perspectiveId };
                App.spectators[connection.peer] = {
                    id: connection.peer,
                    name: Utils.cleanText(data.name, 24, 'Spectator'),
                    perspectiveId
                };
                Net.sendState(connection, connection.peer);
                Net.broadcast();
                return;
            }
            const sameSeat = state.players.find(player => player.id === connection.peer);
            if (sameSeat) {
                App.connections[connection.peer] = connection;
                App.connectionRoles[connection.peer] = { role: 'player' };
                if (sameSeat.connected === false) Game.engine.reconnectPlayer(sameSeat.id, connection.peer);
                Net.sendState(connection, connection.peer);
                Net.broadcast();
                return;
            }

            const sessionToken = Utils.cleanText(data.sessionToken, 80);
            const reconnecting = sessionToken.length >= 6
                ? state.players.find(player => player.sessionToken === sessionToken && !player.connected && !player.isBot)
                : null;
            if (reconnecting) {
                const oldId = reconnecting.id;
                App.connections[connection.peer] = connection;
                App.connectionRoles[connection.peer] = { role: 'player' };
                Game.engine.reconnectPlayer(oldId, connection.peer);
                Net.sendState(connection, connection.peer);
                return;
            }
            if (state.phase !== 'lobby') {
                connection.send({ type: 'JOIN_REJECTED', reason: 'This round is already in progress.' });
                return;
            }
            if (state.players.length >= MAX_PLAYERS) {
                connection.send({ type: 'JOIN_REJECTED', reason: `This table is full (${MAX_PLAYERS} players).` });
                return;
            }

            const requestedName = Utils.cleanText(data.name, 24, 'Player');
            const usedNames = new Set(state.players.map(player => player.name.toLowerCase()));
            let uniqueName = requestedName;
            let suffix = 2;
            while (usedNames.has(uniqueName.toLowerCase())) {
                const ending = ` ${suffix++}`;
                uniqueName = `${requestedName.slice(0, 24 - ending.length)}${ending}`;
            }
            App.connections[connection.peer] = connection;
            App.connectionRoles[connection.peer] = { role: 'player' };
            Game.engine.addPlayer({
                id: connection.peer,
                name: uniqueName,
                sessionToken,
                connected: true
            });
            Net.sendState(connection, connection.peer);
        },

        receiveHostData(data) {
            if (!data || typeof data !== 'object') return;
            if (data.type === 'STATE_UPDATE' && data.state?.players && data.state?.logs) {
                App.isSpectator = Boolean(data.state.spectatorMode);
                if (App.isSpectator && data.state.viewerId) App.localId = data.state.viewerId;
                App.gameState = data.state;
                UI.render(data.state);
                return;
            }
            if (data.type === 'ACTION_REJECTED') {
                UI.showToast(Utils.cleanText(data.reason, 160, 'That action was rejected.'), 'danger');
                return;
            }
            if (data.type === 'JOIN_REJECTED') {
                App.joinRejected = true;
                UI.showToast(Utils.cleanText(data.reason, 160, 'Unable to join this table.'), 'danger');
                document.getElementById('lobby-start').classList.remove('hidden');
                document.getElementById('lobby-room').classList.add('hidden');
                Net.resetJoinAttempt();
            }
        },

        broadcast() {
            if (!App.isHost || !Game.engine) return;
            for (const [peerId, connection] of Object.entries(App.connections)) {
                Net.sendState(connection, peerId);
            }
            const localView = Game.engine.getViewState(App.localId);
            App.gameState = localView;
            UI.render(localView);
        },

        sendState(connection, peerId) {
            if (!connection || !Game.engine) return false;
            const connectionRole = App.connectionRoles[peerId] || { role: 'player' };
            const spectator = connectionRole.role === 'spectator';
            if (spectator && !Game.engine.state.players.some(player => player.id === connectionRole.perspectiveId)) {
                connectionRole.perspectiveId = Game.engine.state.players[0]?.id || null;
            }
            const perspectiveId = spectator
                ? (connectionRole.perspectiveId || Game.engine.state.players[0]?.id)
                : peerId;
            const state = Game.engine.getViewState(perspectiveId, spectator);
            if (spectator) {
                state.spectatorMode = true;
                state.spectatorCount = Object.keys(App.spectators).length;
            }
            try {
                connection.send({ type: 'STATE_UPDATE', state });
                return true;
            } catch (error) {
                return false;
            }
        },

        changeSpectatorPerspective(peerId, direction) {
            const role = App.connectionRoles[peerId];
            if (role?.role !== 'spectator' || !Game.engine?.state.players.length) return;
            const players = Game.engine.state.players;
            const currentIndex = Math.max(0, players.findIndex(player => player.id === role.perspectiveId));
            role.perspectiveId = players[(currentIndex + (direction < 0 ? -1 : 1) + players.length) % players.length].id;
            if (App.spectators[peerId]) App.spectators[peerId].perspectiveId = role.perspectiveId;
            Net.sendState(App.connections[peerId], peerId);
        },

        sendAction(action) {
            if (App.isSpectator) {
                if (action?.type === 'SPECTATOR_PERSPECTIVE' && App.hostConnection?.open) {
                    App.hostConnection.send(action);
                    return { ok: true, pending: true };
                }
                UI.showToast('Spectators have god view, but cannot play cards.', 'danger');
                return { ok: false };
            }
            if (App.isHost) {
                const result = Game.engine?.processAction(action, App.localId);
                if (result && !result.ok) UI.showToast(result.reason, 'danger');
                return result;
            }
            if (App.hostConnection?.open) {
                App.hostConnection.send(action);
                return { ok: true, pending: true };
            }
            UI.showToast('The host is not connected.', 'danger');
            return { ok: false };
        }
    };

    const UI = {
        initialize() {
            const query = new URLSearchParams(window.location.search);
            const joinId = query.get('join');
            const spectateInvite = query.get('spectate') === '1';
            if (query.get('game') === 'bazunga') {
                const bazungaUrl = new URL('../index.html', window.location.href);
                bazungaUrl.searchParams.set('game', 'bazunga');
                if (joinId) bazungaUrl.searchParams.set('join', joinId.replace(/[^a-zA-Z0-9-]/g, ''));
                if (spectateInvite) bazungaUrl.searchParams.set('spectate', '1');
                window.location.replace(bazungaUrl.href);
                return;
            }
            if (query.get('game') === 'durak') {
                const durakUrl = new URL('../durak/index.html', window.location.href);
                durakUrl.searchParams.set('game', 'durak');
                if (joinId) durakUrl.searchParams.set('join', joinId.replace(/[^a-zA-Z0-9-]/g, ''));
                if (spectateInvite) durakUrl.searchParams.set('spectate', '1');
                window.location.replace(durakUrl.href);
                return;
            }
            CardTheme.bind({
                selectIds: ['card-theme-select'],
                buttonIds: ['btn-card-theme'],
                assetBase: '../',
                onChange: () => App.gameState && UI.render(App.gameState)
            });
            if (joinId) {
                const joinInput = document.getElementById('join-id');
                joinInput.value = joinId.replace(/[^a-zA-Z0-9_-]/g, '');
                joinInput.dataset.direct = '1';
            }

            document.getElementById('btn-host').onclick = event => {
                const button = event.currentTarget;
                button.disabled = true;
                button.textContent = 'CONNECTING…';
                App.isHost = true;
                App.requestedRoomName = RoomTools.cleanRoomName(
                    document.getElementById('room-name').value,
                    `${document.getElementById('player-name').value || 'Card'} ${Utils.id().slice(0, 4)}`
                );
                Net.initialize(document.getElementById('player-name').value);
            };
            document.getElementById('btn-join').onclick = event => {
                const input = document.getElementById('join-id');
                const hostId = RoomTools.resolveJoinId('president', input.value, input.dataset.direct === '1');
                if (!hostId) return UI.showToast('Paste a Game ID first.', 'danger');
                const button = event.currentTarget;
                button.disabled = true;
                button.textContent = 'JOINING…';
                App.isHost = false;
                Net.initialize(document.getElementById('player-name').value, hostId, false);
            };
            document.getElementById('btn-spectate').onclick = event => {
                const input = document.getElementById('join-id');
                const hostId = RoomTools.resolveJoinId('president', input.value, input.dataset.direct === '1');
                if (!hostId) return UI.showToast('Enter a room name or invite first.', 'danger');
                event.currentTarget.disabled = true;
                event.currentTarget.textContent = 'CONNECTING...';
                App.isHost = false;
                Net.initialize(document.getElementById('player-name').value, hostId, true);
            };
            document.getElementById('join-id').addEventListener('input', event => { delete event.currentTarget.dataset.direct; });
            document.getElementById('allow-spectators').onchange = event => {
                App.allowSpectators = event.currentTarget.checked;
                Net.broadcast();
            };
            document.getElementById('spectator-prev').onclick = () => Net.sendAction({ type: 'SPECTATOR_PERSPECTIVE', direction: -1 });
            document.getElementById('spectator-next').onclick = () => Net.sendAction({ type: 'SPECTATOR_PERSPECTIVE', direction: 1 });
            document.getElementById('btn-add-bot').onclick = UI.addBot;
            document.getElementById('btn-start-game').onclick = UI.startGame;
            document.getElementById('btn-sort-hand').onclick = UI.toggleSort;
            document.getElementById('btn-pass').onclick = UI.secondaryAction;
            document.getElementById('btn-play-selected').onclick = UI.primaryAction;
            document.getElementById('chat-fab').onclick = () => UI.setChatOpen(true);
            document.getElementById('chat-close').onclick = () => UI.setChatOpen(false);
            document.getElementById('chat-send').onclick = UI.sendChat;
            document.getElementById('chat-input').addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    UI.sendChat();
                } else if (event.key === 'Escape') {
                    UI.setChatOpen(false);
                }
            });
            ['btn-open-rules', 'btn-room-rules', 'btn-table-rules'].forEach(id => {
                document.getElementById(id).onclick = UI.openRules;
            });
            document.getElementById('btn-close-rules').onclick = UI.closeRules;
            document.getElementById('btn-rules-done').onclick = UI.closeRules;
            document.getElementById('btn-view-table').onclick = UI.hideResults;
            document.getElementById('btn-leave-game').onclick = UI.leaveGame;
            document.getElementById('modal-overlay').onclick = () => {
                if (!document.getElementById('rules-modal').classList.contains('hidden')) UI.closeRules();
            };
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    if (App.ui.chatOpen) UI.setChatOpen(false);
                    else UI.closeRules();
                }
            });

            window.addEventListener('orientationchange', () => {
                setTimeout(() => App.gameState && UI.render(App.gameState), 180);
            });

            if (joinId) document.getElementById(spectateInvite ? 'btn-spectate' : 'btn-join').click();
        },

        resetLobbyButtons() {
            const hostButton = document.getElementById('btn-host');
            const joinButton = document.getElementById('btn-join');
            hostButton.disabled = false;
            hostButton.textContent = 'CREATE A TABLE';
            joinButton.disabled = false;
            joinButton.textContent = 'JOIN';
            const spectateButton = document.getElementById('btn-spectate');
            spectateButton.disabled = false;
            spectateButton.textContent = 'SPECTATE';
        },

        showRoomCollision(roomName) {
            UI.showToast('That room name is already in use.', 'danger');
            RoomTools.showSuggestions(document.getElementById('room-name-suggestions'), roomName, suggestion => {
                document.getElementById('room-name').value = suggestion;
                document.getElementById('room-name-suggestions').classList.add('hidden');
                document.getElementById('btn-host').click();
            });
        },

        renderQr(peerId) {
            const container = document.getElementById('qr-container');
            RoomTools.renderQr(container, RoomTools.inviteUrl('president', peerId), 220);
            RoomTools.bindQr(container);
        },

        addBot() {
            if (!App.isHost || !Game.engine || Game.engine.state.phase !== 'lobby') return;
            if (Game.engine.state.players.length >= MAX_PLAYERS) return UI.showToast('This table is full.', 'danger');
            const selection = HistoricalBots.parseSelection(document.getElementById('bot-difficulty').value, 1);
            const difficulty = selection.difficulty;
            if (difficulty === 5 && Game.engine.state.players.some(player => player.isBot && player.botDifficulty === 5)) {
                return UI.showToast('There is only one Baba Gupta.', 'danger');
            }
            if (selection.personaId && Game.engine.state.players.some(player => player.historicalPersona === selection.personaId)) {
                return UI.showToast(`There is only one ${selection.persona.displayName}.`, 'danger');
            }
            const baseName = selection.persona?.displayName || BOT_NAMES[difficulty];
            const usedNames = new Set(Game.engine.state.players.map(player => player.name.toLowerCase()));
            let name = baseName;
            let suffix = 2;
            while (usedNames.has(name.toLowerCase())) name = `${baseName} ${suffix++}`;
            Game.engine.addPlayer({
                id: `bot-${Utils.id()}`,
                name,
                isBot: true,
                botDifficulty: difficulty,
                historicalPersona: selection.personaId,
                connected: true
            });
        },

        startGame() {
            if (!App.isHost || !Game.engine) return;
            const result = Game.engine.startGame({
                exchangeCount: Number(document.getElementById('exchange-count').value)
            });
            if (!result.ok) UI.showToast(result.reason, 'danger');
        },

        render(state) {
            App.gameState = state;
            UI.renderSpectatorControls(state);
            UI.renderLogs(state);
            if (state.phase === 'lobby') {
                UI.renderLobby(state);
                return;
            }
            document.getElementById('lobby').classList.add('hidden');
            document.getElementById('game-view').classList.remove('hidden');
            UI.renderStatus(state);
            UI.renderOpponents(state);
            UI.renderPile(state);
            UI.renderHand(state);
            UI.renderActions(state);
            UI.animateLastAction(state);
            UI.renderResults(state);
        },

        renderLobby(state) {
            const list = document.getElementById('lobby-players');
            list.innerHTML = state.players.map(player => `
                <div class="lobby-player">
                    <div>
                        <strong>${Utils.escapeHTML(player.name)}</strong>
                        <span>${player.isHost ? 'Host' : player.isBot ? `Bot · Level ${player.botDifficulty}` : 'Player'}</span>
                    </div>
                    ${App.isHost && player.isBot ? `<button class="remove-bot" data-bot-id="${Utils.escapeHTML(player.id)}">REMOVE</button>` : ''}
                </div>
            `).join('');
            list.querySelectorAll('.remove-bot').forEach(button => {
                button.onclick = () => Game.engine?.removePlayer(button.dataset.botId);
            });
        },

        renderSpectatorControls(state) {
            const controls = document.getElementById('spectator-controls');
            controls.classList.toggle('hidden', !App.isSpectator || state.phase === 'lobby');
            if (!App.isSpectator) return;
            const viewed = state.players.find(player => player.id === state.viewerId);
            document.getElementById('spectator-label').textContent = `GOD VIEW - ${viewed?.name || 'TABLE'}`;
        },

        renderStatus(state) {
            const phaseNames = {
                dealing: 'DEAL',
                exchange: 'EXCHANGE',
                play: 'PLAY',
                game_over: 'RESULT'
            };
            document.getElementById('phase-display').textContent = phaseNames[state.phase] || state.phase.toUpperCase();
            const active = state.players[state.turnIndex];
            const me = state.players.find(player => player.id === App.localId);
            let message = 'Waiting for the table…';

            if (App.isSpectator) {
                const viewed = state.players.find(player => player.id === state.viewerId);
                message = `God view: ${viewed?.name || 'table'} perspective. Every hand is available.`;
            } else if (state.phase === 'exchange') {
                const task = state.exchange?.tasks.find(item => item.id === state.exchange.activeTaskId);
                const giver = state.players.find(player => player.id === task?.giverId);
                const receiver = state.players.find(player => player.id === task?.receiverId);
                message = giver?.id === App.localId
                    ? `Choose ${task.count} card${task.count === 1 ? '' : 's'} to give ${receiver?.name || 'away'}.`
                    : `${giver?.name || 'A player'} is choosing cards for ${receiver?.name || 'the exchange'}.`;
            } else if (state.phase === 'play') {
                if (me && state.finishOrder.includes(me.id)) {
                    message = `You finished #${me.finishPosition}. Watch the new order form.`;
                } else if (active?.id === App.localId) {
                    message = state.trick.rank ? PresidentRules.getPrompt(state.trick) : 'Your lead: start a new pile.';
                } else {
                    message = `Waiting for ${active?.name || 'the next player'}…`;
                }
            } else if (state.phase === 'game_over') {
                const president = state.players.find(player => player.id === state.result?.presidentId);
                message = `${president?.name || 'The winner'} is President.`;
            }
            document.getElementById('status-text').textContent = message;

            const typingNames = (state.typingBots || [])
                .map(id => state.players.find(player => player.id === id)?.name)
                .filter(Boolean);
            const thinkingNames = (state.thinkingBots || [])
                .filter(id => !(state.typingBots || []).includes(id))
                .map(id => state.players.find(player => player.id === id)?.name)
                .filter(Boolean);
            const activity = typingNames.length
                ? `${typingNames.slice(0, 2).join(' & ')} ${typingNames.length > 1 ? 'are' : 'is'} typing…`
                : thinkingNames.length
                ? `${thinkingNames.slice(0, 2).join(' & ')} ${thinkingNames.length > 1 ? 'are' : 'is'} thinking…`
                : '';
            document.getElementById('activity-text').textContent = activity;
        },

        renderOpponents(state) {
            const ring = document.getElementById('opponent-ring');
            const opponents = state.players.filter(player => player.id !== App.localId);
            const activeId = state.players[state.turnIndex]?.id;
            ring.innerHTML = opponents.map((player, index) => {
                const angle = opponents.length === 1
                    ? 270
                    : 205 + (130 * index / Math.max(1, opponents.length - 1));
                const radians = angle * Math.PI / 180;
                const x = 50 + Math.cos(radians) * 42;
                const y = 53 + Math.sin(radians) * 41;
                const backCount = Math.min(4, player.hand.length);
                const cardBacks = Array.from({ length: backCount }, (_, cardIndex) =>
                    `<span class="opponent-card" style="left:${8 + cardIndex * 10}px; transform:rotate(${(cardIndex - 1.5) * 5}deg)"></span>`
                ).join('');
                const classes = [
                    'opponent',
                    activeId === player.id && ['play', 'exchange'].includes(state.phase) ? 'active-turn' : '',
                    !player.isBot && player.connected === false ? 'disconnected' : '',
                    player.passed ? 'passed' : '',
                    state.finishOrder.includes(player.id) ? 'finished' : ''
                ].filter(Boolean).join(' ');
                const role = player.role ? `<span class="role-tag">${ROLE_LABELS[player.role] || 'CITIZEN'}</span>` : '';
                const finish = player.finishPosition ? `<span class="finish-chip">FINISHED #${player.finishPosition}</span>` : '';
                return `
                    <div class="${classes}" data-player-id="${Utils.escapeHTML(player.id)}" style="left:${x}%; top:${y}%;" aria-label="${Utils.escapeHTML(player.name)}, ${player.hand.length} cards${activeId === player.id ? ', current turn' : ''}">
                        ${role}
                        <div class="opponent-badge">
                            <span class="name">${Utils.escapeHTML(player.name)}</span>
                            <span class="count">${player.hand.length}</span>
                        </div>
                        <div class="opponent-cards">${cardBacks}</div>
                        ${finish}
                    </div>
                `;
            }).join('');
        },

        cardFace(card, className = '') {
            if (!card || card.hidden) return '';
            const redClass = card.isRed ? 'red' : '';
            const controlClass = card.rank === 'A' || card.rank === '2' ? 'control-card' : '';
            return `
                <span class="${className} ${redClass} ${controlClass}">
                    ${CardTheme.faceMarkup(card, '../', { priority: 'public' })}
                    <span class="card-corner"><b>${card.rank}</b><span>${card.suit}</span></span>
                    <span class="card-suit">${card.suit}</span>
                    ${card.rank === '2' ? '<span class="wild-mark">WILD</span>' : ''}
                    <span class="card-corner bottom"><b>${card.rank}</b><span>${card.suit}</span></span>
                </span>
            `;
        },

        renderPile(state) {
            const pileCards = document.getElementById('pile-cards');
            const label = document.getElementById('pile-label');
            const meta = document.getElementById('pile-meta');
            const lastPlay = state.trick.plays[state.trick.plays.length - 1];
            if (!lastPlay) {
                pileCards.replaceChildren();
                label.textContent = 'NEW PILE';
                meta.textContent = 'The leader may play any legal combination.';
                return;
            }
            pileCards.innerHTML = lastPlay.cards.map(card => UI.cardFace(card, 'pile-card')).join('');
            CardTheme.hydrate(pileCards);
            label.textContent = `${lastPlay.combo.count} × ${lastPlay.combo.rank}`;
            meta.textContent = `${lastPlay.playerName}${lastPlay.combo.wildCount ? ` · ${lastPlay.combo.wildCount} wild` : ''}`;
        },

        renderHand(state) {
            const me = state.players.find(player => player.id === App.localId);
            const hand = document.getElementById('local-hand');
            if (!me) {
                hand.replaceChildren();
                return;
            }
            const availableIds = new Set(me.hand.map(card => card.id));
            for (const selectedId of [...App.ui.selectedIds]) {
                if (!availableIds.has(selectedId)) App.ui.selectedIds.delete(selectedId);
            }
            const sortedCards = PresidentRules.sortHand(me.hand, App.ui.sortMode);
            CardTheme.preloadVisibleCards(sortedCards, { assetBase: '../', priority: 'hand' });
            const twoRows = sortedCards.length > 14;
            hand.classList.toggle('two-rows', twoRows);
            document.getElementById('hand-count').textContent = `${me.hand.length} card${me.hand.length === 1 ? '' : 's'}`;
            document.getElementById('hand-dock').classList.toggle(
                'active-turn',
                state.players[state.turnIndex]?.id === App.localId && ['play', 'exchange'].includes(state.phase)
            );
            hand.innerHTML = sortedCards.map(card => {
                const selected = App.ui.selectedIds.has(card.id);
                const disabled = !UI.canSelectCards(state, me);
                return `
                    <button class="playing-card ${card.isRed ? 'red' : ''} ${card.rank === 'A' || card.rank === '2' ? 'control-card' : ''} ${selected ? 'selected' : ''}"
                        data-card-id="${Utils.escapeHTML(card.id)}"
                        aria-label="${card.rank} of ${UI.suitName(card.suit)}${selected ? ', selected' : ''}"
                        aria-pressed="${selected}"
                        ${disabled ? 'disabled' : ''}>
                        ${CardTheme.faceMarkup(card, '../', { priority: 'hand' })}
                        <span class="card-corner"><b>${card.rank}</b><span>${card.suit}</span></span>
                        <span class="card-suit">${card.suit}</span>
                        ${card.rank === '2' ? '<span class="wild-mark">WILD</span>' : ''}
                        <span class="card-corner bottom"><b>${card.rank}</b><span>${card.suit}</span></span>
                    </button>
                `;
            }).join('');
            hand.querySelectorAll('.playing-card').forEach(button => {
                button.onclick = () => UI.toggleCard(button.dataset.cardId);
            });
            CardTheme.hydrate(hand);
        },

        canSelectCards(state, me) {
            if (App.isSpectator) return false;
            if (state.phase === 'play') {
                return state.players[state.turnIndex]?.id === App.localId && !state.finishOrder.includes(me.id);
            }
            if (state.phase === 'exchange') {
                const task = state.exchange?.tasks.find(item => item.id === state.exchange.activeTaskId);
                return task?.giverId === App.localId;
            }
            return false;
        },

        suitName(suit) {
            return ({ '♣': 'clubs', '♦': 'diamonds', '♥': 'hearts', '♠': 'spades' })[suit] || suit;
        },

        toggleCard(cardId) {
            if (App.ui.selectedIds.has(cardId)) App.ui.selectedIds.delete(cardId);
            else App.ui.selectedIds.add(cardId);
            if (App.gameState) {
                UI.renderHand(App.gameState);
                UI.renderActions(App.gameState);
            }
        },

        toggleSort() {
            App.ui.sortMode = App.ui.sortMode === 'rank' ? 'suit' : 'rank';
            document.getElementById('btn-sort-hand').textContent = App.ui.sortMode === 'rank'
                ? 'AUTO-SORT: RANK + SUIT'
                : 'AUTO-SORT: SUIT + RANK';
            if (App.gameState) UI.renderHand(App.gameState);
            const hand = document.getElementById('local-hand');
            hand.scrollTo({ left: App.ui.sortMode === 'rank' ? hand.scrollWidth : 0, behavior: 'smooth' });
        },

        renderActions(state) {
            const gameView = document.getElementById('game-view');
            const panel = document.getElementById('action-panel');
            const prompt = document.getElementById('turn-prompt');
            const feedback = document.getElementById('selection-feedback');
            const passButton = document.getElementById('btn-pass');
            const playButton = document.getElementById('btn-play-selected');
            const selectedCount = document.getElementById('selected-count');
            const me = state.players.find(player => player.id === App.localId);
            const selectedCards = me?.hand.filter(card => App.ui.selectedIds.has(card.id)) || [];

            panel.dataset.mode = '';
            panel.classList.add('hidden');
            gameView.classList.remove('action-visible');
            feedback.classList.remove('invalid');
            selectedCount.textContent = selectedCards.length;

            if (App.isSpectator) return;

            if (state.phase === 'exchange') {
                const task = state.exchange?.tasks.find(item => item.id === state.exchange.activeTaskId);
                if (!task || task.giverId !== App.localId) return;
                const receiver = state.players.find(player => player.id === task.receiverId);
                panel.classList.remove('hidden');
                gameView.classList.add('action-visible');
                panel.dataset.mode = 'exchange';
                prompt.textContent = `Choose exactly ${task.count} card${task.count === 1 ? '' : 's'} for ${receiver?.name || 'the lower role'}.`;
                const valid = selectedCards.length === task.count;
                feedback.textContent = valid
                    ? `${selectedCards.map(card => `${card.rank}${card.suit}`).join(' · ')} selected`
                    : `${task.count - selectedCards.length > 0 ? task.count - selectedCards.length : selectedCards.length - task.count} ${selectedCards.length < task.count ? 'more' : 'too many'}`;
                feedback.classList.toggle('invalid', selectedCards.length > task.count);
                passButton.textContent = 'CLEAR';
                passButton.disabled = selectedCards.length === 0;
                playButton.innerHTML = `GIVE SELECTED <span id="selected-count">${selectedCards.length}</span>`;
                playButton.setAttribute('aria-label', `GIVE SELECTED ${selectedCards.length}`);
                playButton.disabled = !valid;
                return;
            }

            const myTurn = state.phase === 'play' && state.players[state.turnIndex]?.id === App.localId;
            if (!myTurn || !me || state.finishOrder.includes(me.id)) return;
            panel.classList.remove('hidden');
            gameView.classList.add('action-visible');
            panel.dataset.mode = 'play';
            prompt.textContent = PresidentRules.getPrompt(state.trick);
            const evaluation = PresidentRules.validateSelection(selectedCards, state.trick, me.hand.length);
            feedback.textContent = selectedCards.length
                ? evaluation.valid
                    ? `${evaluation.count} × ${evaluation.rank}${evaluation.wildCount ? ` · ${evaluation.wildCount} wild` : ''}`
                    : evaluation.reason
                : 'Tap one or more matching cards in your hand.';
            feedback.classList.toggle('invalid', selectedCards.length > 0 && !evaluation.valid);
            passButton.textContent = 'PASS';
            passButton.disabled = !state.trick.rank;
            playButton.innerHTML = `PLAY SELECTED <span id="selected-count">${selectedCards.length}</span>`;
            playButton.setAttribute('aria-label', `PLAY SELECTED ${selectedCards.length}`);
            playButton.disabled = !evaluation.valid;
        },

        secondaryAction() {
            const panel = document.getElementById('action-panel');
            if (panel.dataset.mode === 'exchange') {
                App.ui.selectedIds.clear();
                UI.renderHand(App.gameState);
                UI.renderActions(App.gameState);
                return;
            }
            if (panel.dataset.mode === 'play') {
                App.ui.selectedIds.clear();
                Net.sendAction({ type: 'PASS' });
            }
        },

        primaryAction() {
            const panel = document.getElementById('action-panel');
            const cardIds = [...App.ui.selectedIds];
            if (panel.dataset.mode === 'exchange') {
                App.ui.selectedIds.clear();
                Net.sendAction({ type: 'EXCHANGE', cardIds });
                return;
            }
            if (panel.dataset.mode === 'play') {
                App.ui.selectedIds.clear();
                Net.sendAction({ type: 'PLAY_CARDS', cardIds });
            }
        },

        animateLastAction(state) {
            const action = state.lastAction;
            if (!action?.nonce || action.nonce === App.ui.lastActionNonce) return;
            App.ui.lastActionNonce = action.nonce;
            if (action.type === 'play') UI.animatePlay(action);
            else if (action.type === 'pass') UI.animatePass(action);
        },

        getPlayerAnchor(playerId) {
            if (playerId === App.localId) return document.getElementById('hand-dock').getBoundingClientRect();
            const opponent = document.querySelector(`.opponent[data-player-id="${CSS.escape(playerId)}"]`);
            return opponent?.getBoundingClientRect() || document.getElementById('table').getBoundingClientRect();
        },

        animatePlay(action) {
            const source = UI.getPlayerAnchor(action.playerId);
            const target = document.getElementById('center-pile').getBoundingClientRect();
            const layer = document.getElementById('animation-layer');
            const startX = source.left + source.width / 2 - 29;
            const startY = source.top + source.height / 2 - 42;
            const middle = (action.cards.length - 1) / 2;
            action.cards.forEach((card, index) => {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = UI.cardFace(card, 'flight-card');
                const flight = wrapper.firstElementChild;
                const targetX = target.left + target.width / 2 - 29 + (index - middle) * 17;
                const targetY = target.top + target.height / 2 - 42;
                flight.style.left = `${startX + (index - middle) * 5}px`;
                flight.style.top = `${startY}px`;
                flight.style.setProperty('--dx', `${targetX - startX}px`);
                flight.style.setProperty('--dy', `${targetY - startY}px`);
                flight.style.setProperty('--flight-delay', `${index * 45}ms`);
                flight.style.setProperty('--start-rotation', `${(index - middle) * 4}deg`);
                layer.appendChild(flight);
                CardTheme.hydrate(flight);
                setTimeout(() => flight.remove(), 1050);
            });
            UI.showActionCallout(target.left + target.width / 2, target.top + 18, `${action.combo.count} × ${action.combo.rank}`);
            if (action.cleared) {
                const pile = document.getElementById('center-pile');
                pile.classList.remove('pile-cleared');
                void pile.offsetWidth;
                pile.classList.add('pile-cleared');
                setTimeout(() => pile.classList.remove('pile-cleared'), 800);
            }
        },

        animatePass(action) {
            const source = UI.getPlayerAnchor(action.playerId);
            UI.showActionCallout(source.left + source.width / 2, source.top + source.height / 2, 'PASS', true);
        },

        showActionCallout(x, y, text, isPass = false) {
            const callout = document.createElement('div');
            callout.className = `action-callout ${isPass ? 'pass' : ''}`;
            callout.textContent = text;
            callout.style.left = `${x}px`;
            callout.style.top = `${y}px`;
            document.getElementById('animation-layer').appendChild(callout);
            setTimeout(() => callout.remove(), 1350);
        },

        renderLogs(state) {
            const newLogs = state.logs.filter(log => log.id > App.ui.lastSeenLogId);
            for (const log of newLogs) {
                if (log.type === 'chat' && !App.ui.chatOpen) UI.showChatBubble(log.name, log.message);
                if (log.type === 'system' && ['result', 'warning'].includes(log.kind)) {
                    UI.showToast(log.message, log.kind === 'warning' ? 'danger' : 'success');
                }
            }
            if (newLogs.length) App.ui.lastSeenLogId = Math.max(...newLogs.map(log => log.id));

            const box = document.getElementById('chat-messages');
            const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 36;
            box.innerHTML = state.logs.map(log => log.type === 'chat'
                ? `<div class="chat-line"><strong>${Utils.escapeHTML(log.name)}:</strong> ${Utils.escapeHTML(log.message)}</div>`
                : `<div class="chat-line system">${Utils.escapeHTML(log.message)}</div>`
            ).join('');
            if (nearBottom) box.scrollTop = box.scrollHeight;
        },

        showChatBubble(name, message) {
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble';
            bubble.innerHTML = `<strong>${Utils.escapeHTML(name)}:</strong> ${Utils.escapeHTML(message)}`;
            const duration = Utils.messageDuration(message);
            bubble.style.setProperty('--bubble-delay', `${duration - 300}ms`);
            document.getElementById('chat-bubbles').appendChild(bubble);
            setTimeout(() => bubble.remove(), duration);
        },

        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = Utils.cleanText(message, 240);
            document.getElementById('toast-container').appendChild(toast);
            setTimeout(() => toast.remove(), 5100);
        },

        setChatOpen(open) {
            App.ui.chatOpen = Boolean(open);
            const drawer = document.getElementById('chat-drawer');
            drawer.classList.toggle('open', App.ui.chatOpen);
            document.getElementById('chat-fab').setAttribute('aria-expanded', String(App.ui.chatOpen));
            if (App.ui.chatOpen) {
                const messages = document.getElementById('chat-messages');
                messages.scrollTop = messages.scrollHeight;
                setTimeout(() => document.getElementById('chat-input').focus(), 180);
            }
        },

        sendChat() {
            const input = document.getElementById('chat-input');
            const message = Utils.cleanText(input.value, 240);
            if (!message) return;
            input.value = '';
            Net.sendAction({ type: 'CHAT', message });
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

        renderResults(state) {
            const modal = document.getElementById('results-modal');
            if (state.phase !== 'game_over') {
                modal.classList.add('hidden');
                if (document.getElementById('rules-modal').classList.contains('hidden')) {
                    document.getElementById('modal-overlay').classList.add('hidden');
                }
                return;
            }
            if (App.ui.dismissedResultsRound === state.roundNumber) return;
            const list = document.getElementById('results-list');
            list.innerHTML = state.result.order.map((playerId, index) => {
                const player = state.players.find(item => item.id === playerId);
                return `
                    <div class="result-player ${player.role === 'president' ? 'president' : ''}">
                        <span class="result-position">${index + 1}</span>
                        <strong>${Utils.escapeHTML(player.name)}</strong>
                        <span class="result-role">${ROLE_LABELS[player.role] || 'CITIZEN'}</span>
                    </div>
                `;
            }).join('');
            const previous = document.getElementById('btn-next-round');
            if (previous) previous.remove();
            if (App.isHost) {
                const nextButton = document.createElement('button');
                nextButton.id = 'btn-next-round';
                nextButton.className = 'primary';
                nextButton.textContent = 'DEAL NEXT ROUND';
                nextButton.onclick = () => {
                    App.ui.selectedIds.clear();
                    App.ui.dismissedResultsRound = state.roundNumber;
                    Net.sendAction({ type: 'START_NEXT_ROUND' });
                };
                document.getElementById('results-actions').appendChild(nextButton);
            }
            document.getElementById('modal-overlay').classList.remove('hidden');
            modal.classList.remove('hidden');
        },

        hideResults() {
            if (App.gameState) App.ui.dismissedResultsRound = App.gameState.roundNumber;
            document.getElementById('results-modal').classList.add('hidden');
            if (document.getElementById('rules-modal').classList.contains('hidden')) {
                document.getElementById('modal-overlay').classList.add('hidden');
            }
        },

        leaveGame() {
            App.leaving = true;
            clearTimeout(App.reconnectTimer);
            Game.bots?.stop();
            Object.values(App.connections).forEach(connection => {
                try { connection.close(); } catch (error) {}
            });
            App.guestLink?.stop?.();
            App.roomRelay?.close?.();
            try { App.hostConnection?.close(); } catch (error) {}
            try { App.peer?.destroy(); } catch (error) {}
            const url = new URL(window.location.href);
            url.search = '';
            url.hash = '';
            window.location.replace(url.href);
        }
    };

    window.PresidentApp = { App, Game, Net, UI, Utils };
    window.addEventListener('load', UI.initialize);
})();
