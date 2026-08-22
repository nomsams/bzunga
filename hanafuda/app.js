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
        ui: { lastLogId: 0, lastTurnAnimationNonce: null, activeAnimationNonce: null, animationOrigins: null, animationRun: 0, animatingCardIds: [], chatOpen: false, dismissedRound: null, overviewZoom: 1, overviewTab: 'cards', overviewLight: true, handTapInfo: true, tableZoom: 100 }
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
            Game.engine.setTableMode(peerId, document.getElementById('create-table-mode').value);
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
            for (const player of Game.engine.state.players) {
                if (!player.isBot && player.id !== stablePlayerId && player.connected !== false) Game.engine.disconnectPlayer(player.id);
            }
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

        kickParticipant(participant) {
            if (!App.isHost || !participant?.id) return false;
            if (participant.role !== 'spectator') return Net.kickPlayer(participant.id);
            const connection = App.connections[participant.id];
            try { connection?.send?.({ type: 'KICKED', reason: 'The host removed you from this table. You can join again whenever you want.' }); } catch (error) {}
            delete App.connections[participant.id]; delete App.connectionRoles[participant.id]; delete App.spectators[participant.id];
            setTimeout(() => { try { connection?.close?.(); } catch (error) {} }, 180); Net.broadcast(); return true;
        },

        switchConnectionRole(peerId, targetRole) {
            const role = App.connectionRoles[peerId]; const connection = App.connections[peerId];
            if (!role || !connection?.open || !['player', 'spectator'].includes(targetRole) || role.role === targetRole) return { ok: false, reason: 'That room role is already active.' };
            if (targetRole === 'spectator') {
                if (!App.allowSpectators) return { ok: false, reason: 'Spectator mode is disabled for this table.' };
                const player = Game.engine?.getPlayer(role.playerId || peerId); if (!player?.id) return { ok: false, reason: 'Your player seat could not be found.' };
                const formerSeat = { id: player.id, name: player.name, sessionToken: player.sessionToken };
                const perspectiveId = Game.engine.state.players.find(item => item.id !== player.id)?.id || player.id;
                App.connectionRoles[peerId] = { role: 'spectator', perspectiveId, formerPlayerId: formerSeat.id, formerSeat };
                App.spectators[peerId] = { id: peerId, name: player.name, perspectiveId, formerPlayerId: formerSeat.id, formerSeat, connected: true, lastChatAt: 0 };
                if (Game.engine.state.phase === 'lobby') Game.engine.removePlayer(player.id); else Game.engine.disconnectPlayer(player.id);
                Net.broadcast(); return { ok: true };
            }
            const spectator = App.spectators[peerId] || {}; const formerId = role.formerPlayerId || spectator.formerPlayerId;
            const reserved = formerId ? Game.engine?.getPlayer(formerId) : null; let seated = false; let playerId = peerId;
            if (reserved && reserved.connected === false) { seated = Game.engine.reconnectPlayer(formerId, formerId); playerId = formerId; }
            else if (Game.engine?.state.phase === 'lobby') {
                const mode = HanafudaRules.tableMode(Game.engine.state.settings?.mode);
                if (Game.engine.state.players.length >= mode.playerCount) return { ok: false, reason: `${mode.name} has no open player seat.` };
                const seat = role.formerSeat || spectator.formerSeat || {};
                seated = Game.engine.addPlayer({ id: peerId, name: spectator.name || seat.name || 'Player', sessionToken: seat.sessionToken || '', connected: true });
            }
            if (!seated) return { ok: false, reason: 'No player seat is available during this match. Keep spectating until a reserved seat or lobby opens.' };
            App.connectionRoles[peerId] = { role: 'player', playerId }; delete App.spectators[peerId]; Net.broadcast(); return { ok: true };
        },

        handleSpectatorAction(peerId, data) {
            const spectator = App.spectators[peerId]; if (!spectator) return { ok: false, reason: 'Spectator session not found.' };
            if (data?.type === 'SPECTATOR_PERSPECTIVE') { Net.changeSpectatorPerspective(peerId, Number(data.direction) || 1); return { ok: true }; }
            if (data?.type === 'ROLE_SWITCH') return Net.switchConnectionRole(peerId, data.role);
            if (data?.type === 'RENAME') { spectator.name = Utils.clean(data.name, 24, spectator.name || 'Spectator'); Net.broadcast(); return { ok: true }; }
            if (data?.type === 'CHAT') {
                const message = Utils.clean(data.message, 180); const now = Date.now();
                if (!message) return { ok: false, reason: 'Write a message first.' };
                if (now - (spectator.lastChatAt || 0) < 650) return { ok: false, reason: 'Slow down a little.' };
                spectator.lastChatAt = now; const state = Game.engine.state;
                state.logs.push({ id: ++state.nextLogId, type: 'chat', playerId: `spectator-${peerId}`, name: spectator.name, message, time: now });
                if (state.logs.length > 100) state.logs.splice(0, state.logs.length - 100);
                Game.engine._emit({ type: 'chat', playerId: `spectator-${peerId}`, name: spectator.name, message, isSpectator: true }); return { ok: true };
            }
            return { ok: false, reason: 'Spectators can chat, inspect cards, or switch roles, but cannot play cards.' };
        },

        acceptConnection(connection) {
            if (!App.isHost) return;
            connection.on('data', data => {
                if (data?.type === 'ROOM_PING') {
                    if (connection.open) connection.send({ type: 'ROOM_PONG', sentAt: data.sentAt || Date.now() });
                    return;
                }
                if (data?.type === 'JOIN') return Net.handleJoin(connection, data);
                if (data?.type === 'ROLE_SWITCH') { const result = Net.switchConnectionRole(connection.peer, data.role); if (!result.ok && connection.open) connection.send({ type: 'ACTION_REJECTED', reason: result.reason }); return; }
                if (App.connectionRoles[connection.peer]?.role === 'spectator') { const result = Net.handleSpectatorAction(connection.peer, data); if (!result.ok && connection.open) connection.send({ type: 'ACTION_REJECTED', reason: result.reason }); return; }
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
            const requestedSpectator = data.role === 'spectator';
            const sameSeat = !requestedSpectator ? state.players.find(player => player.id === connection.peer) : null;
            if (sameSeat) { App.connections[connection.peer] = connection; App.connectionRoles[connection.peer] = { role: 'player', playerId: sameSeat.id }; if (!sameSeat.connected) Game.engine.reconnectPlayer(sameSeat.id, sameSeat.id); Net.sendState(connection, connection.peer); Net.broadcast(); return; }
            const token = Utils.clean(data.sessionToken, 80);
            const returning = !requestedSpectator && token.length >= 6 ? state.players.find(player => player.sessionToken === token && !player.connected && !player.isBot) : null;
            if (returning) { App.connections[connection.peer] = connection; App.connectionRoles[connection.peer] = { role: 'player', playerId: returning.id }; Game.engine.reconnectPlayer(returning.id, returning.id); Net.sendState(connection, connection.peer); Net.broadcast(); return; }
            if (requestedSpectator || state.phase !== 'lobby') {
                if (!App.allowSpectators) return connection.send({ type: 'JOIN_REJECTED', reason: 'Spectators are disabled for this table.' });
                const perspectiveId = state.players[0]?.id || null;
                App.connections[connection.peer] = connection; App.connectionRoles[connection.peer] = { role: 'spectator', perspectiveId };
                App.spectators[connection.peer] = { id: connection.peer, name: Utils.clean(data.name, 24, 'Spectator'), perspectiveId, connected: true, lastChatAt: 0 };
                Net.sendState(connection, connection.peer); Net.broadcast(); return;
            }
            const mode = HanafudaRules.tableMode(state.settings?.mode);
            if (state.players.length >= mode.playerCount) return connection.send({ type: 'JOIN_REJECTED', reason: `${mode.name} is full (${mode.playerCount} seats). Join as a spectator or ask the host to choose a larger table.` });
            let name = Utils.clean(data.name, 24, 'Player');
            if (state.players.some(player => player.name.toLowerCase() === name.toLowerCase())) name = `${name.slice(0, 22)} 2`;
            App.connections[connection.peer] = connection; App.connectionRoles[connection.peer] = { role: 'player', playerId: connection.peer };
            Game.engine.addPlayer({ id: connection.peer, name, sessionToken: token, connected: true }); Net.sendState(connection, connection.peer);
        },

        receiveHostData(data) {
            if (data?.type === 'STATE_UPDATE' && data.state?.players && data.state?.field) {
                App.isSpectator = Boolean(data.state.spectatorMode); App.requestedSpectator = App.isSpectator; if (data.state.viewerId) App.localId = data.state.viewerId;
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
            state.spectatorCount = Object.keys(App.spectators).length;
            state.spectatorsAllowed = App.allowSpectators;
            if (spectator) {
                const guest = App.spectators[peerId] || {};
                const reserved = role.formerPlayerId ? Game.engine.getPlayer(role.formerPlayerId) : null;
                state.spectatorMode = true; state.spectatorName = guest.name || 'Spectator';
                state.canTakePlayerSeat = Boolean((reserved && reserved.connected === false) || (Game.engine.state.phase === 'lobby' && Game.engine.state.players.length < HanafudaRules.tableMode(Game.engine.state.settings?.mode).playerCount));
            }
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
                if (['SPECTATOR_PERSPECTIVE', 'CHAT', 'RENAME', 'ROLE_SWITCH'].includes(action?.type) && App.hostConnection?.open) { App.hostConnection.send(action); return { ok: true }; }
                UI.showToast('Spectators can chat, inspect cards, or request a player seat, but cannot play cards.', 'danger'); return { ok: false };
            }
            if (App.isHost) { const result = Game.engine?.processAction(action, App.localId); if (result && !result.ok) UI.showToast(result.reason, 'danger'); return result; }
            if (App.hostConnection?.open) { App.hostConnection.send(action); return { ok: true, pending: true }; }
            UI.showToast('The host is not connected.', 'danger'); return { ok: false };
        },
        requestRoleSwitch(role) {
            if (App.isHost) return UI.showToast('The room host must keep a player seat.', 'danger');
            if (!App.hostConnection?.open) return UI.showToast('The host is not connected.', 'danger');
            App.hostConnection.send({ type: 'ROLE_SWITCH', role }); UI.showToast(role === 'spectator' ? 'Requesting spectator mode…' : 'Requesting a player seat…');
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
            const savedArt = localStorage.getItem('hanafuda_card_art') || 'hawaii-svg'; document.getElementById('card-art-select').value = savedArt; UI.setCardArt(savedArt);
            UI.setHandTapInfo(localStorage.getItem('hanafuda_hand_tap') !== 'play');
            UI.setTableZoom(Number(localStorage.getItem('hanafuda_table_zoom')) || 100);
            const savedMode = HanafudaRules.tableMode(localStorage.getItem('hanafuda_table_mode')).id; document.getElementById('create-table-mode').value = savedMode; document.getElementById('table-mode').value = savedMode;
            const savedName = Utils.clean(localStorage.getItem('hanafuda_player_name'), 24); if (savedName) document.getElementById('player-name').value = savedName;
            if (joinId) { const input = document.getElementById('join-id'); input.value = joinId.replace(/[^a-zA-Z0-9_-]/g, ''); input.dataset.direct = '1'; }
            document.getElementById('btn-host').onclick = event => { event.currentTarget.disabled = true; event.currentTarget.textContent = 'CONNECTING…'; App.isHost = true; localStorage.setItem('hanafuda_table_mode', document.getElementById('create-table-mode').value); App.requestedRoomName = RoomTools.cleanRoomName(document.getElementById('room-name').value, `${document.getElementById('player-name').value || 'Koi'} ${Utils.id().slice(0, 4)}`); Net.initialize(document.getElementById('player-name').value); };
            document.getElementById('btn-join').onclick = event => UI.join(event, false);
            document.getElementById('btn-spectate').onclick = event => UI.join(event, true);
            document.getElementById('join-id').oninput = event => delete event.currentTarget.dataset.direct;
            document.getElementById('allow-spectators').onchange = event => { App.allowSpectators = event.currentTarget.checked; Net.broadcast(); };
            document.getElementById('btn-add-bot').onclick = UI.addBot; document.getElementById('btn-start-game').onclick = UI.startGame;
            document.getElementById('btn-manage-room').onclick = UI.openParticipantManager;
            document.getElementById('table-mode').onchange = event => UI.changeTableMode(event.currentTarget.value);
            document.getElementById('viewing-yaku').onchange = event => { document.getElementById('busted-viewing').disabled = !event.currentTarget.checked; if (!event.currentTarget.checked) document.getElementById('busted-viewing').checked = false; };
            document.getElementById('card-back-select').onchange = event => UI.saveCardBack(event.currentTarget.value);
            document.getElementById('card-front-select').onchange = event => UI.saveCardFront(event.currentTarget.value);
            document.getElementById('card-art-select').onchange = event => UI.saveCardArt(event.currentTarget.value);
            document.getElementById('game-card-back-select').onchange = event => UI.saveCardBack(event.currentTarget.value);
            document.getElementById('game-card-front-select').onchange = event => UI.saveCardFront(event.currentTarget.value);
            document.getElementById('game-card-art-select').onchange = event => UI.saveCardArt(event.currentTarget.value);
            document.getElementById('spectator-prev').onclick = () => Net.sendAction({ type: 'SPECTATOR_PERSPECTIVE', direction: -1 }); document.getElementById('spectator-next').onclick = () => Net.sendAction({ type: 'SPECTATOR_PERSPECTIVE', direction: 1 });
            document.getElementById('btn-koi').onclick = () => Net.sendAction({ type: 'KOI_KOI' }); document.getElementById('btn-shobu').onclick = () => Net.sendAction({ type: 'SHOBU' });
            ['btn-open-rules', 'btn-room-rules', 'btn-table-rules'].forEach(id => document.getElementById(id).onclick = UI.openRules);
            document.getElementById('btn-close-rules').onclick = UI.closeRules; document.getElementById('btn-rules-done').onclick = UI.closeRules; document.getElementById('modal-overlay').onclick = UI.closeTopModal;
            document.getElementById('btn-card-overview').onclick = UI.openOverview; document.getElementById('btn-close-overview').onclick = UI.closeOverview;
            document.getElementById('btn-hand-tap-mode').onclick = () => UI.setHandTapInfo(!App.ui.handTapInfo, true);
            document.getElementById('btn-table-zoom-out').onclick = () => UI.setTableZoom(App.ui.tableZoom - 15, true);
            document.getElementById('btn-table-zoom-in').onclick = () => UI.setTableZoom(App.ui.tableZoom + 15, true);
            document.getElementById('btn-overview-zoom-out').onclick = () => UI.setOverviewZoom(App.ui.overviewZoom - 0.25); document.getElementById('btn-overview-zoom-in').onclick = () => UI.setOverviewZoom(App.ui.overviewZoom + 0.25); document.getElementById('btn-overview-fit').onclick = () => UI.setOverviewZoom(1);
            document.getElementById('btn-overview-background').onclick = () => UI.setOverviewBackground(!App.ui.overviewLight);
            document.getElementById('btn-overview-cards').onclick = () => UI.setOverviewTab('cards'); document.getElementById('btn-overview-yaku').onclick = () => UI.setOverviewTab('yaku');
            document.getElementById('hanafuda-overview').ondblclick = () => UI.setOverviewZoom(App.ui.overviewZoom > 1 ? 1 : 2);
            document.getElementById('hanafuda-theme-overview').ondblclick = () => UI.setOverviewZoom(App.ui.overviewZoom > 1 ? 1 : 2);
            document.getElementById('overview-viewport').onwheel = event => { if (!event.ctrlKey) return; event.preventDefault(); UI.setOverviewZoom(App.ui.overviewZoom + (event.deltaY < 0 ? 0.25 : -0.25)); };
            document.getElementById('btn-close-card-detail').onclick = UI.closeCardDetail;
            document.getElementById('btn-card-appearance').onclick = UI.openAppearance; document.getElementById('btn-close-appearance').onclick = UI.closeAppearance; document.getElementById('btn-appearance-done').onclick = UI.closeAppearance;
            document.getElementById('chat-fab').onclick = () => UI.setChatOpen(true); document.getElementById('chat-close').onclick = () => UI.setChatOpen(false); document.getElementById('chat-send').onclick = UI.sendChat;
            document.getElementById('chat-input').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); UI.sendChat(); } else if (event.key === 'Escape') UI.setChatOpen(false); };
            document.getElementById('lobby-chat-send').onclick = UI.sendLobbyChat; document.getElementById('lobby-chat-input').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); UI.sendLobbyChat(); } };
            document.getElementById('btn-room-rename').onclick = () => UI.renamePlayer('room-player-name'); document.getElementById('btn-game-rename').onclick = () => UI.renamePlayer('game-player-name');
            ['room-player-name', 'game-player-name'].forEach(id => document.getElementById(id).onkeydown = event => { if (event.key === 'Enter') UI.renamePlayer(id); });
            document.getElementById('btn-view-table').onclick = UI.inspectFinalTable; document.getElementById('btn-leave-game').onclick = UI.leaveGame;
            document.getElementById('btn-postgame-results').onclick = UI.showResult; document.getElementById('btn-postgame-next').onclick = UI.startNextMonth; document.getElementById('btn-postgame-new-table').onclick = UI.leaveGame;
            document.addEventListener('keydown', event => { if (event.key === 'Escape') UI.closeTopModal(); });
            document.addEventListener('pointerdown', event => { if (!event.target.closest('.capture-group')) UI.collapseCaptureGroups(); });
            window.addEventListener('orientationchange', () => setTimeout(() => App.gameState && UI.render(App.gameState), 180));
            if (joinId) document.getElementById(spectate ? 'btn-spectate' : 'btn-join').click();
        },

        join(event, spectator) {
            const input = document.getElementById('join-id'); const hostId = RoomTools.resolveJoinId('hanafuda', input.value, input.dataset.direct === '1');
            if (!hostId) return UI.showToast('Enter a room name or invite.', 'danger');
            event.currentTarget.disabled = true; event.currentTarget.textContent = spectator ? 'CONNECTING…' : 'JOINING…'; App.isHost = false; Net.initialize(document.getElementById('player-name').value, hostId, spectator);
        },
        setCardBack(value) {
            const safe = ['hana-red', 'svg-red', 'svg-blue', 'classic'].includes(value) ? value : 'hana-red';
            document.documentElement.dataset.hanafudaBack = safe;
            ['card-back-select', 'game-card-back-select'].forEach(id => { const select = document.getElementById(id); if (select && select.value !== safe) select.value = safe; });
        },
        setCardFront(value) {
            const safe = ['original', 'invert', 'white-red'].includes(value) ? value : 'original';
            document.documentElement.dataset.hanafudaFront = safe;
            ['card-front-select', 'game-card-front-select'].forEach(id => { const select = document.getElementById(id); if (select && select.value !== safe) select.value = safe; });
        },
        setCardArt(value) {
            const safe = ['scanned-svg', 'mantia-png', 'hawaii-svg'].includes(value) ? value : 'hawaii-svg';
            document.documentElement.dataset.hanafudaArt = safe;
            ['card-art-select', 'game-card-art-select'].forEach(id => { const select = document.getElementById(id); if (select && select.value !== safe) select.value = safe; });
        },
        saveCardBack(value) { UI.setCardBack(value); localStorage.setItem('hanafuda_card_back', document.documentElement.dataset.hanafudaBack); },
        saveCardFront(value) { UI.setCardFront(value); localStorage.setItem('hanafuda_card_front', document.documentElement.dataset.hanafudaFront); },
        saveCardArt(value) {
            UI.setCardArt(value); localStorage.setItem('hanafuda_card_art', document.documentElement.dataset.hanafudaArt);
            if (App.gameState && App.gameState.phase !== 'lobby') UI.render(App.gameState);
            if (!document.getElementById('overview-modal').classList.contains('hidden')) { UI.renderOverviewDeck(); UI.renderReferenceGuides(); }
            if (!document.getElementById('appearance-modal').classList.contains('hidden')) UI.openAppearance();
        },
        setHandTapInfo(showInfo, persist = false) {
            App.ui.handTapInfo = Boolean(showInfo);
            const button = document.getElementById('btn-hand-tap-mode');
            const inputWord = UI.isMobileCardInput() ? 'TAP' : 'CLICK';
            if (button) { button.textContent = `${inputWord}: ${App.ui.handTapInfo ? 'INFO' : 'PLAY'}`; button.setAttribute('aria-pressed', String(App.ui.handTapInfo)); }
            if (persist) localStorage.setItem('hanafuda_hand_tap', App.ui.handTapInfo ? 'info' : 'play');
            if (App.gameState && App.gameState.phase !== 'lobby') UI.renderHand(App.gameState);
        },
        setTableZoom(value, persist = false) {
            const levels = [85, 100, 115];
            const numeric = Number(value) || 100;
            const safe = levels.reduce((closest, level) => Math.abs(level - numeric) < Math.abs(closest - numeric) ? level : closest, 100);
            App.ui.tableZoom = safe; document.documentElement.dataset.hanafudaTableZoom = String(safe);
            const output = document.getElementById('table-zoom-value'); if (output) output.textContent = `${safe}%`;
            const smaller = document.getElementById('btn-table-zoom-out'); const larger = document.getElementById('btn-table-zoom-in');
            if (smaller) smaller.disabled = safe === levels[0]; if (larger) larger.disabled = safe === levels[levels.length - 1];
            if (persist) localStorage.setItem('hanafuda_table_zoom', String(safe));
        },
        isMobileCardInput() { return window.matchMedia?.('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) <= 720; },
        resetLobbyButtons() { const values = [['btn-host', 'CREATE A TABLE'], ['btn-join', 'JOIN'], ['btn-spectate', 'SPECTATE']]; values.forEach(([id, label]) => { const button = document.getElementById(id); button.disabled = false; button.textContent = label; }); },
        showRoomCollision(name) { UI.showToast('That room name is already in use.', 'danger'); RoomTools.showSuggestions(document.getElementById('room-name-suggestions'), name, choice => { document.getElementById('room-name').value = choice; document.getElementById('room-name-suggestions').classList.add('hidden'); document.getElementById('btn-host').click(); }); },
        renderQr(peerId) { const container = document.getElementById('qr-container'); RoomTools.configureInvite('hanafuda', peerId, { qrContainer: container, copyButton: document.getElementById('btn-copy-invite'), size: 220, onCopy: copied => UI.showToast(copied ? 'Invite link copied.' : 'Could not copy the invite link.', copied ? 'success' : 'danger') }); },

        changeTableMode(modeId) {
            if (!App.isHost || !Game.engine || Game.engine.state.phase !== 'lobby') return;
            const result = Net.sendAction({ type: 'SET_TABLE_MODE', mode: modeId });
            if (result?.ok) localStorage.setItem('hanafuda_table_mode', modeId);
            if (result && !result.ok) UI.renderLobby(Game.engine.getViewState(App.localId));
        },

        addBot() {
            if (!App.isHost || !Game.engine || Game.engine.state.phase !== 'lobby') return;
            const mode = HanafudaRules.tableMode(Game.engine.state.settings?.mode);
            if (Game.engine.state.players.length >= mode.playerCount) return UI.showToast(`${mode.name} is full.`, 'danger');
            const difficulty = Number(document.getElementById('bot-difficulty').value) || 1;
            Game.engine.addPlayer({ id: `bot-${Utils.id()}`, name: BOT_NAMES[difficulty], isBot: true, botDifficulty: difficulty, connected: true });
        },
        startGame() {
            if (!App.isHost || !Game.engine) return;
            const result = Game.engine.startGame({ mode: document.getElementById('table-mode').value, rounds: Number(document.getElementById('round-count').value), viewingYaku: document.getElementById('viewing-yaku').checked, bustedViewing: document.getElementById('busted-viewing').checked, cardBack: document.getElementById('card-back-select').value, cardFront: document.getElementById('card-front-select').value, cardArt: document.getElementById('card-art-select').value });
            if (!result.ok) UI.showToast(result.reason, 'danger');
        },

        render(state) {
            UI.captureTurnAnimationOrigins(state);
            App.gameState = state;
            UI.renderRoleControl(state);
            UI.setCardBack(localStorage.getItem('hanafuda_card_back') || state.settings?.cardBack || 'hana-red');
            UI.setCardFront(localStorage.getItem('hanafuda_card_front') || state.settings?.cardFront || 'original');
            UI.setCardArt(localStorage.getItem('hanafuda_card_art') || state.settings?.cardArt || 'hawaii-svg');
            UI.renderLogs(state);
            if (state.phase === 'lobby') return UI.renderLobby(state);
            document.getElementById('lobby').classList.add('hidden'); document.getElementById('game-view').classList.remove('hidden');
            if (!['END_ROUND', 'MATCH_OVER'].includes(state.phase)) document.getElementById('game-view').classList.remove('final-table-inspection');
            UI.renderSpectator(state); UI.renderStatus(state); UI.renderOpponents(state); UI.renderField(state); UI.renderCaptures(state); UI.renderHand(state); UI.renderActions(state); UI.renderResult(state);
            Promise.resolve(UI.animateAction(state)).catch(() => UI.clearTurnAnimation()).finally(() => {
                if (App.gameState && ['END_ROUND', 'MATCH_OVER'].includes(App.gameState.phase)) UI.renderResult(App.gameState);
            });
        },
        renderLobby(state) {
            const mode = HanafudaRules.tableMode(state.settings?.mode); const seatsOpen = Math.max(0, mode.playerCount - state.players.length);
            const modeSummary = document.getElementById('table-mode-summary'); modeSummary.innerHTML = `<div><span>TABLE MODE</span><strong>${Utils.escape(mode.name.toUpperCase())}${mode.variant ? ' · VARIANT' : ' · CLASSIC'}</strong></div><p>${Utils.escape(mode.description)} · ${state.players.length} of ${mode.playerCount} seats filled${seatsOpen ? ` · ${seatsOpen} open` : ' · READY'}</p>`;
            const modeSelect = document.getElementById('table-mode'); modeSelect.value = mode.id; document.getElementById('table-mode-help').textContent = mode.description;
            const addBot = document.getElementById('btn-add-bot'); addBot.disabled = state.players.length >= mode.playerCount; addBot.textContent = addBot.disabled ? 'TABLE FULL' : '+ ADD BOT';
            const spectatorCount = Number(state.spectatorCount || (App.isHost ? Object.keys(App.spectators).length : 0));
            const list = document.getElementById('lobby-players'); list.innerHTML = state.players.map((player, index) => `<div class="lobby-player"><div><strong><span class="seat-number">${index + 1}</span>${Utils.escape(player.name)}</strong><span>${player.isHost ? 'Host · Oya candidate' : player.isBot ? `Bot · Level ${player.botDifficulty}` : player.connected === false ? 'Player · Offline' : 'Player'} · Seat ${index + 1}</span></div>${App.isHost && player.isBot ? `<button class="secondary remove-bot" data-id="${Utils.escape(player.id)}">REMOVE</button>` : ''}</div>`).join('') + (spectatorCount ? `<div class="lobby-player spectator-summary"><div><strong>👁 ${spectatorCount} spectator${spectatorCount === 1 ? '' : 's'}</strong><span>God view · chat enabled</span></div></div>` : '');
            list.querySelectorAll('.remove-bot').forEach(button => button.onclick = () => Game.engine?.removePlayer(button.dataset.id));
            UI.syncNameInputs(state);
        },
        renderRoleControl(state) {
            const canSwitch = !App.isHost && (App.isSpectator ? state.canTakePlayerSeat !== false : state.spectatorsAllowed !== false);
            const reason = App.isSpectator && state.canTakePlayerSeat === false ? 'No player seat is currently available' : !App.isSpectator && state.spectatorsAllowed === false ? 'Spectator mode is disabled for this table' : '';
            RoomTools.RoleControl.update({ visible: Boolean(App.isHost || App.hostConnection || App.offlineHost), host: App.isHost, spectator: App.isSpectator, canSwitch, reason, onSwitch: Net.requestRoleSwitch, onManage: UI.openParticipantManager });
        },
        openParticipantManager() {
            if (!App.isHost || !Game.engine) return;
            const spectatorSeats = new Set(Object.values(App.spectators).map(item => item.formerPlayerId).filter(Boolean));
            const players = Game.engine.state.players.filter(player => !player.isBot && !spectatorSeats.has(player.id)).map(player => ({ id: player.id, name: player.name, role: player.isHost ? 'host player' : 'player', connected: player.connected !== false, protected: player.id === App.localId }));
            const spectators = Object.values(App.spectators).map(person => ({ id: person.id, name: person.name, role: 'spectator', connected: person.connected !== false }));
            RoomTools.ParticipantManager.open({ participants: [...players, ...spectators], onKick: Net.kickParticipant });
        },
        renderSpectator(state) { const controls = document.getElementById('spectator-controls'); controls.classList.toggle('hidden', !App.isSpectator); if (App.isSpectator) { const player = state.players.find(item => item.id === state.viewerId); document.getElementById('spectator-label').textContent = `GOD VIEW · ${player?.name || 'TABLE'}`; } },
        renderStatus(state) {
            const active = state.players.find(player => player.id === state.turnPlayerId); const me = state.players.find(player => player.id === App.localId); const mode = HanafudaRules.tableMode(state.settings?.mode);
            document.getElementById('month-display').textContent = `${mode.shortName} · MONTH ${state.roundNumber} / ${state.settings.rounds}`;
            let status = active ? `${active.name}'s turn` : 'Round complete';
            if (state.phase === 'WAIT_HAND_SELECTION' && active?.id === App.localId && !App.isSpectator) status = 'Your turn · choose a card from your hand';
            if (state.phase.includes('CAPTURE') && state.pending?.playerId === App.localId && !App.isSpectator) status = 'Choose which matching field card to capture';
            if (state.phase === 'WAIT_KOI_KOI_CHOICE') status = state.pending?.playerId === App.localId ? 'Yaku! Koi-Koi or Shobu?' : `${active?.name || 'Another player'} is weighing the risk…`;
            document.getElementById('status-text').textContent = status;
            const thinkers = state.players.filter(player => state.thinkingBots.includes(player.id)).map(player => `${player.name} is thinking…`); const typers = state.players.filter(player => state.typingBots.includes(player.id)).map(player => `${player.name} is typing…`);
            document.getElementById('activity-text').textContent = [...thinkers, ...typers].join(' · ');
            const ordered = me ? [me, ...state.players.filter(player => player.id !== me.id)] : state.players;
            document.getElementById('scoreboard').innerHTML = ordered.map(player => `<span class="score-pill ${player.id === state.dealerId ? 'active' : ''} ${player.id === state.turnPlayerId ? 'current-turn' : ''}">${Utils.escape(player.name)} · ${player.score}${player.id === state.dealerId ? ' · OYA' : ''}</span>`).join('');
        },
        renderOpponents(state) {
            const me = state.players.find(player => player.id === App.localId); const opponents = state.players.filter(player => player.id !== me?.id); const seats = document.getElementById('opponent-seats');
            seats.dataset.count = String(opponents.length);
            seats.innerHTML = opponents.map(player => `<article class="opponent-seat ${player.id === state.turnPlayerId ? 'active-turn' : ''} ${player.connected === false ? 'offline' : ''}" data-player-id="${Utils.escape(player.id)}"><div class="player-meta"><strong>${Utils.escape(player.name)}</strong><span>${player.score} pts${player.id === state.dealerId ? ' · OYA' : ''}${player.connected === false ? ' · AWAY' : ''}</span></div><div class="mini-hand">${player.hand.map(card => card.hidden ? '<div class="hana-card card-back"></div>' : UI.cardMarkup(card, false, 'opponent')).join('')}</div><div class="capture-groups">${UI.captureGroups(player.captured || [])}</div></article>`).join('');
            UI.bindCaptureInspection(seats); UI.bindCardDetails(seats);
        },
        renderField(state) {
            const groups = HanafudaRules.byMonth(state.field); const choiceIds = new Set(state.pending?.playerId === App.localId ? state.pending.choiceIds || [] : []);
            document.getElementById('field-cards').innerHTML = Object.values(groups).sort((a, b) => a[0].month - b[0].month).map(group => `<div class="month-stack ${group.length === 3 ? 'three' : ''} ${group.some(card => choiceIds.has(card.id)) ? 'choice' : ''}">${group.map(card => UI.cardMarkup(card, choiceIds.has(card.id), 'field')).join('')}</div>`).join('');
            UI.bindCardDetails(document.getElementById('field-cards'));
            document.getElementById('deck-count').textContent = state.deckCount;
            if (choiceIds.size && !App.isSpectator) UI.openCaptureChoice(state);
            else UI.closeCaptureChoice();
        },
        renderCaptures(state) {
            const me = state.players.find(player => player.id === App.localId); const local = document.getElementById('local-captures');
            local.innerHTML = UI.captureGroups(me?.captured || []); UI.bindCaptureInspection(local); UI.bindCardDetails(local);
        },
        captureGroups(cards) {
            const groups = ['Bright', 'Animal', 'Ribbon', 'Chaff'].map(category => ({ category, cards: cards.filter(card => card.categories?.includes(category)) })).filter(group => group.cards.length);
            return groups.map(group => {
                const visible = group.cards.slice(0, 8); const names = visible.map(card => card.name).join(', ');
                return `<div class="capture-group" role="group" tabindex="0" aria-expanded="false" aria-label="${group.category}, ${group.cards.length} captured cards: ${Utils.escape(names)}" title="${group.category}: ${group.cards.length} · tap to keep open" style="width:${Math.max(44, 39 + (visible.length - 1) * 12)}px"><span class="capture-group-label">${group.category.toUpperCase()} · ${group.cards.length}</span>${visible.map((card, index) => UI.cardMarkup(card, false, 'capture', index)).join('')}</div>`;
            }).join('');
        },
        collapseCaptureGroups(except = null) {
            document.querySelectorAll('.capture-group.is-inspecting').forEach(group => {
                if (group === except) return;
                group.classList.remove('is-inspecting'); group.setAttribute('aria-expanded', 'false');
            });
        },
        setCaptureInspection(group, expanded) {
            UI.collapseCaptureGroups(group);
            group.classList.toggle('is-inspecting', expanded); group.setAttribute('aria-expanded', String(expanded));
        },
        bindCaptureInspection(container) {
            container.querySelectorAll('.capture-group').forEach(group => {
                const toggle = event => { event?.preventDefault(); UI.setCaptureInspection(group, !group.classList.contains('is-inspecting')); };
                group.onclick = event => { if (!event.target.closest('.hana-card')) toggle(event); };
                group.onkeydown = event => { if ((event.key === 'Enter' || event.key === ' ') && event.target === group) toggle(event); };
            });
        },
        bindCardDetails(container, allowPlay = false) {
            container.querySelectorAll('.hana-card[data-info-card-id]').forEach(element => {
                if (element.tagName !== 'BUTTON') { element.setAttribute('role', 'button'); element.tabIndex = 0; }
                const inspect = event => {
                    event.preventDefault(); event.stopPropagation();
                    const captureGroup = element.closest('.capture-group');
                    if (captureGroup && UI.isMobileCardInput() && !captureGroup.classList.contains('is-inspecting')) { UI.setCaptureInspection(captureGroup, true); return; }
                    UI.openCardDetail(element.dataset.infoCardId, allowPlay);
                };
                element.onclick = inspect;
                if (element.tagName !== 'BUTTON') element.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') inspect(event); };
            });
        },
        renderHand(state) {
            const me = state.players.find(player => player.id === App.localId); const hand = document.getElementById('local-hand'); if (!me) return hand.replaceChildren();
            const canPlay = !App.isSpectator && state.phase === 'WAIT_HAND_SELECTION' && state.turnPlayerId === App.localId && me.connected !== false;
            const directPlay = canPlay && !App.ui.handTapInfo;
            const sorted = [...me.hand].sort((a, b) => a.month - b.month || HanafudaRules.cardPriority(b) - HanafudaRules.cardPriority(a));
            hand.innerHTML = sorted.map(card => UI.cardMarkup(card, canPlay, 'hand')).join(''); document.getElementById('hand-count').textContent = `${me.hand.length} card${me.hand.length === 1 ? '' : 's'}`;
            const inputWord = UI.isMobileCardInput() ? 'Tap' : 'Click';
            document.getElementById('hand-hint').textContent = directPlay ? `${inputWord} a hand card to play it` : canPlay ? `${inputWord} a card to inspect, then play it` : `${inputWord} a card to inspect it`;
            if (directPlay) hand.querySelectorAll('[data-card-id]').forEach(card => { card.onclick = event => { event.preventDefault(); card.disabled = true; const result = Net.sendAction({ type: 'PLAY_HAND_CARD', cardId: card.dataset.cardId }); if (result && !result.ok) card.disabled = false; }; });
            else UI.bindCardDetails(hand, canPlay);
        },
        cardPresentation(card) {
            return HanafudaRules.cardPresentation(card, document.documentElement.dataset.hanafudaArt);
        },
        cardMarkup(card, interactive = false, locationName = '', index = 0) {
            if (card.hidden) return '<div class="hana-card card-back"></div>';
            const presentation = UI.cardPresentation(card);
            const tag = interactive ? 'button' : 'div'; const attrs = interactive ? `type="button" data-card-id="${Utils.escape(card.id)}" aria-label="Inspect ${Utils.escape(presentation.name)} from ${Utils.escape(presentation.monthName)}, then choose whether to play it"` : '';
            const artTheme = document.documentElement.dataset.hanafudaArt;
            const useMantia = artTheme === 'mantia-png' && card.mantiaAsset;
            const useHawaii = artTheme === 'hawaii-svg' && card.hawaiiAsset;
            const asset = useMantia ? card.mantiaAsset : useHawaii ? card.hawaiiAsset : card.asset;
            const artClass = useMantia ? 'mantia-art' : useHawaii ? 'hawaii-art' : 'scanned-art';
            const eager = !['capture', 'reference', 'yaku'].includes(locationName);
            const art = asset ? `<img class="hana-art ${artClass}" src="${Utils.escape(asset)}" alt="" draggable="false" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>` : '';
            const info = locationName === 'detail' ? '' : `data-info-card-id="${Utils.escape(card.id)}"`;
            return `<${tag} class="hana-card ${interactive ? 'playable' : ''} ${locationName === 'capture' ? 'capture-card' : ''} ${locationName === 'detail' ? 'detail-card' : ''}" ${attrs} ${info} data-month="${card.month}" data-category="${Utils.escape((card.categories || []).join(' '))}" style="--index:${index}"><div class="hana-face">${art}<span class="month-number">${card.month}</span><span class="motif-glyph">${GLYPHS[card.motif] || '花'}</span><span class="motif-name">${Utils.escape(presentation.name)}</span></div></${tag}>`;
        },
        renderActions(state) {
            const panel = document.getElementById('action-panel'); const koiModal = document.getElementById('koi-choice-modal'); const mine = state.turnPlayerId === App.localId && !App.isSpectator;
            const choosingKoi = mine && state.phase === 'WAIT_KOI_KOI_CHOICE' && state.pending?.playerId === App.localId;
            panel.classList.toggle('hidden', !mine || choosingKoi || ['END_ROUND', 'MATCH_OVER'].includes(state.phase)); koiModal.classList.toggle('hidden', !choosingKoi);
            if (mine && state.phase === 'WAIT_HAND_SELECTION') { document.getElementById('turn-prompt').textContent = 'Choose one card from your hand.'; document.getElementById('selection-feedback').textContent = 'A matching month captures; the deck then draws automatically.'; }
            if (mine && state.phase.includes('CAPTURE')) { document.getElementById('turn-prompt').textContent = 'Two cards match. Choose one to capture.'; document.getElementById('selection-feedback').textContent = 'The other card stays on the field.'; }
            if (choosingKoi) { const evaluation = state.pending.evaluation; document.getElementById('koi-choice-title').textContent = `${evaluation.points} point${evaluation.points === 1 ? '' : 's'} ready`; document.getElementById('koi-choice-summary').textContent = evaluation.yaku.map(item => item.name).join(' + '); }
            UI.syncModalOverlay();
        },
        openCaptureChoice(state) {
            const modal = document.getElementById('capture-modal'); const field = document.getElementById('capture-options'); const cards = state.field.filter(card => state.pending.choiceIds.includes(card.id));
            const played = state.pending.card;
            field.innerHTML = cards.map(card => `<button type="button" class="capture-pair-option" data-card-id="${Utils.escape(card.id)}" aria-label="Capture ${Utils.escape(played.name)} with ${Utils.escape(card.name)}"><span class="pair-cards">${UI.cardMarkup(played, false, 'choice')}${UI.cardMarkup(card, false, 'choice')}</span><strong>TAKE THIS ${Utils.escape(card.monthName).toUpperCase()} PAIR</strong></button>`).join('');
            field.querySelectorAll('.capture-pair-option').forEach(button => button.onclick = () => {
                field.querySelectorAll('.capture-pair-option').forEach(option => { option.disabled = true; });
                button.classList.add('selected-pair');
                setTimeout(() => Net.sendAction({ type: 'CHOOSE_CAPTURE', cardId: button.dataset.cardId }), 220);
            });
            modal.classList.remove('hidden'); UI.setModalOverlay(true);
        },
        closeCaptureChoice() { document.getElementById('capture-modal').classList.add('hidden'); UI.syncModalOverlay(); },
        renderResult(state) {
            const modal = document.getElementById('result-modal'); const dock = document.getElementById('postgame-dock'); const complete = ['END_ROUND', 'MATCH_OVER'].includes(state.phase); const matchOver = state.phase === 'MATCH_OVER';
            dock.classList.toggle('hidden', !complete); document.getElementById('postgame-dock-label').textContent = matchOver ? 'MATCH COMPLETE' : `MONTH ${state.roundNumber} COMPLETE`; document.getElementById('btn-postgame-next').classList.toggle('hidden', !App.isHost || matchOver);
            if (!complete || App.ui.dismissedRound === state.roundNumber || UI.shouldDeferResult(state)) { modal.classList.add('hidden'); UI.syncModalOverlay(); return; }
            const winner = state.players.find(player => player.id === (state.matchResult?.winnerId || state.roundResult?.winnerId));
            document.getElementById('result-kicker').textContent = matchOver ? 'MATCH COMPLETE' : `MONTH ${state.roundNumber} COMPLETE`; document.getElementById('result-title').textContent = matchOver ? `${winner?.name || 'Winner'} wins` : state.roundResult.reason === 'oya-ken' ? 'Oya-ken' : 'Shobu';
            const yaku = state.roundResult?.yaku || []; document.getElementById('result-summary').innerHTML = `<div class="result-score"><strong>${Utils.escape(winner?.name || 'Oya')} · +${state.roundResult?.points || 0}</strong><p>${yaku.length ? yaku.map(item => Utils.escape(item.name || item.label)).join(' · ') : 'Dealer award / instant result'}</p></div>${state.players.map(player => `<div>${Utils.escape(player.name)} · <strong>${player.score} points</strong></div>`).join('')}`;
            document.getElementById('result-actions').querySelector('#btn-next-round')?.remove();
            if (App.isHost && !matchOver) { const button = document.createElement('button'); button.id = 'btn-next-round'; button.className = 'primary'; button.textContent = 'DEAL NEXT MONTH'; button.onclick = UI.startNextMonth; document.getElementById('result-actions').prepend(button); }
            modal.classList.remove('hidden'); UI.setModalOverlay(true);
        },
        openOverview() {
            UI.renderOverviewDeck(); UI.renderReferenceGuides();
            UI.setOverviewZoom(1);
            UI.setOverviewBackground(localStorage.getItem('hanafuda_overview_background') !== 'dark');
            UI.setOverviewTab('cards');
            document.getElementById('overview-modal').classList.remove('hidden'); UI.setModalOverlay(true);
            setTimeout(() => document.getElementById('overview-viewport').focus(), 30);
        },
        closeOverview() { UI.closeCardDetail(); document.getElementById('overview-modal').classList.add('hidden'); UI.syncModalOverlay(); },
        setOverviewTab(tab) {
            const safe = tab === 'yaku' ? 'yaku' : 'cards'; App.ui.overviewTab = safe;
            document.getElementById('overview-cards-panel').classList.toggle('hidden', safe !== 'cards'); document.getElementById('overview-yaku-panel').classList.toggle('hidden', safe !== 'yaku');
            [['btn-overview-cards', 'cards'], ['btn-overview-yaku', 'yaku']].forEach(([id, value]) => { const button = document.getElementById(id); const selected = value === safe; button.classList.toggle('active', selected); button.setAttribute('aria-selected', String(selected)); });
        },
        setOverviewBackground(light) {
            App.ui.overviewLight = Boolean(light); const viewport = document.getElementById('overview-viewport'); const button = document.getElementById('btn-overview-background');
            viewport.classList.toggle('light-background', App.ui.overviewLight); button.setAttribute('aria-pressed', String(App.ui.overviewLight)); button.textContent = App.ui.overviewLight ? 'WHITE BACKGROUND' : 'DARK BACKGROUND';
            localStorage.setItem('hanafuda_overview_background', App.ui.overviewLight ? 'white' : 'dark');
        },
        setOverviewZoom(value) {
            const zoom = Math.max(0.75, Math.min(3, Math.round(Number(value || 1) * 4) / 4));
            App.ui.overviewZoom = zoom;
            document.getElementById('hanafuda-overview').style.width = `${zoom * 100}%`;
            document.getElementById('hanafuda-theme-overview').style.width = `${zoom * 100}%`;
            document.getElementById('overview-zoom').textContent = `${Math.round(zoom * 100)}%`;
            document.getElementById('btn-overview-zoom-out').disabled = zoom <= 0.75;
            document.getElementById('btn-overview-zoom-in').disabled = zoom >= 3;
        },
        referenceDeck() { return HanafudaRules.createDeck(() => 0.999999).sort((a, b) => a.month - b.month || a.monthIndex - b.monthIndex); },
        renderOverviewDeck() {
            const artTheme = document.documentElement.dataset.hanafudaArt;
            const image = document.getElementById('hanafuda-overview'); const themed = document.getElementById('hanafuda-theme-overview');
            const useScannedSheet = artTheme === 'scanned-svg';
            image.classList.toggle('hidden', !useScannedSheet); themed.classList.toggle('hidden', useScannedSheet);
            document.getElementById('overview-title').textContent = `All 12 months · 48 cards · ${useScannedSheet ? 'Scanned traditional' : artTheme === 'hawaii-svg' ? 'Hawaii style' : 'Louie Mantia'}`;
            if (useScannedSheet) { if (!image.src) image.src = image.dataset.src; themed.replaceChildren(); return; }
            const groups = HanafudaRules.byMonth(UI.referenceDeck());
            themed.innerHTML = Object.values(groups).map(cards => {
                const first = cards[0]; const presentation = UI.cardPresentation(first);
                return `<section class="theme-overview-month"><header><strong>${first.month}. ${Utils.escape(presentation.calendarMonth)} · ${Utils.escape(presentation.monthName)}</strong><span>${Utils.escape(first.japaneseMonth)}</span></header><div>${cards.map(card => { const item = UI.cardPresentation(card); return `<button type="button" class="theme-overview-card" data-info-card="${Utils.escape(card.id)}" aria-label="Open ${Utils.escape(item.name)} details">${UI.cardMarkup(card, false, 'overview')}<span>${Utils.escape(item.name)}</span><small>${Utils.escape(item.pointLabel)}</small></button>`; }).join('')}</div></section>`;
            }).join('');
            themed.querySelectorAll('.theme-overview-card').forEach(button => button.onclick = () => UI.openCardDetail(button.dataset.infoCard));
        },
        renderReferenceGuides() {
            const deck = UI.referenceDeck(); const groups = HanafudaRules.byMonth(deck);
            document.getElementById('card-reference-grid').innerHTML = Object.values(groups).map(cards => {
                const first = cards[0]; const firstPresentation = UI.cardPresentation(first);
                return `<section class="reference-month"><header><strong>${first.month}. ${Utils.escape(firstPresentation.calendarMonth)} · ${Utils.escape(firstPresentation.monthName)}</strong><small lang="ja">${Utils.escape(first.japaneseMonth)} · ${Utils.escape(first.japaneseMonthReading)}</small></header><div class="reference-card-row">${cards.map(card => { const presentation = UI.cardPresentation(card); return `<button class="card-info-trigger" type="button" data-info-card="${Utils.escape(card.id)}" aria-label="Details for ${Utils.escape(presentation.name)}">${UI.cardMarkup(card, false, 'reference')}<span>${Utils.escape(presentation.name)}</span></button>`; }).join('')}</div></section>`;
            }).join('');
            const byId = Object.fromEntries(deck.map(card => [card.id, card]));
            document.getElementById('yaku-reference-grid').innerHTML = HanafudaRules.YAKU_GUIDE.map(yaku => `<article class="yaku-reference ${yaku.variant ? 'variant' : ''} ${yaku.optional ? 'optional' : ''}"><header><div><strong>${Utils.escape(yaku.name)}</strong><small lang="ja">${Utils.escape(yaku.japanese)}</small></div><b>${Utils.escape(yaku.points)}</b></header><p>${Utils.escape(yaku.description)}</p>${yaku.cardIds.length ? `<div class="yaku-card-row">${yaku.cardIds.map(id => byId[id]).filter(Boolean).map(card => `<button class="card-info-trigger" type="button" data-info-card="${Utils.escape(card.id)}" aria-label="Details for ${Utils.escape(card.name)}">${UI.cardMarkup(card, false, 'yaku')}</button>`).join('')}</div>` : '<div class="system-yaku-badge">DEALER / ROUND RESULT</div>'}</article>`).join('');
            document.querySelectorAll('#card-reference-grid .card-info-trigger, #yaku-reference-grid .card-info-trigger').forEach(button => button.onclick = () => UI.openCardDetail(button.dataset.infoCard));
        },
        openCardDetail(cardId, allowPlay = false) {
            const state = App.gameState || {}; const visibleLiveCards = [...(state.field || []), ...(state.players || []).flatMap(player => [...(player.hand || []), ...(player.captured || [])])].filter(card => !card.hidden);
            const card = visibleLiveCards.find(item => item.id === cardId) || UI.referenceDeck().find(item => item.id === cardId); if (!card) return;
            const presentation = UI.cardPresentation(card);
            const categoryYaku = { kasu: 'Chaff', tanzaku: 'Ribbon', tane: 'Animal' };
            const related = HanafudaRules.YAKU_GUIDE.filter(yaku => !yaku.variant && (yaku.cardIds.includes(card.id) || card.categories.includes(categoryYaku[yaku.id])));
            const me = state.players?.find(player => player.id === App.localId); const canPlay = Boolean(allowPlay && !App.isSpectator && state.phase === 'WAIT_HAND_SELECTION' && state.turnPlayerId === App.localId && me?.hand?.some(item => item.id === card.id));
            document.getElementById('card-detail-content').innerHTML = `<div class="card-detail-layout"><div class="card-detail-art">${UI.cardMarkup(card, false, 'detail')}</div><div class="card-detail-copy"><div class="eyebrow">${Utils.escape(presentation.deckName.toUpperCase())} · MONTH ${card.month} · CARD ${card.monthIndex + 1}</div><h2 id="card-detail-title">${Utils.escape(presentation.name)}</h2><p class="card-detail-summary">${Utils.escape(presentation.calendarMonth)} · ${Utils.escape(presentation.monthName)} · ${Utils.escape(presentation.name)} · ${Utils.escape(presentation.pointLabel)}</p><div class="card-detail-japanese" lang="ja"><strong>${Utils.escape(card.japaneseName)}</strong><span>${Utils.escape(card.japaneseMonth)} · ${Utils.escape(card.japaneseMonthReading)}</span></div><dl><div><dt>Month</dt><dd>${Utils.escape(presentation.calendarMonth)} · ${Utils.escape(presentation.monthName)}</dd></div><div><dt>Card</dt><dd>${Utils.escape(presentation.name)}</dd></div><div><dt>${Utils.escape(presentation.pointTitle)}</dt><dd>${Utils.escape(presentation.pointLabel)}</dd></div><div><dt>Yaku type</dt><dd>${Utils.escape((card.categories || []).join(' · '))}</dd></div><div><dt>Japanese type</dt><dd lang="ja">${Utils.escape(card.japaneseType)} <small>${Utils.escape(card.japaneseTypeReading)}</small></dd></div></dl><div class="card-yaku-links"><strong>Appears in these combinations</strong><p>${related.length ? related.map(yaku => Utils.escape(yaku.name)).join(' · ') : 'A useful month-matching card; it mainly contributes to category totals.'}</p></div><div class="card-detail-actions">${canPlay ? `<button id="btn-detail-play" class="primary" type="button">PLAY THIS CARD</button>` : ''}<button id="btn-detail-close" class="secondary" type="button">BACK TO TABLE</button></div></div></div>`;
            const playButton = document.getElementById('btn-detail-play'); if (playButton) playButton.onclick = () => { UI.closeCardDetail(); UI.setModalOverlay(false); requestAnimationFrame(() => Net.sendAction({ type: 'PLAY_HAND_CARD', cardId: card.id })); };
            document.getElementById('btn-detail-close').onclick = UI.closeCardDetail;
            document.getElementById('card-detail-modal').classList.remove('hidden'); UI.setModalOverlay(true);
        },
        closeCardDetail() { document.getElementById('card-detail-modal').classList.add('hidden'); UI.syncModalOverlay(); },
        openAppearance() {
            const state = App.gameState || {}; const me = state.players?.find(player => player.id === App.localId);
            let cards = [...(me?.hand || []), ...(me?.captured || []), ...(state.field || [])].filter(card => !card.hidden && card.asset).slice(0, 4);
            if (cards.length < 3 && typeof HanafudaRules?.createDeck === 'function') cards = HanafudaRules.createDeck(() => 0.37).slice(0, 4);
            document.getElementById('appearance-preview').innerHTML = `${cards.map(card => UI.cardMarkup(card)).join('')}<div class="hana-card card-back" role="img" aria-label="Selected card back"></div>`;
            UI.setCardBack(document.documentElement.dataset.hanafudaBack); UI.setCardFront(document.documentElement.dataset.hanafudaFront);
            document.getElementById('appearance-modal').classList.remove('hidden'); UI.setModalOverlay(true);
        },
        closeAppearance() { document.getElementById('appearance-modal').classList.add('hidden'); UI.syncModalOverlay(); },
        setModalOverlay(open) {
            const overlay = document.getElementById('modal-overlay'); const visible = Boolean(open);
            overlay.classList.toggle('hidden', !visible); overlay.toggleAttribute('hidden', !visible); overlay.setAttribute('aria-hidden', String(!visible));
        },
        syncModalOverlay() {
            const open = ['rules-modal', 'capture-modal', 'koi-choice-modal', 'overview-modal', 'card-detail-modal', 'appearance-modal', 'result-modal'].some(id => !document.getElementById(id).classList.contains('hidden'));
            UI.setModalOverlay(open);
        },
        inspectFinalTable() {
            const state = App.gameState; if (state) App.ui.dismissedRound = state.roundNumber;
            App.ui.animationRun += 1; UI.clearTurnAnimation();
            ['rules-modal', 'capture-modal', 'koi-choice-modal', 'overview-modal', 'card-detail-modal', 'appearance-modal', 'result-modal'].forEach(id => document.getElementById(id).classList.add('hidden'));
            const gameView = document.getElementById('game-view'); gameView.classList.add('final-table-inspection'); UI.setModalOverlay(false);
            if (state) { UI.renderStatus(state); UI.renderOpponents(state); UI.renderField(state); UI.renderCaptures(state); UI.renderHand(state); UI.renderActions(state); }
            requestAnimationFrame(() => { void gameView.offsetHeight; gameView.classList.add('final-table-inspection'); UI.setModalOverlay(false); });
        },
        hideResult() { UI.inspectFinalTable(); },
        showResult() { if (!App.gameState || !['END_ROUND', 'MATCH_OVER'].includes(App.gameState.phase)) return; document.getElementById('game-view').classList.remove('final-table-inspection'); App.ui.dismissedRound = null; UI.renderResult(App.gameState); },
        startNextMonth() { if (!App.isHost || App.gameState?.phase !== 'END_ROUND') return UI.showToast('Only the host can deal the next month.', 'danger'); App.ui.dismissedRound = App.gameState.roundNumber; UI.hideResult(); Net.sendAction({ type: 'START_NEXT_ROUND' }); },
        shouldDeferResult(state) {
            const nonce = state?.turnAnimation?.nonce;
            return Boolean(nonce && (App.ui.activeAnimationNonce === nonce || App.ui.lastTurnAnimationNonce !== nonce));
        },
        snapshotRect(element) {
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null;
        },
        captureTurnAnimationOrigins(state) {
            const sequence = state?.turnAnimation;
            if (!sequence?.nonce || sequence.nonce === App.ui.lastTurnAnimationNonce || sequence.nonce === App.ui.animationOrigins?.nonce) return;
            const ids = new Set([sequence.hand?.card?.id, ...(sequence.hand?.captured || []).map(card => card.id), sequence.draw?.card?.id, ...(sequence.draw?.captured || []).map(card => card.id)].filter(Boolean));
            const cards = {};
            document.querySelectorAll('#field-cards .hana-card[data-info-card-id], #local-hand .hana-card[data-info-card-id]').forEach(element => {
                const id = element.dataset.infoCardId;
                if (ids.has(id) && !cards[id]) cards[id] = UI.snapshotRect(element);
            });
            App.ui.animationOrigins = { nonce: sequence.nonce, cards };
        },
        animationPoint(rect, cardWidth, cardHeight) { return { x: rect.left + rect.width / 2 - cardWidth / 2, y: rect.top + rect.height / 2 - cardHeight / 2 }; },
        animationOrigin(nonce, cardId, cardWidth, cardHeight, fallback) {
            const rect = App.ui.animationOrigins?.nonce === nonce ? App.ui.animationOrigins.cards?.[cardId] : null;
            return rect ? UI.animationPoint(rect, cardWidth, cardHeight) : fallback;
        },
        animationSource(playerId, source, cardWidth, cardHeight) {
            if (source === 'draw') return UI.animationPoint(document.getElementById('draw-pile').getBoundingClientRect(), cardWidth, cardHeight);
            if (playerId === App.localId) return UI.animationPoint(document.getElementById('hand-dock').getBoundingClientRect(), cardWidth, cardHeight);
            const seat = [...document.querySelectorAll('.opponent-seat')].find(item => item.dataset.playerId === playerId);
            return UI.animationPoint((seat?.querySelector('.mini-hand') || seat || document.getElementById('opponent-zone')).getBoundingClientRect(), cardWidth, cardHeight);
        },
        animationStageCenter(playerId, cardWidth, cardHeight) {
            const fieldRect = document.getElementById('field-zone').getBoundingClientRect();
            const field = UI.animationPoint(fieldRect, cardWidth, cardHeight); const local = playerId === App.localId;
            const seat = local ? document.getElementById('hand-dock') : [...document.querySelectorAll('.opponent-seat')].find(item => item.dataset.playerId === playerId);
            const seatRect = (seat || (local ? document.getElementById('hand-dock') : document.getElementById('opponent-zone'))).getBoundingClientRect();
            const seatPoint = UI.animationPoint(seatRect, cardWidth, cardHeight); const xReach = Math.min(72, fieldRect.width * .24); const yReach = Math.min(58, fieldRect.height * .34);
            return {
                x: field.x + Math.max(-xReach, Math.min(xReach, (seatPoint.x - field.x) * .3)),
                y: field.y + Math.max(-yReach, Math.min(yReach, (seatPoint.y - field.y) * .3))
            };
        },
        resolutionTarget(cardId, playerId, cardWidth, cardHeight) {
            const card = [...document.querySelectorAll('#table .hana-card[data-info-card-id]')].find(item => item.dataset.infoCardId === cardId && item.getBoundingClientRect().width > 0);
            if (card) { const rect = card.getBoundingClientRect(); return { ...UI.animationPoint(rect, cardWidth, cardHeight), scale: Math.max(.38, Math.min(1, rect.width / cardWidth)) }; }
            const local = playerId === App.localId; const seat = [...document.querySelectorAll('.opponent-seat')].find(item => item.dataset.playerId === playerId);
            const fallback = local ? document.getElementById('local-captures') : seat?.querySelector('.capture-groups');
            const rect = (fallback || document.getElementById('field-zone')).getBoundingClientRect();
            return { ...UI.animationPoint(rect, cardWidth, cardHeight), scale: fallback ? .58 : 1 };
        },
        hideResolutionTargets(cardIds) {
            const ids = new Set(cardIds || []);
            document.querySelectorAll('#table .hana-card[data-info-card-id]').forEach(card => card.classList.toggle('resolution-destination', ids.has(card.dataset.infoCardId)));
        },
        revealResolutionTargets(cardIds) {
            const ids = new Set(cardIds || []);
            document.querySelectorAll('#table .hana-card.resolution-destination[data-info-card-id]').forEach(card => {
                if (ids.has(card.dataset.infoCardId)) card.classList.remove('resolution-destination');
            });
        },
        clearTurnAnimation() {
            document.querySelectorAll('.turn-resolution-card').forEach(item => item.remove());
            document.querySelectorAll('.resolution-hidden, .resolution-destination').forEach(item => { item.classList.remove('resolution-hidden'); item.classList.remove('resolution-destination'); });
            App.ui.animatingCardIds = []; App.ui.activeAnimationNonce = null;
        },
        makeResolutionCard(card, tone, label, cardWidth, fromDeck = false) {
            const shell = document.createElement('div'); shell.className = `turn-resolution-card tone-${tone}${fromDeck ? ' from-deck' : ''}`; shell.style.setProperty('--card-w', `${cardWidth}px`); shell.dataset.cardId = card.id;
            shell.innerHTML = fromDeck ? `<div class="resolution-flipper"><div class="resolution-side resolution-back"><div class="hana-card card-back"></div></div><div class="resolution-side resolution-front">${UI.cardMarkup(card, false, 'animation')}</div></div><span>${label}</span>` : `${UI.cardMarkup(card, false, 'animation')}<span>${label}</span>`;
            document.getElementById('animation-layer').appendChild(shell); return shell;
        },
        moveResolutionCard(shell, from, to, duration, options = {}) {
            const delay = options.delay || 0; const fromScale = options.fromScale ?? 1; const toScale = options.toScale ?? 1;
            const animation = shell.animate([
                { transform: `translate3d(${from.x}px, ${from.y}px, 0) scale(${fromScale})`, opacity: options.fromOpacity ?? 1 },
                { transform: `translate3d(${to.x}px, ${to.y}px, 0) scale(${toScale})`, opacity: options.toOpacity ?? 1 }
            ], { duration, delay, easing: options.easing || 'cubic-bezier(.2,.78,.2,1)', fill: 'forwards' });
            return animation.finished.catch(() => {});
        },
        waitForAnimation(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); },
        async settleResolutionGroup(entries, playerId, cardWidth, cardHeight, duration = 430) {
            await Promise.all(entries.map(entry => {
                const target = UI.resolutionTarget(entry.card.id, playerId, cardWidth, cardHeight);
                return UI.moveResolutionCard(entry.shell, entry.stage, target, duration, { toScale: target.scale, toOpacity: .88, easing: 'cubic-bezier(.22,.7,.18,1)' });
            }));
            const ids = entries.map(entry => entry.card.id); UI.revealResolutionTargets(ids); entries.forEach(entry => entry.shell.remove());
        },
        async animateAction(state) {
            const sequence = state.turnAnimation;
            if (!sequence?.nonce) { if (App.ui.animatingCardIds.length) { App.ui.animationRun += 1; UI.clearTurnAnimation(); } return; }
            if (sequence.nonce === App.ui.lastTurnAnimationNonce) { UI.hideResolutionTargets(App.ui.animatingCardIds); return; }
            App.ui.lastTurnAnimationNonce = sequence.nonce;
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { UI.clearTurnAnimation(); return; }
            const HAND_FLIGHT_MS = 420; const DRAW_FLIGHT_MS = 680; const run = ++App.ui.animationRun;
            UI.clearTurnAnimation(); App.ui.activeAnimationNonce = sequence.nonce;
            const sample = document.querySelector('#field-cards .hana-card, #local-hand .hana-card, #draw-pile'); const sampleRect = sample?.getBoundingClientRect();
            const cardWidth = Math.max(42, sampleRect?.width || 58); const cardHeight = Math.max(64, sampleRect?.height || cardWidth * 1.52);
            const fieldRect = document.getElementById('field-zone').getBoundingClientRect(); const center = UI.animationStageCenter(sequence.playerId, cardWidth, cardHeight);
            const uniqueCards = new Map();
            [sequence.hand.card, ...sequence.hand.captured, sequence.draw?.card, ...(sequence.draw?.captured || [])].filter(Boolean).forEach(card => uniqueCards.set(card.id, card));
            App.ui.animatingCardIds = [...uniqueCards.keys()]; UI.hideResolutionTargets(App.ui.animatingCardIds);

            const stageLayout = cards => cards.map((card, index) => ({ card, stage: { x: center.x + (index - (cards.length - 1) / 2) * Math.min(cardWidth * .42, 26), y: center.y + Math.abs(index - (cards.length - 1) / 2) * 4 } }));
            const handCards = [sequence.hand.card, ...sequence.hand.captured.filter(card => card.id !== sequence.hand.card.id)];
            const handEntries = stageLayout(handCards).map((entry, index) => ({ ...entry, shell: UI.makeResolutionCard(entry.card, index ? 'table' : 'hand', index ? 'TABLE MATCH' : 'HAND PLAY', cardWidth) }));
            await Promise.all(handEntries.map((entry, index) => {
                const fallback = index ? { x: fieldRect.left + fieldRect.width * (.25 + index * .12), y: fieldRect.top + fieldRect.height * .45 } : UI.animationSource(sequence.playerId, 'hand', cardWidth, cardHeight);
                const source = UI.animationOrigin(sequence.nonce, entry.card.id, cardWidth, cardHeight, fallback);
                return UI.moveResolutionCard(entry.shell, source, entry.stage, HAND_FLIGHT_MS, { easing: 'cubic-bezier(.16,.76,.18,1)', fromOpacity: App.ui.animationOrigins?.cards?.[entry.card.id] ? 1 : .35 });
            }));
            if (run !== App.ui.animationRun) return;
            await UI.waitForAnimation(230);
            if (run !== App.ui.animationRun) return;
            await UI.settleResolutionGroup(handEntries, sequence.playerId, cardWidth, cardHeight, 420);
            if (run !== App.ui.animationRun) return;
            await UI.waitForAnimation(150);

            if (sequence.draw?.card) {
                const drawMatches = sequence.draw.captured.filter(card => card.id !== sequence.draw.card.id);
                const drawCards = [sequence.draw.card, ...drawMatches];
                const drawEntries = stageLayout(drawCards).map((entry, index) => ({ ...entry, shell: UI.makeResolutionCard(entry.card, index ? 'table' : 'draw', index ? 'TABLE MATCH' : 'DECK FLIP', cardWidth, index === 0) }));
                const drawShell = drawEntries[0].shell;
                setTimeout(() => { if (run === App.ui.animationRun) drawShell.classList.add('revealed'); }, Math.round(DRAW_FLIGHT_MS * .36));
                await Promise.all(drawEntries.map((entry, index) => {
                    if (!index) return UI.moveResolutionCard(entry.shell, UI.animationSource(sequence.playerId, 'draw', cardWidth, cardHeight), entry.stage, DRAW_FLIGHT_MS, { easing: 'cubic-bezier(.13,.72,.16,1)' });
                    const fallback = { x: fieldRect.left + fieldRect.width * (.35 + index * .11), y: fieldRect.top + fieldRect.height * .5 };
                    const source = UI.animationOrigin(sequence.nonce, entry.card.id, cardWidth, cardHeight, fallback);
                    return UI.moveResolutionCard(entry.shell, source, entry.stage, DRAW_FLIGHT_MS - 250, { delay: 250, easing: 'cubic-bezier(.2,.74,.18,1)', fromOpacity: App.ui.animationOrigins?.cards?.[entry.card.id] ? 1 : .35 });
                }));
                if (run !== App.ui.animationRun) return;
                await UI.waitForAnimation(260);
                if (run !== App.ui.animationRun) return;
                await UI.settleResolutionGroup(drawEntries, sequence.playerId, cardWidth, cardHeight, sequence.draw.captured.length ? 470 : 390);
            }
            if (run === App.ui.animationRun) { await UI.waitForAnimation(90); UI.clearTurnAnimation(); }
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
        syncNameInputs(state) { const me = state?.players?.find(player => player.id === App.localId); const name = App.isSpectator ? state?.spectatorName : me?.name; if (!name) return; App.localName = name; ['room-player-name', 'game-player-name'].forEach(id => { const input = document.getElementById(id); if (input && document.activeElement !== input) input.value = name; }); },
        openRules() { document.getElementById('rules-modal').classList.remove('hidden'); UI.setModalOverlay(true); },
        closeRules() { document.getElementById('rules-modal').classList.add('hidden'); UI.syncModalOverlay(); },
        closeTopModal() {
            if (!document.getElementById('card-detail-modal').classList.contains('hidden')) UI.closeCardDetail();
            else if (!document.getElementById('appearance-modal').classList.contains('hidden')) UI.closeAppearance();
            else if (!document.getElementById('overview-modal').classList.contains('hidden')) UI.closeOverview();
            else if (!document.getElementById('rules-modal').classList.contains('hidden')) UI.closeRules();
            else if (!document.getElementById('result-modal').classList.contains('hidden')) UI.hideResult();
            else if (!document.getElementById('koi-choice-modal').classList.contains('hidden')) UI.showToast('Choose Shobu or Koi-Koi to continue.', 'danger');
        },
        leaveGame() { App.leaving = true; RoomTools.RoleControl.update({ visible: false }); RoomTools.ParticipantManager.close(); Game.bots?.stop(); Object.values(App.connections).forEach(connection => { try { connection.close(); } catch (error) {} }); App.guestLink?.stop?.(); App.roomRelay?.close?.(); try { App.hostConnection?.close(); } catch (error) {} try { App.peer?.destroy(); } catch (error) {} const url = new URL(location.href); url.search = ''; url.hash = ''; location.replace(url.href); }
    };

    window.HanafudaApp = { App, Game, Net, UI, Utils };
    window.addEventListener('load', UI.initialize);
})();
