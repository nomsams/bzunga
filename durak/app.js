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
        guestLink: null,
        roomRelay: null,
        fallbackClientId: '',
        transport: '',
        connections: {},
        connectionRoles: {},
        spectators: {},
        localId: null,
        localName: '',
        isHost: false,
        offlineHost: false,
        gameState: null,
        sessionToken: '',
        peerOpenTimer: null,
        allowSpectators: true,
        isSpectator: false,
        requestedSpectator: false,
        requestedRoomName: '',
        hostId: '',
        reconnectTimer: null,
        everConnected: false,
        leaving: false,
        joinRejected: false,
        hostBackup: null,
        viceHostId: null,
        promotionTimer: null,
        lastBackupSignature: '',
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
        resetJoinAttempt(resetButtons = true) {
            clearTimeout(App.peerOpenTimer);
            clearTimeout(App.reconnectTimer);
            clearTimeout(App.promotionTimer);
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
            App.promotionTimer = null;
            try { peer?.destroy?.(); } catch (error) {}
            if (resetButtons) UI.resetLobbyButtons();
        },

        initialize(name, hostId = null, spectator = false) {
            App.localName = Utils.clean(name, 24, `Player ${Math.floor(Math.random() * 900 + 100)}`);
            App.requestedSpectator = Boolean(spectator);
            App.isSpectator = Boolean(spectator);
            App.joinRejected = false;
            App.sessionToken = localStorage.getItem('durak-session-token') || Utils.uuid();
            localStorage.setItem('durak-session-token', App.sessionToken);
            if (!App.isHost) {
                App.fallbackClientId = Utils.uuid();
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
                    ? RoomTools.makeRoomId('durak', App.requestedRoomName)
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
                if (App.isHost) Net.hostOpened(peerId, false);
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
            Net.hostOpened(`offline-${Utils.uuid()}`, true);
        },

        hostOpened(peerId, offline = false) {
            if (Game.engine) return;
            App.localId = peerId;
            App.hostId = peerId;
            App.offlineHost = offline;
            App.allowSpectators = document.getElementById('allow-spectators')?.checked !== false;
            const engine = Game.createEngine();
            engine.addPlayer({
                id: peerId,
                name: App.localName,
                sessionToken: App.sessionToken,
                connected: true,
                isHost: true,
                isBot: false
            });
            UI.showRoom(offline ? 'OFFLINE • BOTS ONLY' : peerId, true);
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
                if (!App.isHost || App.hostId !== peerId || App.leaving) return relay.close();
                App.roomRelay?.close?.();
                App.roomRelay = relay;
            } catch (error) {
                console.warn('Cloud join fallback unavailable; direct multiplayer remains active.', error);
            }
        },

        connectToHost(hostId, reconnecting = false) {
            const cleanHostId = Utils.clean(hostId, 80).replace(/[^a-zA-Z0-9-]/g, '');
            if (!cleanHostId) {
                RoomTools.ConnectionProgress.fail('Invalid room code', 'Enter a valid room name or scan a fresh invite.', 'INVALID_ROOM_ID');
                UI.resetLobbyButtons();
                return UI.showToast('Paste a valid Game ID.', 'danger');
            }
            App.hostId = cleanHostId;
            App.guestLink?.stop?.();
            App.guestLink = RoomTools.ResilientJoin.connect({
                hostId: cleanHostId,
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
                    UI.showRoom(`Connected to ${cleanHostId}`, false);
                    document.getElementById('qr-container').classList.remove('hidden');
                    UI.renderQr(cleanHostId);
                },
                onData: data => Net.receiveFromHost(data, cleanHostId),
                onDrop: () => {
                    if (App.leaving || App.joinRejected) return;
                    if (App.hostBackup?.vicePlayerId === App.localId) {
                        UI.showToast('Host left. Taking over the Durak table...', 'danger');
                        Net.schedulePromotion(cleanHostId);
                        return;
                    }
                    UI.showToast('Connection dropped. Rejoining your seat...', 'danger');
                    Net.scheduleReconnect(cleanHostId);
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

        schedulePromotion(hostId) {
            if (App.leaving || App.isHost || App.promotionTimer) return;
            App.promotionTimer = setTimeout(() => { App.promotionTimer = null; Net.promoteFromBackup(hostId); }, 1100);
        },

        promoteFromBackup(hostId) {
            const backup = App.hostBackup;
            if (!backup?.state || backup.vicePlayerId !== App.localId) { Net.scheduleReconnect(hostId); return false; }
            const stablePlayerId = App.localId;
            App.guestLink?.stop?.(); App.guestLink = null; try { App.hostConnection?.close?.(); } catch (error) {} App.hostConnection = null; try { App.peer?.destroy?.(); } catch (error) {} App.peer = null;
            Game.bots?.stop?.(); App.isHost = true; App.offlineHost = false; App.hostId = hostId; App.connections = {}; App.connectionRoles = {}; App.spectators = {}; App.allowSpectators = backup.allowSpectators !== false; App.lastBackupSignature = '';
            Game.createEngine(); Game.engine.state = RoomTools.cloneState(backup.state);
            const oldHost = Game.engine.getPlayer(backup.hostPlayerId); if (oldHost?.connected !== false) Game.engine.disconnectPlayer(oldHost.id);
            Game.engine.setHost(stablePlayerId); Game.bots.start();
            UI.showRoom(hostId, true); document.getElementById('allow-spectators').checked = App.allowSpectators; document.getElementById('qr-container').classList.remove('hidden'); UI.renderQr(hostId); Net.startHostRelay(hostId); Net.broadcast();
            if (typeof Peer === 'function') try {
                const peer = new Peer(hostId, RoomTools.peerOptions()); App.peer = peer;
                peer.on('open', () => UI.showToast('You are now the host. The deal continued.', 'success'));
                peer.on('connection', connection => Net.acceptConnection(connection));
                peer.on('disconnected', () => { if (!peer.destroyed) try { peer.reconnect(); } catch (error) {} });
                peer.on('error', error => { if (!RoomTools.isNameCollision(error)) console.warn('Direct host takeover unavailable; relay remains active.', error); });
            } catch (error) { console.warn('Direct host takeover unavailable; relay remains active.', error); }
            return true;
        },

        sendHostBackup() {
            if (!App.isHost || !Game.engine || App.offlineHost) return;
            const vice = RoomTools.chooseViceHost(Game.engine.state.players, App.localId); App.viceHostId = vice?.id || null; if (!vice) return;
            const entry = Object.entries(App.connectionRoles).find(([, role]) => role?.role === 'player' && role.playerId === vice.id); if (!entry) return;
            const connection = App.connections[entry[0]]; if (!connection?.open) return;
            const state = Game.engine.state; const signature = [vice.id, state.phase, state.roundNumber, state.lastAction?.time || '', state.lastAction?.type || '', state.nextLogId, state.players.map(player => `${player.id}:${player.connected !== false}:${player.isHost}`).join('|')].join(':');
            if (signature === App.lastBackupSignature) return; App.lastBackupSignature = signature;
            try { connection.send({ type: 'HOST_BACKUP', roomId: App.hostId, state: RoomTools.cloneState(state), hostPlayerId: App.localId, vicePlayerId: vice.id, allowSpectators: App.allowSpectators }); } catch (error) {}
        },

        kickPlayer(playerId) {
            if (!App.isHost || !playerId || playerId === App.localId) return false;
            const entry = Object.entries(App.connectionRoles).find(([, role]) => role?.role === 'player' && role.playerId === playerId);
            const transportId = entry?.[0]; const connection = App.connections[transportId]; try { connection?.send?.({ type: 'KICKED', reason: 'The host removed you from this table. You can join again whenever you want.' }); } catch (error) {}
            if (Game.engine?.state.phase === 'lobby') {
                Game.engine.removePlayer(playerId);
                if (transportId) { delete App.connections[transportId]; delete App.connectionRoles[transportId]; }
                setTimeout(() => { try { connection?.close?.(); } catch (error) {} }, 180); Net.broadcast(); return true;
            }
            if (!entry) return false;
            Game.engine?.disconnectPlayer(playerId); setTimeout(() => { try { connection?.close?.(); } catch (error) {} }, 180); return true;
        },

        acceptConnection(connection) {
            if (!App.isHost || !Game.engine) return;
            connection.on('data', data => {
                if (!data || typeof data !== 'object') return;
                if (data.type === 'ROOM_PING') {
                    if (connection.open) connection.send({ type: 'ROOM_PONG', sentAt: data.sentAt || Date.now() });
                    return;
                }
                if (data.type === 'JOIN') {
                    if (data.role === 'spectator') {
                        if (!App.allowSpectators) {
                            connection.send({ type: 'JOIN_REJECTED', reason: 'Spectator mode is disabled for this table.' });
                            return;
                        }
                        const perspectiveId = Game.engine.state.players[0]?.id || null;
                        App.connections[connection.peer] = connection;
                        App.connectionRoles[connection.peer] = { role: 'spectator', perspectiveId };
                        App.spectators[connection.peer] = { id: connection.peer, name: Utils.clean(data.name, 24, 'Spectator'), perspectiveId };
                        Net.sendState(connection, connection.peer);
                        Net.broadcast();
                        return;
                    }
                    const sameSeat = Game.engine.state.players.find(player => player.id === connection.peer);
                    if (sameSeat) {
                        App.connections[connection.peer] = connection;
                        App.connectionRoles[connection.peer] = { role: 'player', playerId: sameSeat.id };
                        if (sameSeat.connected === false) Game.engine.reconnectPlayer(sameSeat.id, sameSeat.id);
                        Net.sendState(connection, connection.peer);
                        Net.broadcast();
                        return;
                    }
                    const name = Utils.clean(data.name, 24, 'Player');
                    const token = Utils.clean(data.sessionToken, 80);
                    const reconnecting = token.length >= 6
                        ? Game.engine.state.players.find(player => player.sessionToken === token && !player.connected && !player.isBot)
                        : null;
                    if (reconnecting) {
                        App.connections[connection.peer] = connection;
                        App.connectionRoles[connection.peer] = { role: 'player', playerId: reconnecting.id };
                        Game.engine.reconnectPlayer(reconnecting.id, reconnecting.id);
                        Net.sendState(connection, connection.peer);
                        Net.broadcast();
                        return;
                    }
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
                        sessionToken: token,
                        connected: true,
                        isBot: false
                    });
                    if (!result.ok) {
                        connection.send({ type: 'JOIN_REJECTED', reason: result.reason });
                        return;
                    }
                    App.connections[connection.peer] = connection;
                    App.connectionRoles[connection.peer] = { role: 'player', playerId: connection.peer };
                    Net.sendState(connection, connection.peer);
                    Net.broadcast();
                    return;
                }
                if (data.type === 'SPECTATOR_PERSPECTIVE') {
                    Net.changeSpectatorPerspective(connection.peer, Number(data.direction) || 1);
                    return;
                }
                if (App.connectionRoles[connection.peer]?.role === 'spectator') return;
                if (data.type === 'ACTION') {
                    const actorId = App.connectionRoles[connection.peer]?.playerId || connection.peer;
                    const result = Game.engine.processAction(data.action, actorId);
                    if (!result?.ok) connection.send({ type: 'ACTION_REJECTED', reason: result?.reason || 'Action rejected.' });
                    Net.broadcast();
                }
            });
            connection.on('close', () => {
                if (App.connections[connection.peer] !== connection) return;
                const role = App.connectionRoles[connection.peer];
                const wasSpectator = role?.role === 'spectator';
                const playerId = role?.playerId || connection.peer;
                delete App.connections[connection.peer];
                if (!wasSpectator) {
                    Game.engine?.disconnectPlayer(playerId);
                }
                delete App.connectionRoles[connection.peer];
                delete App.spectators[connection.peer];
                Net.broadcast();
            });
        },

        receiveFromHost(data, hostId) {
            if (!data || typeof data !== 'object') return;
            if (data.type === 'STATE_UPDATE') {
                App.isSpectator = Boolean(data.state.spectatorMode);
                if (data.state.viewerId) App.localId = data.state.viewerId;
                if (data.state.phase === 'lobby') UI.showRoom(`Connected to ${hostId}`, false);
                UI.render(data.state);
            } else if (data.type === 'HOST_BACKUP' && data.state?.players) {
                App.hostBackup = { roomId: Utils.clean(data.roomId, 80), state: RoomTools.cloneState(data.state), hostPlayerId: Utils.clean(data.hostPlayerId, 80), vicePlayerId: Utils.clean(data.vicePlayerId, 80), allowSpectators: data.allowSpectators !== false };
                App.viceHostId = App.hostBackup.vicePlayerId;
            } else if (data.type === 'KICKED') {
                App.joinRejected = true; App.guestLink?.stop?.(); try { App.hostConnection?.close?.(); } catch (error) {}
                document.getElementById('join-id').value = hostId; document.getElementById('lobby-start').classList.remove('hidden'); document.getElementById('lobby-room').classList.add('hidden');
                RoomTools.ConnectionProgress.fail('Removed from this table', Utils.clean(data.reason, 160, 'The host removed you. You may join again.'), 'KICKED'); UI.resetLobbyButtons();
            } else if (data.type === 'JOIN_REJECTED') {
                App.joinRejected = true;
                Net.resetJoinAttempt();
                UI.showToast(data.reason || 'The host rejected this join.', 'danger');
            } else if (data.type === 'ACTION_REJECTED') {
                UI.showToast(data.reason || 'That move is not legal.', 'danger');
            }
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
                Net.sendState(connection, peerId);
            }
            Net.sendHostBackup();
            UI.render(Game.engine.getViewState(App.localId));
        },

        sendState(connection, peerId) {
            if (!connection || !Game.engine) return false;
            const role = App.connectionRoles[peerId] || { role: 'player' };
            const spectator = role.role === 'spectator';
            if (spectator && !Game.engine.state.players.some(player => player.id === role.perspectiveId)) {
                role.perspectiveId = Game.engine.state.players[0]?.id || null;
            }
            const perspectiveId = spectator ? (role.perspectiveId || Game.engine.state.players[0]?.id) : (role.playerId || peerId);
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
        }
    };

    const UI = {
        initialize() {
            const query = new URLSearchParams(window.location.search);
            const requestedGame = query.get('game');
            const joinId = query.get('join');
            const spectateInvite = query.get('spectate') === '1';
            if (requestedGame === 'bazunga') {
                const url = new URL('../index.html', window.location.href);
                url.searchParams.set('game', 'bazunga');
                if (joinId) url.searchParams.set('join', joinId);
                if (spectateInvite) url.searchParams.set('spectate', '1');
                window.location.replace(url.href);
                return;
            }
            if (requestedGame === 'president') {
                const url = new URL('../president/index.html', window.location.href);
                url.searchParams.set('game', 'president');
                if (joinId) url.searchParams.set('join', joinId);
                if (spectateInvite) url.searchParams.set('spectate', '1');
                window.location.replace(url.href);
                return;
            }
            if (requestedGame === 'hanafuda') {
                const hanafudaUrl = new URL('../hanafuda/index.html', window.location.href);
                hanafudaUrl.searchParams.set('game', 'hanafuda');
                if (joinId) hanafudaUrl.searchParams.set('join', joinId.replace(/[^a-zA-Z0-9-]/g, ''));
                if (spectateInvite) hanafudaUrl.searchParams.set('spectate', '1');
                window.location.replace(hanafudaUrl.href);
                return;
            }
            CardTheme.bind({
                selectIds: ['card-theme-select'],
                buttonIds: ['btn-card-theme'],
                assetBase: '../',
                onChange: () => App.gameState && UI.render(App.gameState)
            });
            const savedName = Utils.clean(localStorage.getItem('durak-player-name'), 24); if (savedName) document.getElementById('player-name').value = savedName;
            if (joinId) {
                const joinInput = document.getElementById('join-id');
                joinInput.value = joinId.replace(/[^a-zA-Z0-9_-]/g, '');
                joinInput.dataset.direct = '1';
            }

            document.getElementById('btn-host').onclick = event => {
                event.currentTarget.disabled = true;
                event.currentTarget.textContent = 'CONNECTING…';
                App.isHost = true;
                App.requestedRoomName = RoomTools.cleanRoomName(
                    document.getElementById('room-name').value,
                    `${document.getElementById('player-name').value || 'Durak'} ${Utils.uuid().slice(0, 4)}`
                );
                Net.initialize(document.getElementById('player-name').value);
            };
            document.getElementById('btn-join').onclick = event => {
                const input = document.getElementById('join-id');
                const room = RoomTools.resolveJoinId('durak', input.value, input.dataset.direct === '1');
                if (!room) return UI.showToast('Paste a Game ID first.', 'danger');
                event.currentTarget.disabled = true;
                event.currentTarget.textContent = 'JOINING…';
                App.isHost = false;
                Net.initialize(document.getElementById('player-name').value, room, false);
            };
            document.getElementById('btn-spectate').onclick = event => {
                const input = document.getElementById('join-id');
                const room = RoomTools.resolveJoinId('durak', input.value, input.dataset.direct === '1');
                if (!room) return UI.showToast('Enter a room name or invite first.', 'danger');
                event.currentTarget.disabled = true;
                event.currentTarget.textContent = 'CONNECTING...';
                App.isHost = false;
                Net.initialize(document.getElementById('player-name').value, room, true);
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
            document.getElementById('lobby-chat-send').onclick = UI.sendLobbyChat;
            document.getElementById('lobby-chat-input').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); UI.sendLobbyChat(); } });
            document.getElementById('btn-room-rename').onclick = () => UI.renamePlayer('room-player-name');
            document.getElementById('btn-game-rename').onclick = () => UI.renamePlayer('game-player-name');
            ['room-player-name', 'game-player-name'].forEach(id => document.getElementById(id).addEventListener('keydown', event => { if (event.key === 'Enter') UI.renamePlayer(id); }));
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
            window.addEventListener('orientationchange', () => {
                setTimeout(() => App.gameState && UI.render(App.gameState), 180);
            });
            if (joinId) document.getElementById(spectateInvite ? 'btn-spectate' : 'btn-join').click();
        },

        resetLobbyButtons() {
            const host = document.getElementById('btn-host');
            const join = document.getElementById('btn-join');
            host.disabled = false;
            host.textContent = 'CREATE A DURAK TABLE';
            join.disabled = false;
            join.textContent = 'JOIN';
            const spectate = document.getElementById('btn-spectate');
            spectate.disabled = false;
            spectate.textContent = 'SPECTATE';
        },

        showRoomCollision(roomName) {
            UI.showToast('That room name is already in use.', 'danger');
            RoomTools.showSuggestions(document.getElementById('room-name-suggestions'), roomName, suggestion => {
                document.getElementById('room-name').value = suggestion;
                document.getElementById('room-name-suggestions').classList.add('hidden');
                document.getElementById('btn-host').click();
            });
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
            RoomTools.configureInvite('durak', peerId, { qrContainer: container, copyButton: document.getElementById('btn-copy-invite'), size: 220, onCopy: copied => UI.showToast(copied ? 'Invite link copied.' : 'Could not copy the invite link.', copied ? 'success' : 'danger') });
        },

        addBot() {
            if (!App.isHost || !Game.engine || Game.engine.state.phase !== 'lobby') return;
            if (Game.engine.state.players.length >= MAX_PLAYERS) return UI.showToast('This table already has six players.', 'danger');
            const selection = HistoricalBots.parseSelection(document.getElementById('bot-difficulty').value, 1);
            const difficulty = selection.difficulty;
            if (difficulty === 5 && Game.engine.state.players.some(player => player.isBot && player.botDifficulty === 5)) {
                return UI.showToast('There is only one Baba Gupta.', 'danger');
            }
            if (selection.personaId && Game.engine.state.players.some(player => player.historicalPersona === selection.personaId)) {
                return UI.showToast(`There is only one ${selection.persona.displayName}.`, 'danger');
            }
            const existing = Game.engine.state.players.filter(player => player.isBot && player.botDifficulty === difficulty).length;
            const name = selection.persona?.displayName || `${BOT_NAMES[difficulty]}${existing ? ` ${existing + 1}` : ''}`;
            Game.engine.addPlayer({
                id: `bot-${difficulty}-${Utils.uuid()}`,
                name,
                isBot: true,
                botDifficulty: difficulty,
                historicalPersona: selection.personaId,
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
            UI.renderSpectatorControls(state);
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
                        ${App.isHost && !player.isBot && player.id !== App.localId ? `<button data-kick-player="${Utils.escape(player.id)}">${player.connected === false ? 'REMOVE' : 'KICK'}</button>` : ''}
                    </span>
                </div>
            `).join('');
            list.querySelectorAll('[data-remove-bot]').forEach(button => {
                button.onclick = () => {
                    Game.engine.removePlayer(button.dataset.removeBot);
                    Net.broadcast();
                };
            });
            list.querySelectorAll('[data-kick-player]').forEach(button => { button.onclick = () => Net.kickPlayer(button.dataset.kickPlayer); });
            UI.renderChat(state); UI.syncNameInputs(state);
            const start = document.getElementById('btn-start-game');
            if (start) {
                const activeCount = state.players.filter(player => player.isBot || player.connected !== false).length;
                start.disabled = activeCount < 2;
                start.textContent = activeCount < 2 ? 'ADD AT LEAST ONE OPPONENT' : `DEAL TO ${activeCount} PLAYERS`;
            }
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
                attack: state.pickupDeclared ? 'THROW IN' : 'ATTACK',
                defend: 'DEFEND',
                throw_in: 'PICKUP',
                waiting: 'WAITING',
                game_over: 'COMPLETE'
            };
            document.getElementById('phase-display').textContent = phaseNames[state.phase] || state.phase.toUpperCase();
            const me = state.players.find(player => player.id === App.localId);
            const attacker = state.players.find(player => player.id === state.attackTurnId);
            const defender = state.players.find(player => player.id === state.defenderId);
            let status;
            if (App.isSpectator) {
                const viewed = state.players.find(player => player.id === state.viewerId);
                status = `God view: ${viewed?.name || 'table'} perspective. Every hand is available.`;
            } else if (state.phase === 'waiting') {
                status = 'Waiting for a disconnected player. Their seat remains reserved for three skipped turns.';
            } else if (state.phase === 'game_over') {
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
                    <div class="opponent-seat ${player.id === state.attackTurnId ? 'current' : ''} ${player.id === state.defenderId ? 'defender' : ''} ${player.out ? 'out' : ''} ${!player.isBot && player.connected === false ? 'disconnected' : ''}"
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

        cardMarkup(card, classes = '', priority = 'public') {
            if (!card || card.hidden) return '<div class="playing-card card-back"></div>';
            return `
                <div class="playing-card ${card.isRed ? 'red' : ''} ${classes}" data-card-id="${Utils.escape(card.id)}">
                    ${CardTheme.faceMarkup(card, '../', { priority })}
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
            CardTheme.hydrate(container);
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
            CardTheme.hydrate(slot);
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
            CardTheme.preloadVisibleCards(sorted, { assetBase: '../', priority: 'hand' });
            const container = document.getElementById('local-hand');
            container.innerHTML = sorted.map(card =>
                UI.cardMarkup(card, `hand-card ${card.id === App.ui.selectedCardId ? 'selected' : ''}`, 'hand')
            ).join('');
            CardTheme.hydrate(container);
            container.querySelectorAll('.hand-card').forEach(cardElement => {
                if (App.isSpectator) return;
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
            const isDefender = !App.isSpectator && state.phase === 'defend' && state.defenderId === App.localId;
            const isAttacker = !App.isSpectator && ['attack', 'throw_in'].includes(state.phase) && state.attackTurnId === App.localId;
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
            CardTheme.hydrate(flight);
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
            const lobbyBox = document.getElementById('lobby-chat-messages');
            if (lobbyBox) { lobbyBox.innerHTML = box.innerHTML; lobbyBox.scrollTop = lobbyBox.scrollHeight; }
            UI.syncNameInputs(state);

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

        sendLobbyChat() { const input = document.getElementById('lobby-chat-input'); const message = Utils.clean(input.value, 240); if (!message) return; Net.sendAction({ type: 'CHAT', message }); input.value = ''; },
        renamePlayer(inputId) { const input = document.getElementById(inputId); const name = Utils.clean(input?.value, 24); if (!name) return UI.showToast('Enter a name first.', 'danger'); App.localName = name; localStorage.setItem('durak-player-name', name); Net.sendAction({ type: 'RENAME', name }); },
        syncNameInputs(state) { const me = state?.players?.find(player => player.id === App.localId); if (!me) return; App.localName = me.name; ['room-player-name', 'game-player-name'].forEach(id => { const input = document.getElementById(id); if (input && document.activeElement !== input) input.value = me.name; }); },

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
            url.search = '?game=durak';
            url.hash = '';
            window.location.replace(url.href);
        }
    };

    window.DurakApp = { App, Game, Net, UI, Utils };
    window.addEventListener('load', UI.initialize);
})();
