const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const shared = fs.readFileSync(path.join(root, 'multiplayer.js'), 'utf8');
const sharedCss = fs.readFileSync(path.join(root, 'multiplayer.css'), 'utf8');
const bazunga = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const presidentHtml = fs.readFileSync(path.join(root, 'president', 'index.html'), 'utf8');
const presidentApp = fs.readFileSync(path.join(root, 'president', 'app.js'), 'utf8');
const durakHtml = fs.readFileSync(path.join(root, 'durak', 'index.html'), 'utf8');
const durakApp = fs.readFileSync(path.join(root, 'durak', 'app.js'), 'utf8');
const hanafudaHtml = fs.readFileSync(path.join(root, 'hanafuda', 'index.html'), 'utf8');
const hanafudaApp = fs.readFileSync(path.join(root, 'hanafuda', 'app.js'), 'utf8');

for (const [name, html] of [['Bazunga', bazunga], ['President', presidentHtml], ['Durak', durakHtml], ['Hanafuda', hanafudaHtml]]) {
    assert(html.includes('id="room-name"'), `${name} must accept a custom room name`);
    assert(html.includes('id="room-name-suggestions"'), `${name} must render collision alternatives`);
    assert(html.includes('id="btn-spectate"'), `${name} must offer spectator entry`);
    assert(html.includes('id="allow-spectators"') && html.includes('checked'), `${name} spectator mode must default on`);
    assert(html.includes('id="btn-manage-room"'), `${name} hosts need a participant-management menu`);
    assert(html.includes('id="spectator-prev"') && html.includes('id="spectator-next"'), `${name} spectators need perspective arrows`);
}

for (const [name, html] of [['Bazunga', bazunga], ['President', presidentHtml], ['Durak', durakHtml], ['Hanafuda', hanafudaHtml]]) {
    assert(html.includes('id="btn-copy-invite"'), `${name} guests need a one-tap invite copy control`);
    assert(html.includes('id="room-player-name"') && html.includes('id="btn-room-rename"'), `${name} room players must be able to rename`);
    assert(html.includes('id="lobby-chat-messages"') && html.includes('id="lobby-chat-send"'), `${name} needs chat before the deal`);
    const roomId = html.indexOf('id="lobby-room"');
    const roomStart = html.lastIndexOf('<div', roomId);
    const roomEnd = html.indexOf('id="game-view"', roomStart);
    const room = html.slice(roomStart, roomEnd);
    const inviteBlock = room.indexOf('class="room-invite-copy"');
    const copyButton = room.indexOf('id="btn-copy-invite"');
    const qrCode = room.indexOf('id="qr-container"');
    assert(roomStart >= 0 && room.includes('game-room-card'), `${name} room needs the shared compact scroll surface`);
    assert(inviteBlock >= 0 && copyButton > inviteBlock && qrCode > copyButton, `${name} copy action must sit below the room ID and to the left of its QR`);
    assert(/id="allow-spectators"[\s\S]*?<\/label>\s*<button id="btn-start-game"/.test(room), `${name} spectator permission must sit directly above the deal action`);
}

assert(shared.includes("error?.type === 'unavailable-id'"), 'Room collisions must use the PeerJS unavailable-id signal');
assert(shared.includes('correctLevel') && shared.includes('size = 220'), 'QR codes must be generated natively at scanning resolution');
assert(shared.includes('room-qr-modal') && shared.includes('Math.min(420'), 'Tapping a QR must create a large scanner modal');
assert(shared.includes('modal._returnFocus'), 'Closing the enlarged QR must return keyboard focus to its trigger');
assert(sharedCss.includes('cursor: zoom-in') && sharedCss.includes('#room-qr-large'), 'QR affordance and modal must be visibly styled');
assert(sharedCss.includes('calc(100vw - 28px)') && sharedCss.includes('width: 72px !important'), 'Narrow mobile lobbies and their QR preview must stay inside the viewport');
assert(sharedCss.includes('aspect-ratio: 1 / 1') && sharedCss.includes('object-fit: contain'), 'Room QR holders and generated codes must stay perfectly square');
assert(sharedCss.includes('#lobby > .game-room-card') && sharedCss.includes('-webkit-overflow-scrolling: touch') && sharedCss.includes('touch-action: pan-y'), 'Mobile room settings must retain a reliable native scroll surface');
assert(sharedCss.includes('.game-room-card .player-list') && sharedCss.includes('max-height: none !important') && sharedCss.includes('overflow: visible !important'), 'Room rosters must expand naturally while the overall room page scrolls');
assert(!bazunga.includes('user-scalable=no'), 'Bazunga must not disable native mobile zoom');

assert(shared.includes('const RoleControl') && shared.includes('Switch to spectator') && shared.includes('Take a player seat') && shared.includes('options.onManage'), 'Every room needs a clearly labelled player/spectator control and persistent host manager access');
assert(shared.includes('const ParticipantManager') && shared.includes('participant-confirm') && shared.includes('YES · KICK'), 'Host kicks must require an in-app confirmation step');

