(function () {
    'use strict';

    const BOT_NAMES = { 1: 'Petal Pete [Casual]', 2: 'Ribbon Ronin [Clever]', 3: 'Moon Fox [Hard]', 4: 'Akahana [Expert]', 5: 'Baba Gupta' };
    const Utils = {
        id: () => Math.random().toString(36).slice(2, 11),
        clean: (value, maximum = 240, fallback = '') => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximum) || fallback,
        escape: value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]),
        messageDuration: message => Math.min(9500, 4200 + String(message || '').length * 36)
    };

    const App = {
        isHost: false, offlineHost: false, localId: null, localName: '', sessionToken: '', peer: null,
        peerOpenTimer: null, hostConnection: null, guestLink: null, roomRelay: null, fallbackClientId: '', transport: '',
        connections: {}, connectionRoles: {}, spectators: {}, allowSpectators: true, isSpectator: false,
        requestedSpectator: false, requestedRoomName: '', hostId: '', reconnectTimer: null, leaving: false,
        joinRejected: false, hostBackup: null, viceHostId: null, promotionTimer: null, lastBackupSignature: '', gameState: null,
        ui: { lastLogId: 0, lastActionNonce: null, chatOpen: false, dismissedRound: null }
    };
    const Game = { engine: null, bots: null };

    const Net = {
        resetJoinAttempt(resetButtons = true) {
            clearTimeout(App.peerOpenTimer); clearTimeout(App.reconnectTimer); clearTimeout(App.promotionTimer);
            App.guestLink?.stop?.(); App.guestLink = null;
            try { App.hostConnection?.close?.(); } catch (error) {}
            try { App.peer?.destroy?.(); } catch (error) {}
            App.hostConnection = null; App.peer = null; App.localId = null; App.hostId = ''; App.transport = ''; App.reconnectTimer = null; App.promotionTimer = null;
            if (resetButtons) UI.resetLobbyButtons();
        },

        initialize(name, hostId = null, spectator = false) {
            App.localName = Utils.clean(name, 24, `Player ${Math.floor(Math.random() * 1000)}`);
            App.requestedSpectator = Boolean(spectator); App.isSpectator = Boolean(spectator); App.joinRejected = false;
            App.sessionToken = String(localStorage.getItem('hanafuda_token') || Utils.id()).slice(0, 80);
            localStorage.setItem('hanafuda_token', App.sessionToken);
            if (!App.isHost) {
                App.fallbackClientId = Utils.id();
                RoomTools.ConnectionProgress.start({ spectator, roomId: hostId, retry: () => { Net.resetJoinAttempt(); App.isHost = false; Net.initialize(App.localName, hostId, spectator); } });
            }
            if (App.isHost && (!navigator.onLine || typeof Peer !== 'function')) return Net.openOfflineHost();
            if (typeof Peer !== 'function') { App.localId = App.fallbackClientId; return Net.connectToHost(hostId); }
            try {
                App.peer = new Peer(App.isHost ? RoomTools.makeRoomId('hanafuda', App.requestedRoomName) : App.fallbackClientId, RoomTools.peerOptions());
            } catch (error) {
                if (App.isHost) return Net.openOfflineHost();
                App.peer = null; App.localId = App.fallbackClientId; return Net.connectToHost(hostId);
            }
            App.peerOpenTimer = setTimeout(() => {
                if (App.localId) return;
                if (App.isHost) return Net.openOfflineHost();
                try { App.peer?.destroy(); } catch (error) {}
                App.peer = null; App.localId = App.fallbackClientId; Net.connectToHost(hostId);
            }, RoomTools.PEER_OPEN_TIMEOUT_MS);
            App.peer.on('open', peerId => {
                clearTimeout(App.peerOpenTimer);
                if (App.isHost) Net.createHost(peerId, false);
                else { App.localId = peerId; RoomTools.ConnectionProgress.step('room', 'Room service reached. Locating the host…'); Net.connectToHost(hostId); }
            });
            App.peer.on('connection', connection => Net.acceptConnection(connection));
            App.peer.on('disconnected', () => { if (!App.peer?.destroyed) try { App.peer.reconnect(); } catch (error) {} });
            App.peer.on('error', error => {
                clearTimeout(App.peerOpenTimer);
                if (App.isHost && !App.localId && RoomTools.isNameCollision(error)) {
                    try { App.peer?.destroy(); } catch (ignore) {}
                    App.peer = null; UI.showRoomCollision(App.requestedRoomName); UI.resetLobbyButtons(); return;
                }
                if (App.isHost && !App.localId) return Net.openOfflineHost();
                if (!App.localId && !App.guestLink) { try { App.peer?.destroy(); } catch (ignore) {} App.peer = null; App.localId = App.fallbackClientId; Net.connectToHost(hostId); }
            });
        },

        openOfflineHost() {
            if (App.localId) return;
            clearTimeout(App.peerOpenTimer); try { App.peer?.destroy(); } catch (error) {} App.peer = null;
            Net.createHost(`offline-${Utils.id()}`, true);
        },

        createHost(peerId, offline = false) {
            if (Game.engine) return;
            App.localId = peerId; App.hostId = peerId; App.offlineHost = offline;
            App.allowSpectators = document.getElementById('allow-spectators').checked;
            Game.engine = new HanafudaGameEngine({ makeId: Utils.id, onEvent: (event, state) => Game.bots?.handleEvent(event, state), onChange: () => Net.broadcast() });
            Game.bots = new HanafudaBotController(Game.engine); Game.bots.start();
            Game.engine.addPlayer({ id: peerId, name: App.localName, sessionToken: App.sessionToken, isHost: true, connected: true });
            document.getElementById('lobby-start').classList.add('hidden'); document.getElementById('lobby-room').classList.remove('hidden'); document.getElementById('host-controls').classList.remove('hidden');
            document.getElementById('room-id-display').textContent = offline ? 'OFFLINE · BOTS ONLY' : peerId;
            document.getElementById('qr-container').classList.toggle('hidden', offline);
            if (!offline) { UI.renderQr(peerId); Net.startHostRelay(peerId); }
            Net.broadcast();
        },

        async startHostRelay(peerId) {
            try {
                const relay = await RoomTools.RoomRelay.host(peerId, connection => Net.acceptConnection(connection));
                if (!App.isHost || App.hostId !== peerId || App.leaving) return relay.close();
                App.roomRelay?.close?.(); App.roomRelay = relay;
            } catch (error) { console.warn('Cloud fallback unavailable; direct play remains active.', error); }
        },

        connectToHost(hostId) {
            const safeHostId = Utils.clean(hostId, 80).replace(/[^a-zA-Z0-9_-]/g, '');
            if (!safeHostId) { RoomTools.ConnectionProgress.fail('Invalid room', 'Enter a valid room name or invite.', 'INVALID_ROOM'); UI.resetLobbyButtons(); return; }
            App.hostId = safeHostId; App.guestLink?.stop?.();
            App.guestLink = RoomTools.ResilientJoin.connect({
                hostId: safeHostId, peerId: App.fallbackClientId || App.localId, peer: App.peer,
                joinPayload: { type: 'JOIN', name: App.localName, sessionToken: App.sessionToken, role: App.requestedSpectator ? 'spectator' : 'player' },
                onConnection: (connection, transport) => { App.hostConnection = connection; App.transport = transport; },
                onReady: () => { document.getElementById('lobby-start').classList.add('hidden'); document.getElementById('lobby-room').classList.remove('hidden'); document.getElementById('client-waiting').classList.remove('hidden'); document.getElementById('room-id-display').textContent = `Connected to ${safeHostId}`; document.getElementById('qr-container').classList.remove('hidden'); UI.renderQr(safeHostId); },
                onData: data => Net.receiveHostData(data),
                onDrop: () => { if (!App.leaving && !App.joinRejected) { if (App.hostBackup?.vicePlayerId === App.localId) { UI.showToast('Host left. Taking over the flower table…', 'danger'); Net.schedulePromotion(safeHostId); } else { UI.showToast('Connection dropped. Rejoining your flower cards…', 'danger'); Net.scheduleReconnect(safeHostId); } } },
                onFailure: ({ detail }) => { UI.showToast(detail, 'danger'); Net.resetJoinAttempt(); }
            });
        },

        scheduleReconnect(hostId) {
            if (App.leaving || App.isHost || App.reconnectTimer) return;
            App.reconnectTimer = setTimeout(() => { App.reconnectTimer = null; if (!App.leaving) Net.connectToHost(hostId); }, 1700);
        },

        schedulePromotion(hostId) {
            if (App.leaving || App.isHost || App.promotionTimer) return;
            App.promotionTimer = setTimeout(() => { App.promotionTimer = null; Net.promoteFromBackup(hostId); }, 1100);
        },

        promoteFromBackup(hostId) {
            const backup = App.hostBackup;
            if (!backup?.state || backup.vicePlayerId !== App.localId) { Net.scheduleReconnect(hostId); return false; }
            const stablePlayerId = App.localId;
            App.guestLink?.stop?.(); App.guestLink = null;
            try { App.hostConnection?.close?.(); } catch (error) {} App.hostConnection = null;
            try { App.peer?.destroy?.(); } catch (error) {} App.peer = null;
            Game.bots?.stop?.();
            App.isHost = true; App.offlineHost = false; App.hostId = hostId; App.connections = {}; App.connectionRoles = {}; App.spectators = {}; App.allowSpectators = backup.allowSpectators !== false; App.lastBackupSignature = '';
            Game.engine = new HanafudaGameEngine({ makeId: Utils.id, onEvent: (event, state) => Game.bots?.handleEvent(event, state), onChange: () => Net.broadcast() });
            Game.engine.state = RoomTools.cloneState(backup.state);
            const oldHost = Game.engine.getPlayer(backup.hostPlayerId); if (oldHost?.connected !== false) Game.engine.disconnectPlayer(oldHost.id);
            Game.engine.setHost(stablePlayerId);
            Game.bots = new HanafudaBotController(Game.engine); Game.bots.start();
            document.getElementById('host-controls').classList.remove('hidden'); document.getElementById('client-waiting').classList.add('hidden'); document.getElementById('allow-spectators').checked = App.allowSpectators; document.getElementById('room-id-display').textContent = hostId; document.getElementById('qr-container').classList.remove('hidden'); UI.renderQr(hostId);
            Net.startHostRelay(hostId); Net.broadcast();
            if (typeof Peer === 'function') try {
                const peer = new Peer(hostId, RoomTools.peerOptions()); App.peer = peer;
                peer.on('open', () => UI.showToast('You are now the host. The match continued.', 'success'));
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
            const state = Game.engine.state; const signature = [vice.id, state.phase, state.roundNumber, state.lastAction?.nonce || '', state.nextLogId, state.players.map(player => `${player.id}:${player.connected !== false}:${player.isHost}`).join('|')].join(':');
            if (signature === App.lastBackupSignature) return; App.lastBackupSignature = signature;
            try { connection.send({ type: 'HOST_BACKUP', roomId: App.hostId, state: RoomTools.cloneState(state), hostPlayerId: App.localId, vicePlayerId: vice.id, allowSpectators: App.allowSpectators }); } catch (error) {}
        },

        kickPlayer(playerId) {
            if (!App.isHost || !playerId || playerId === App.localId) return false;
            const entry = Object.entries(App.connectionRoles).find(([, role]) => role?.role === 'player' && role.playerId === playerId);
            const transportId = entry?.[0]; const connection = App.connections[transportId];
            try { connection?.send?.({ type: 'KICKED', reason: 'The host removed you from this table. You can join again whenever you want.' }); } catch (error) {}
            if (Game.engine?.state.phase === 'lobby') { Game.engine.removePlayer(playerId); if (transportId) { delete App.connections[transportId]; delete App.connectionRoles[transportId]; } setTimeout(() => { try { connection?.close?.(); } catch (error) {} }, 180); Net.broadcast(); return true; }
            if (!entry) return false;
            const player = Game.engine?.getPlayer(playerId); if (player?.connected !== false) Game.engine.disconnectPlayer(playerId);
            setTimeout(() => { try { connection?.close?.(); } catch (error) {} }, 180);
            return true;
        },

        acceptConnection(connection) {
            if (!App.isHost) return;
            connection.on('data', data => {
                if (data?.type === 'ROOM_PING') {
                    if (connection.open) connection.send({ type: 'ROOM_PONG', sentAt: data.sentAt || Date.now() });
                    return;
                }
                if (data?.type === 'JOIN') return Net.handleJoin(connection, data);
                if (data?.type === 'SPECTATOR_PERSPECTIVE') return Net.changeSpectatorPerspective(connection.peer, Number(data.direction) || 1);
                if (App.connectionRoles[connection.peer]?.role === 'spectator') return;
                const actorId = App.connectionRoles[connection.peer]?.playerId || connection.peer;
                const result = Game.engine?.processAction(data, actorId);
                if (result && !result.ok && connection.open) connection.send({ type: 'ACTION_REJECTED', reason: result.reason });
            });
            connection.on('close', () => {
                if (App.connections[connection.peer] !== connection) return;
                const role = App.connectionRoles[connection.peer]; const spectator = role?.role === 'spectator'; const playerId = role?.playerId || connection.peer;
                delete App.connections[connection.peer]; delete App.connectionRoles[connection.peer]; delete App.spectators[connection.peer];
                spectator ? Net.broadcast() : (Game.engine?.getPlayer(playerId)?.connected !== false && Game.engine?.disconnectPlayer(playerId));
            });
        },

        handleJoin(connection, data) {
            if (!Game.engine) return;
            const state = Game.engine.state;
            if (data.role === 'spectator') {
                if (!App.allowSpectators) return connection.send({ type: 'JOIN_REJECTED', reason: 'Spectators are disabled for this table.' });
                const perspectiveId = state.players[0]?.id || null;
                App.connections[connection.peer] = connection; App.connectionRoles[connection.peer] = { role: 'spectator', perspectiveId };
                App.spectators[connection.peer] = { id: connection.peer, name: Utils.clean(data.name, 24, 'Spectator'), perspectiveId };
                Net.sendState(connection, connection.peer); Net.broadcast(); return;
            }
            const sameSeat = state.players.find(player => player.id === connection.peer);
            if (sameSeat) { App.connections[connection.peer] = connection; App.connectionRoles[connection.peer] = { role: 'player', playerId: sameSeat.id }; if (!sameSeat.connected) Game.engine.reconnectPlayer(sameSeat.id, sameSeat.id); Net.sendState(connection, connection.peer); Net.broadcast(); return; }
            const token = Utils.clean(data.sessionToken, 80);
            const returning = token.length >= 6 ? state.players.find(player => player.sessionToken === token && !player.connected && !player.isBot) : null;
            if (returning) { App.connections[connection.peer] = connection; App.connectionRoles[connection.peer] = { role: 'player', playerId: returning.id }; Game.engine.reconnectPlayer(returning.id, returning.id); Net.sendState(connection, connection.peer); Net.broadcast(); return; }
            if (state.phase !== 'lobby') return connection.send({ type: 'JOIN_REJECTED', reason: 'This match is already in progress. Join as a spectator instead.' });
            if (state.players.length >= 2) return connection.send({ type: 'JOIN_REJECTED', reason: 'Koi-Koi has exactly two player seats.' });
            let name = Utils.clean(data.name, 24, 'Player');
            if (state.players.some(player => player.name.toLowerCase() === name.toLowerCase())) name = `${name.slice(0, 22)} 2`;
            App.connections[connection.peer] = connection; App.connectionRoles[connection.peer] = { role: 'player', playerId: connection.peer };
            Game.engine.addPlayer({ id: connection.peer, name, sessionToken: token, connected: true }); Net.sendState(connection, connection.peer);
        },

        receiveHostData(data) {
            if (data?.type === 'STATE_UPDATE' && data.state?.players && data.state?.field) {
                App.isSpectator = Boolean(data.state.spectatorMode); if (data.state.viewerId) App.localId = data.state.viewerId;
                App.gameState = data.state; UI.render(data.state); return;
            }
            if (data?.type === 'HOST_BACKUP' && data.state?.players) { App.hostBackup = { roomId: Utils.clean(data.roomId, 80), state: RoomTools.cloneState(data.state), hostPlayerId: Utils.clean(data.hostPlayerId, 80), vicePlayerId: Utils.clean(data.vicePlayerId, 80), allowSpectators: data.allowSpectators !== false }; App.viceHostId = App.hostBackup.vicePlayerId; return; }
            if (data?.type === 'KICKED') { const roomId = App.hostId; App.joinRejected = true; App.guestLink?.stop?.(); try { App.hostConnection?.close?.(); } catch (error) {} document.getElementById('join-id').value = roomId; document.getElementById('lobby-start').classList.remove('hidden'); document.getElementById('lobby-room').classList.add('hidden'); RoomTools.ConnectionProgress.fail('Removed from this table', Utils.clean(data.reason, 160, 'The host removed you. You may join again.'), 'KICKED'); UI.resetLobbyButtons(); return; }
            if (data?.type === 'ACTION_REJECTED') UI.showToast(Utils.clean(data.reason, 160, 'Action rejected.'), 'danger');
            if (data?.type === 'JOIN_REJECTED') { App.joinRejected = true; UI.showToast(Utils.clean(data.reason, 160, 'Unable to join.'), 'danger'); document.getElementById('lobby-start').classList.remove('hidden'); document.getElementById('lobby-room').classList.add('hidden'); Net.resetJoinAttempt(); }
        },

        broadcast() {
            if (!App.isHost || !Game.engine) return;
            Object.entries(App.connections).forEach(([peerId, connection]) => Net.sendState(connection, peerId));
            Net.sendHostBackup();
            App.gameState = Game.engine.getViewState(App.localId); UI.render(App.gameState);
        },

        sendState(connection, peerId) {
            if (!connection?.open || !Game.engine) return false;
            const role = App.connectionRoles[peerId] || { role: 'player' };
            const spectator = role.role === 'spectator';
            if (spectator && !Game.engine.getPlayer(role.perspectiveId)) role.perspectiveId = Game.engine.state.players[0]?.id;
            const perspectiveId = spectator ? role.perspectiveId : (role.playerId || peerId);
            const state = Game.engine.getViewState(perspectiveId, spectator);
            if (spectator) { state.spectatorMode = true; state.spectatorCount = Object.keys(App.spectators).length; }
            try { connection.send({ type: 'STATE_UPDATE', state }); return true; } catch (error) { return false; }
        },

        changeSpectatorPerspective(peerId, direction) {
            const role = App.connectionRoles[peerId];
            if (role?.role !== 'spectator' || !Game.engine?.state.players.length) return;
            const players = Game.engine.state.players; const current = Math.max(0, players.findIndex(player => player.id === role.perspectiveId));
            role.perspectiveId = players[(current + (direction < 0 ? -1 : 1) + players.length) % players.length].id;
            Net.sendState(App.connections[peerId], peerId);
        },

        sendAction(action) {
            if (App.isSpectator) {
                if (action?.type === 'SPECTATOR_PERSPECTIVE' && App.hostConnection?.open) { App.hostConnection.send(action); return { ok: true }; }
                UI.showToast('Spectators can see every card but cannot play.', 'danger'); return { ok: false };
            }
            if (App.isHost) { const result = Game.engine?.processAction(action, App.localId); if (result && !result.ok) UI.showToast(result.reason, 'danger'); return result; }
            if (App.hostConnection?.open) { App.hostConnection.send(action); return { ok: true, pending: true }; }
            UI.showToast('The host is not connected.', 'danger'); return { ok: false };
        }
    };

    const GLYPHS = { crane: '鶴', 'ribbon-poetry': 'あ', chaff: '✿', warbler: '鳥', curtain: '幕', cuckoo: '鳥', 'ribbon-red': '短', bridge: '橋', butterfly: '蝶', 'ribbon-blue': '青', boar: '猪', moon: '月', geese: '雁', sake: '盃', deer: '鹿', 'rain-man': '雨', swallow: '燕', lightning: '⚡', phoenix: '鳳' };
    const UI = {
        initialize() {
            const query = new URLSearchParams(location.search); const joinId = query.get('join'); const spectate = query.get('spectate') === '1'; const game = query.get('game');
            const routes = { bazunga: '../index.html', president: '../president/index.html', durak: '../durak/index.html' };
            if (routes[game]) { const url = new URL(routes[game], location.href); url.searchParams.set('game', game); if (joinId) url.searchParams.set('join', joinId); if (spectate) url.searchParams.set('spectate', '1'); location.replace(url.href); return; }
            const savedBack = localStorage.getItem('hanafuda_card_back') || 'hana-red'; document.getElementById('card-back-select').value = savedBack; UI.setCardBack(savedBack);
            const savedFront = localStorage.getItem('hanafuda_card_front') || 'original'; document.getElementById('card-front-select').value = savedFront; UI.setCardFront(savedFront);
            const savedName = Utils.clean(localStorage.getItem('hanafuda_player_name'), 24); if (savedName) document.getElementById('player-name').value = savedName;
            if (joinId) { const input = document.getElementById('join-id'); input.value = joinId.replace(/[^a-zA-Z0-9_-]/g, ''); input.dataset.direct = '1'; }
            document.getElementById('btn-host').onclick = event => { event.currentTarget.disabled = true; event.currentTarget.textContent = 'CONNECTING…'; App.isHost = true; App.requestedRoomName = RoomTools.cleanRoomName(document.getElementById('room-name').value, `${document.getElementById('player-name').value || 'Koi'} ${Utils.id().slice(0, 4)}`); Net.initialize(document.getElementById('player-name').value); };
            document.getElementById('btn-join').onclick = event => UI.join(event, false);
            document.getElementById('btn-spectate').onclick = event => UI.join(event, true);
            document.getElementById('join-id').oninput = event => delete event.currentTarget.dataset.direct;
            document.getElementById('allow-spectators').onchange = event => { App.allowSpectators = event.currentTarget.checked; Net.broadcast(); };
            document.getElementById('btn-add-bot').onclick = UI.addBot; document.getElementById('btn-start-game').onclick = UI.startGame;
            document.getElementById('viewing-yaku').onchange = event => { document.getElementById('busted-viewing').disabled = !event.currentTarget.checked; if (!event.currentTarget.checked) document.getElementById('busted-viewing').checked = false; };
            document.getElementById('card-back-select').onchange = event => { UI.setCardBack(event.currentTarget.value); localStorage.setItem('hanafuda_card_back', event.currentTarget.value); };
            document.getElementById('card-front-select').onchange = event => { UI.setCardFront(event.currentTarget.value); localStorage.setItem('hanafuda_card_front', event.currentTarget.value); };
            document.getElementById('spectator-prev').onclick = () => Net.sendAction({ type: 'SPECTATOR_PERSPECTIVE', direction: -1 }); document.getElementById('spectator-next').onclick = () => Net.sendAction({ type: 'SPECTATOR_PERSPECTIVE', direction: 1 });
            document.getElementById('btn-koi').onclick = () => Net.sendAction({ type: 'KOI_KOI' }); document.getElementById('btn-shobu').onclick = () => Net.sendAction({ type: 'SHOBU' });
            ['btn-open-rules', 'btn-room-rules', 'btn-table-rules'].forEach(id => document.getElementById(id).onclick = UI.openRules);
            document.getElementById('btn-close-rules').onclick = UI.closeRules; document.getElementById('btn-rules-done').onclick = UI.closeRules; document.getElementById('modal-overlay').onclick = UI.closeTopModal;
            document.getElementById('chat-fab').onclick = () => UI.setChatOpen(true); document.getElementById('chat-close').onclick = () => UI.setChatOpen(false); document.getElementById('chat-send').onclick = UI.sendChat;
            document.getElementById('chat-input').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); UI.sendChat(); } else if (event.key === 'Escape') UI.setChatOpen(false); };
            document.getElementById('lobby-chat-send').onclick = UI.sendLobbyChat; document.getElementById('lobby-chat-input').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); UI.sendLobbyChat(); } };
            document.getElementById('btn-room-rename').onclick = () => UI.renamePlayer('room-player-name'); document.getElementById('btn-game-rename').onclick = () => UI.renamePlayer('game-player-name');
            ['room-player-name', 'game-player-name'].forEach(id => document.getElementById(id).onkeydown = event => { if (event.key === 'Enter') UI.renamePlayer(id); });
            document.getElementById('btn-view-table').onclick = UI.hideResult; document.getElementById('btn-leave-game').onclick = UI.leaveGame;
            document.addEventListener('keydown', event => { if (event.key === 'Escape') UI.closeTopModal(); });
            window.addEventListener('orientationchange', () => setTimeout(() => App.gameState && UI.render(App.gameState), 180));
            if (joinId) document.getElementById(spectate ? 'btn-spectate' : 'btn-join').click();
        },

        join(event, spectator) {
            const input = document.getElementById('join-id'); const hostId = RoomTools.resolveJoinId('hanafuda', input.value, input.dataset.direct === '1');
            if (!hostId) return UI.showToast('Enter a room name or invite.', 'danger');
            event.currentTarget.disabled = true; event.currentTarget.textContent = spectator ? 'CONNECTING…' : 'JOINING…'; App.isHost = false; Net.initialize(document.getElementById('player-name').value, hostId, spectator);
        },
        setCardBack(value) { document.documentElement.dataset.hanafudaBack = ['hana-red', 'svg-red', 'svg-blue', 'classic'].includes(value) ? value : 'hana-red'; },
        setCardFront(value) { document.documentElement.dataset.hanafudaFront = ['original', 'invert', 'white-red'].includes(value) ? value : 'original'; },
        resetLobbyButtons() { const values = [['btn-host', 'CREATE A TABLE'], ['btn-join', 'JOIN'], ['btn-spectate', 'SPECTATE']]; values.forEach(([id, label]) => { const button = document.getElementById(id); button.disabled = false; button.textContent = label; }); },
        showRoomCollision(name) { UI.showToast('That room name is already in use.', 'danger'); RoomTools.showSuggestions(document.getElementById('room-name-suggestions'), name, choice => { document.getElementById('room-name').value = choice; document.getElementById('room-name-suggestions').classList.add('hidden'); document.getElementById('btn-host').click(); }); },
        renderQr(peerId) { const container = document.getElementById('qr-container'); RoomTools.configureInvite('hanafuda', peerId, { qrContainer: container, copyButton: document.getElementById('btn-copy-invite'), size: 220, onCopy: copied => UI.showToast(copied ? 'Invite link copied.' : 'Could not copy the invite link.', copied ? 'success' : 'danger') }); },

        addBot() {
            if (!App.isHost || !Game.engine || Game.engine.state.phase !== 'lobby') return;
            if (Game.engine.state.players.length >= 2) return UI.showToast('Koi-Koi has exactly two seats.', 'danger');
            const difficulty = Number(document.getElementById('bot-difficulty').value) || 1;
            Game.engine.addPlayer({ id: `bot-${Utils.id()}`, name: BOT_NAMES[difficulty], isBot: true, botDifficulty: difficulty, connected: true });
        },
        startGame() {
            if (!App.isHost || !Game.engine) return;
            const result = Game.engine.startGame({ rounds: Number(document.getElementById('round-count').value), viewingYaku: document.getElementById('viewing-yaku').checked, bustedViewing: document.getElementById('busted-viewing').checked, cardBack: document.getElementById('card-back-select').value, cardFront: document.getElementById('card-front-select').value });
            if (!result.ok) UI.showToast(result.reason, 'danger');
        },

        render(state) {
            App.gameState = state; UI.setCardBack(state.settings?.cardBack || document.documentElement.dataset.hanafudaBack); UI.setCardFront(state.settings?.cardFront || document.documentElement.dataset.hanafudaFront); UI.renderLogs(state);
            if (state.phase === 'lobby') return UI.renderLobby(state);
            document.getElementById('lobby').classList.add('hidden'); document.getElementById('game-view').classList.remove('hidden');
            UI.renderSpectator(state); UI.renderStatus(state); UI.renderOpponent(state); UI.renderField(state); UI.renderCaptures(state); UI.renderHand(state); UI.renderActions(state); UI.renderResult(state); UI.animateAction(state);
        },
        renderLobby(state) {
            const list = document.getElementById('lobby-players'); list.innerHTML = state.players.map(player => `<div class="lobby-player"><div><strong>${Utils.escape(player.name)}</strong><span>${player.isHost ? 'Host · Oya candidate' : player.isBot ? `Bot · Level ${player.botDifficulty}` : player.connected === false ? 'Player · Offline' : 'Player'}</span></div>${App.isHost && player.isBot ? `<button class="secondary remove-bot" data-id="${Utils.escape(player.id)}">REMOVE</button>` : ''}${App.isHost && !player.isBot && player.id !== App.localId ? `<button class="kick-player" data-id="${Utils.escape(player.id)}">${player.connected === false ? 'REMOVE' : 'KICK'}</button>` : ''}</div>`).join('');
            list.querySelectorAll('.remove-bot').forEach(button => button.onclick = () => Game.engine?.removePlayer(button.dataset.id));
            list.querySelectorAll('.kick-player').forEach(button => button.onclick = () => Net.kickPlayer(button.dataset.id)); UI.syncNameInputs(state);
        },
        renderSpectator(state) { const controls = document.getElementById('spectator-controls'); controls.classList.toggle('hidden', !App.isSpectator); if (App.isSpectator) { const player = state.players.find(item => item.id === state.viewerId); document.getElementById('spectator-label').textContent = `GOD VIEW · ${player?.name || 'TABLE'}`; } },
        renderStatus(state) {
            const active = state.players.find(player => player.id === state.turnPlayerId); const me = state.players.find(player => player.id === App.localId); const opponent = state.players.find(player => player.id !== me?.id);
            document.getElementById('month-display').textContent = `MONTH ${state.roundNumber} / ${state.settings.rounds}`;
            let status = active ? `${active.name}'s turn` : 'Round complete';
            if (state.phase === 'WAIT_HAND_SELECTION' && active?.id === App.localId && !App.isSpectator) status = 'Your turn · choose a card from your hand';
            if (state.phase.includes('CAPTURE') && state.pending?.playerId === App.localId && !App.isSpectator) status = 'Choose which matching field card to capture';
            if (state.phase === 'WAIT_KOI_KOI_CHOICE') status = state.pending?.playerId === App.localId ? 'Yaku! Koi-Koi or Shobu?' : `${active?.name || 'Opponent'} is weighing the risk…`;
            document.getElementById('status-text').textContent = status;
            const thinkers = state.players.filter(player => state.thinkingBots.includes(player.id)).map(player => `${player.name} is thinking…`); const typers = state.players.filter(player => state.typingBots.includes(player.id)).map(player => `${player.name} is typing…`);
            document.getElementById('activity-text').textContent = [...thinkers, ...typers].join(' · ');
            document.getElementById('scoreboard').innerHTML = [me, opponent].filter(Boolean).map(player => `<span class="score-pill ${player.id === state.dealerId ? 'active' : ''}">${Utils.escape(player.name)} · ${player.score} ${player.id === state.dealerId ? '· OYA' : ''}</span>`).join('');
        },
        renderOpponent(state) {
            const me = state.players.find(player => player.id === App.localId); const opponent = state.players.find(player => player.id !== me?.id); if (!opponent) return;
            const meta = document.getElementById('opponent-name'); meta.textContent = opponent.name; meta.classList.toggle('turn-dot', opponent.id === state.turnPlayerId); document.getElementById('opponent-score').textContent = `${opponent.score} pts`;
            document.getElementById('opponent-hand').innerHTML = opponent.hand.map(card => card.hidden ? '<div class="hana-card card-back"></div>' : UI.cardMarkup(card, false)).join('');
        },
        renderField(state) {
            const groups = HanafudaRules.byMonth(state.field); const choiceIds = new Set(state.pending?.playerId === App.localId ? state.pending.choiceIds || [] : []);
            document.getElementById('field-cards').innerHTML = Object.values(groups).sort((a, b) => a[0].month - b[0].month).map(group => `<div class="month-stack ${group.length === 3 ? 'three' : ''} ${group.some(card => choiceIds.has(card.id)) ? 'choice' : ''}">${group.map(card => UI.cardMarkup(card, choiceIds.has(card.id), 'field')).join('')}</div>`).join('');
            document.getElementById('deck-count').textContent = state.deckCount;
            if (choiceIds.size && !App.isSpectator) UI.openCaptureChoice(state);
            else UI.closeCaptureChoice();
        },
        renderCaptures(state) {
            const me = state.players.find(player => player.id === App.localId); const opponent = state.players.find(player => player.id !== me?.id);
            document.getElementById('local-captures').innerHTML = UI.captureGroups(me?.captured || []); document.getElementById('opponent-captures').innerHTML = UI.captureGroups(opponent?.captured || []);
        },
        captureGroups(cards) {
            const groups = ['Bright', 'Animal', 'Ribbon', 'Chaff'].map(category => ({ category, cards: cards.filter(card => card.categories?.includes(category)) })).filter(group => group.cards.length);
            return groups.map(group => `<div class="capture-group" title="${group.category}: ${group.cards.length}">${group.cards.slice(0, 8).map((card, index) => UI.cardMarkup(card, false, 'capture', index)).join('')}</div>`).join('');
        },
        renderHand(state) {
            const me = state.players.find(player => player.id === App.localId); const hand = document.getElementById('local-hand'); if (!me) return hand.replaceChildren();
            const canPlay = !App.isSpectator && state.phase === 'WAIT_HAND_SELECTION' && state.turnPlayerId === App.localId && me.connected !== false;
            const sorted = [...me.hand].sort((a, b) => a.month - b.month || HanafudaRules.cardPriority(b) - HanafudaRules.cardPriority(a));
            hand.innerHTML = sorted.map(card => UI.cardMarkup(card, canPlay, 'hand')).join(''); document.getElementById('hand-count').textContent = `${me.hand.length} card${me.hand.length === 1 ? '' : 's'}`;
            hand.querySelectorAll('button[data-card-id]').forEach(button => button.onclick = () => Net.sendAction({ type: 'PLAY_HAND_CARD', cardId: button.dataset.cardId }));
        },
        cardMarkup(card, interactive = false, locationName = '', index = 0) {
            if (card.hidden) return '<div class="hana-card card-back"></div>';
            const tag = interactive ? 'button' : 'div'; const attrs = interactive ? `type="button" data-card-id="${Utils.escape(card.id)}" aria-label="Play ${Utils.escape(card.name)} from ${card.monthName}"` : '';
            const art = card.asset ? `<img class="hana-art" src="${Utils.escape(card.asset)}" alt="" draggable="false">` : '';
            return `<${tag} class="hana-card ${interactive ? 'playable' : ''} ${locationName === 'capture' ? 'capture-card' : ''}" ${attrs} data-month="${card.month}" data-category="${Utils.escape((card.categories || []).join(' '))}" style="--index:${index}"><div class="hana-face">${art}<span class="month-number">${card.month}</span><span class="motif-glyph">${GLYPHS[card.motif] || '花'}</span><span class="motif-name">${Utils.escape(card.name)}</span></div></${tag}>`;
        },
        renderActions(state) {
            const panel = document.getElementById('action-panel'); const choice = document.getElementById('choice-actions'); const mine = state.turnPlayerId === App.localId && !App.isSpectator;
            panel.classList.toggle('hidden', !mine || ['END_ROUND', 'MATCH_OVER'].includes(state.phase)); choice.classList.toggle('hidden', !(mine && state.phase === 'WAIT_KOI_KOI_CHOICE'));
            if (mine && state.phase === 'WAIT_HAND_SELECTION') { document.getElementById('turn-prompt').textContent = 'Choose one card from your hand.'; document.getElementById('selection-feedback').textContent = 'A matching month captures; the deck then draws automatically.'; }
            if (mine && state.phase.includes('CAPTURE')) { document.getElementById('turn-prompt').textContent = 'Two cards match. Choose one to capture.'; document.getElementById('selection-feedback').textContent = 'The other card stays on the field.'; }
            if (mine && state.phase === 'WAIT_KOI_KOI_CHOICE') { const evaluation = state.pending.evaluation; document.getElementById('turn-prompt').textContent = `${evaluation.yaku.map(item => item.name).join(' + ')} · ${evaluation.points} base`; document.getElementById('selection-feedback').textContent = 'Shobu banks it. Koi-Koi continues and puts these points at risk.'; }
        },
        openCaptureChoice(state) {
            const modal = document.getElementById('capture-modal'); const field = document.getElementById('capture-options'); const cards = state.field.filter(card => state.pending.choiceIds.includes(card.id));
            field.innerHTML = cards.map(card => UI.cardMarkup(card, true, 'choice')).join(''); field.querySelectorAll('button').forEach(button => button.onclick = () => Net.sendAction({ type: 'CHOOSE_CAPTURE', cardId: button.dataset.cardId }));
            document.getElementById('modal-overlay').classList.remove('hidden'); modal.classList.remove('hidden');
        },
        closeCaptureChoice() { document.getElementById('capture-modal').classList.add('hidden'); if (document.getElementById('rules-modal').classList.contains('hidden') && document.getElementById('result-modal').classList.contains('hidden')) document.getElementById('modal-overlay').classList.add('hidden'); },
        renderResult(state) {
            const modal = document.getElementById('result-modal'); if (!['END_ROUND', 'MATCH_OVER'].includes(state.phase) || App.ui.dismissedRound === state.roundNumber) { modal.classList.add('hidden'); UI.syncModalOverlay(); return; }
            const winner = state.players.find(player => player.id === (state.matchResult?.winnerId || state.roundResult?.winnerId)); const matchOver = state.phase === 'MATCH_OVER';
            document.getElementById('result-kicker').textContent = matchOver ? 'MATCH COMPLETE' : `MONTH ${state.roundNumber} COMPLETE`; document.getElementById('result-title').textContent = matchOver ? `${winner?.name || 'Winner'} wins` : state.roundResult.reason === 'oya-ken' ? 'Oya-ken' : 'Shobu';
            const yaku = state.roundResult?.yaku || []; document.getElementById('result-summary').innerHTML = `<div class="result-score"><strong>${Utils.escape(winner?.name || 'Oya')} · +${state.roundResult?.points || 0}</strong><p>${yaku.length ? yaku.map(item => Utils.escape(item.name || item.label)).join(' · ') : 'Dealer award / instant result'}</p></div>${state.players.map(player => `<div>${Utils.escape(player.name)} · <strong>${player.score} points</strong></div>`).join('')}`;
            document.getElementById('result-actions').querySelector('#btn-next-round')?.remove();
            if (App.isHost && !matchOver) { const button = document.createElement('button'); button.id = 'btn-next-round'; button.className = 'primary'; button.textContent = 'DEAL NEXT MONTH'; button.onclick = () => { App.ui.dismissedRound = state.roundNumber; UI.hideResult(); Net.sendAction({ type: 'START_NEXT_ROUND' }); }; document.getElementById('result-actions').prepend(button); }
            document.getElementById('modal-overlay').classList.remove('hidden'); modal.classList.remove('hidden');
        },
        syncModalOverlay() { const open = ['rules-modal', 'capture-modal', 'result-modal'].some(id => !document.getElementById(id).classList.contains('hidden')); document.getElementById('modal-overlay').classList.toggle('hidden', !open); },
        hideResult() { if (App.gameState) App.ui.dismissedRound = App.gameState.roundNumber; document.getElementById('result-modal').classList.add('hidden'); UI.syncModalOverlay(); },
        animateAction(state) {
            const action = state.lastAction; if (!action?.nonce || action.nonce === App.ui.lastActionNonce) return; App.ui.lastActionNonce = action.nonce;
            if (!['capture', 'field_play'].includes(action.type) || !action.card) return;
            const source = action.source === 'hand' ? document.getElementById('hand-dock').getBoundingClientRect() : document.getElementById('draw-pile').getBoundingClientRect(); const target = document.getElementById('field-zone').getBoundingClientRect();
            const wrap = document.createElement('div'); wrap.innerHTML = UI.cardMarkup(action.card); const card = wrap.firstElementChild; card.classList.add('flight-card'); card.style.setProperty('--sx', `${source.left + source.width / 2 - 25}px`); card.style.setProperty('--sy', `${source.top + source.height / 2 - 38}px`); card.style.setProperty('--tx', `${target.left + target.width / 2 - 25}px`); card.style.setProperty('--ty', `${target.top + target.height / 2 - 38}px`); document.getElementById('animation-layer').appendChild(card); setTimeout(() => card.remove(), 850);
        },
        renderLogs(state) {
            const fresh = state.logs.filter(log => log.id > App.ui.lastLogId); fresh.forEach(log => { if (log.type === 'chat' && !App.ui.chatOpen) UI.showChatBubble(log.name, log.message); if (log.type === 'system' && ['result', 'warning'].includes(log.kind)) UI.showToast(log.message, log.kind === 'result' ? 'success' : 'danger'); }); if (fresh.length) App.ui.lastLogId = Math.max(...fresh.map(log => log.id));
            const markup = state.logs.map(log => log.type === 'chat' ? `<div class="chat-line"><strong>${Utils.escape(log.name)}:</strong> ${Utils.escape(log.message)}</div>` : `<div class="chat-line system">${Utils.escape(log.message)}</div>`).join('');
            const box = document.getElementById('chat-messages'); box.innerHTML = markup; box.scrollTop = box.scrollHeight;
            const lobbyBox = document.getElementById('lobby-chat-messages'); if (lobbyBox) { lobbyBox.innerHTML = markup; lobbyBox.scrollTop = lobbyBox.scrollHeight; } UI.syncNameInputs(state);
        },
        showChatBubble(name, message) { const bubble = document.createElement('div'); bubble.className = 'chat-bubble'; bubble.innerHTML = `<strong>${Utils.escape(name)}:</strong> ${Utils.escape(message)}`; const duration = Utils.messageDuration(message); bubble.style.setProperty('--bubble-delay', `${duration - 250}ms`); document.getElementById('chat-bubbles').appendChild(bubble); setTimeout(() => bubble.remove(), duration); },
        showToast(message, type = 'info') { const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = Utils.clean(message, 220); document.getElementById('toast-container').appendChild(toast); setTimeout(() => toast.remove(), 4800); },
        setChatOpen(open) { App.ui.chatOpen = Boolean(open); document.getElementById('chat-drawer').classList.toggle('open', App.ui.chatOpen); document.getElementById('chat-fab').setAttribute('aria-expanded', String(App.ui.chatOpen)); if (open) setTimeout(() => document.getElementById('chat-input').focus(), 180); },
        sendChat() { const input = document.getElementById('chat-input'); const message = Utils.clean(input.value, 180); if (!message) return; input.value = ''; Net.sendAction({ type: 'CHAT', message }); },
        sendLobbyChat() { const input = document.getElementById('lobby-chat-input'); const message = Utils.clean(input.value, 180); if (!message) return; input.value = ''; Net.sendAction({ type: 'CHAT', message }); },
        renamePlayer(inputId) { const input = document.getElementById(inputId); const name = Utils.clean(input?.value, 24); if (!name) return UI.showToast('Enter a name first.', 'danger'); App.localName = name; localStorage.setItem('hanafuda_player_name', name); Net.sendAction({ type: 'RENAME', name }); },
        syncNameInputs(state) { const me = state?.players?.find(player => player.id === App.localId); if (!me) return; App.localName = me.name; ['room-player-name', 'game-player-name'].forEach(id => { const input = document.getElementById(id); if (input && document.activeElement !== input) input.value = me.name; }); },
        openRules() { document.getElementById('modal-overlay').classList.remove('hidden'); document.getElementById('rules-modal').classList.remove('hidden'); },
        closeRules() { document.getElementById('rules-modal').classList.add('hidden'); if (document.getElementById('capture-modal').classList.contains('hidden') && document.getElementById('result-modal').classList.contains('hidden')) document.getElementById('modal-overlay').classList.add('hidden'); },
        closeTopModal() { if (!document.getElementById('rules-modal').classList.contains('hidden')) UI.closeRules(); else if (!document.getElementById('result-modal').classList.contains('hidden')) UI.hideResult(); },
        leaveGame() { App.leaving = true; Game.bots?.stop(); Object.values(App.connections).forEach(connection => { try { connection.close(); } catch (error) {} }); App.guestLink?.stop?.(); App.roomRelay?.close?.(); try { App.hostConnection?.close(); } catch (error) {} try { App.peer?.destroy(); } catch (error) {} const url = new URL(location.href); url.search = ''; url.hash = ''; location.replace(url.href); }
    };

    window.HanafudaApp = { App, Game, Net, UI, Utils };
    window.addEventListener('load', UI.initialize);
})();