for (const [name, app] of [['President', presidentApp], ['Durak', durakApp], ['Hanafuda', hanafudaApp]]) {
    assert(app.includes('RoomTools.ResilientJoin.connect'), `${name} must use the shared resilient connection path`);
    assert(app.includes('RoomTools.RoomRelay.host'), `${name} hosts must accept cloud-relayed guests`);
    assert(app.includes("App.peer.on('disconnected'"), `${name} must reconnect to PeerServer signalling`);
    assert(app.includes('scheduleReconnect('), `${name} must automatically recover a dropped game channel`);
    assert(app.includes('RoomTools.PEER_OPEN_TIMEOUT_MS'), `${name} must recover when signalling never opens`);
    assert(app.includes('App.fallbackClientId'), `${name} must be able to join when signalling never provides an identity`);
    assert(app.includes('resetJoinAttempt(') && app.includes('App.localId = null'), `${name} retries must discard stale peer identities`);
    assert(app.includes('Net.sendState(connection, connection.peer)'), `${name} joins must receive an explicit first state`);
    assert(app.includes('const sameSeat ='), `${name} must accept retried JOIN handshakes for an existing seat`);
    assert(app.includes('App.connections[connection.peer] !== connection'), `${name} must ignore stale connection close events`);
    assert(app.includes('SPECTATOR_PERSPECTIVE'), `${name} must route spectator perspective changes through the host`);
    assert(app.includes('playerId: returning.id') || app.includes('playerId: reconnecting.id') || app.includes('playerId: oldId'), `${name} reconnects must retain a stable game-seat identity`);
    assert(app.includes('HOST_BACKUP') && app.includes('promoteFromBackup'), `${name} must promote a human vice-host without resetting the game`);
    assert(app.includes('kickPlayer('), `${name} hosts must be able to remove a player without banning the room code`);
    assert(app.includes('switchConnectionRole(') && app.includes("'ROLE_SWITCH'"), `${name} must synchronize role changes through the host`);
    assert(app.includes("'CHAT'") && app.includes("'RENAME'"), `${name} spectators must be able to chat and rename`);
    assert(app.includes("role: 'spectator'") && app.includes("App.allowSpectators"), `${name} must convert late joins into spectators when permitted`);
    const seatCheck = app.indexOf('const sameSeat = !requestedSpectator');
    const lateSpectatorCheck = app.indexOf("requestedSpectator ||", seatCheck);
    assert(seatCheck >= 0 && lateSpectatorCheck > seatCheck && app.slice(seatCheck, lateSpectatorCheck).includes('!requestedSpectator &&'), `${name} must reclaim a disconnected seat before auto-spectating a genuinely new late join`);
    assert(app.includes('App.requestedSpectator = App.isSpectator'), `${name} reconnects must preserve an intentional role switch`);
}

assert(bazunga.includes('RoomTools.ResilientJoin.connect') && bazunga.includes('scheduleReconnect: hostId'), 'Bazunga must share resilient reconnect behavior');
assert(bazunga.includes('RoomTools.RoomRelay.host') && bazunga.includes('RoomTools.PEER_OPEN_TIMEOUT_MS'), 'Bazunga must accept relayed guests and recover from signalling timeouts');
assert(bazunga.includes('resetJoinAttempt:') && bazunga.includes('App.localId = null'), 'Bazunga retries must discard stale peer identities');
assert(bazunga.includes('UI.resetLobbyButtons();') && !bazunga.includes("const joinButton = document.getElementById('btn-join');\n            if (joinButton)"), 'Bazunga failures must restore Host, Join, and Spectate controls together');
assert(bazunga.includes('player.sessionToken = \'\''), 'Bazunga state delivery must hide other reconnect tokens');
assert(bazunga.includes('App.connections[conn.peer] !== conn'), 'Bazunga must ignore stale connection close events');
assert(bazunga.includes("playerId: existing.id") && !bazunga.includes('existing.id = conn.peer'), 'Bazunga reconnects must preserve the stable seat and pending final orbit');
assert(bazunga.includes("data.type === 'HOST_BACKUP'") && bazunga.includes('promoteFromBackup:'), 'Bazunga must promote a human vice-host without resetting the game');
assert(bazunga.includes('switchConnectionRole:') && bazunga.includes("'ROLE_SWITCH'"), 'Bazunga must synchronize player/spectator switching through the host');
assert(bazunga.includes("'CHAT'") && bazunga.includes("'RENAME'"), 'Bazunga spectators must be able to chat and rename');
const bazungaSeatCheck = bazunga.indexOf('const sameSeat = !requestedSpectator');
const bazungaLateSpectatorCheck = bazunga.indexOf("requestedSpectator ||", bazungaSeatCheck);
assert(bazungaSeatCheck >= 0 && bazungaLateSpectatorCheck > bazungaSeatCheck && bazunga.slice(bazungaSeatCheck, bazungaLateSpectatorCheck).includes('!requestedSpectator &&'), 'Bazunga must reclaim a disconnected seat before auto-spectating a genuinely new late join');
assert(bazunga.includes('App.requestedSpectator = App.isSpectator'), 'Bazunga reconnects must preserve an intentional role switch');
assert(shared.includes('ConnectionProgress') && shared.includes('data-connection-log') && shared.includes('data-connection-error'), 'Join progress must expose stages, diagnostics, and exact errors');
assert(shared.includes("'HOST_SYNC_TIMEOUT'") && shared.includes("'RELAY_UNAVAILABLE'"), 'Join failures must identify the exact failed stage');
assert(sharedCss.includes('.connection-progress-track') && sharedCss.includes('.connection-progress-retry'), 'The progress bar and retry action must be visibly styled');
assert(sharedCss.includes('.join-row > .connection-progress') && sharedCss.includes('grid-column: 1 / -1'), 'President and Durak progress panels must span the full mobile join row');

console.log('Multiplayer UI: custom rooms, enlarged QR, resilient joins, visible diagnostics, reconnects, and spectator controls passed.');
