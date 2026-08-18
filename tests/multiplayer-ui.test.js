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
    assert(html.includes('id="spectator-prev"') && html.includes('id="spectator-next"'), `${name} spectators need perspective arrows`);
}

for (const [name, html] of [['Bazunga', bazunga], ['President', presidentHtml], ['Durak', durakHtml], ['Hanafuda', hanafudaHtml]]) {
    assert(html.includes('id="btn-copy-invite"'), `${name} guests need a one-tap invite copy control`);
    assert(html.includes('id="room-player-name"') && html.includes('id="btn-room-rename"'), `${name} room players must be able to rename`);
    assert(html.includes('id="lobby-chat-messages"') && html.includes('id="lobby-chat-send"'), `${name} needs chat before the deal`);
}

assert(shared.includes("error?.type === 'unavailable-id'"), 'Room collisions must use the PeerJS unavailable-id signal');
assert(shared.includes('correctLevel') && shared.includes('size = 220'), 'QR codes must be generated natively at scanning resolution');
assert(shared.includes('room-qr-modal') && shared.includes('Math.min(420'), 'Tapping a QR must create a large scanner modal');
assert(shared.includes('modal._returnFocus'), 'Closing the enlarged QR must return keyboard focus to its trigger');
assert(sharedCss.includes('cursor: zoom-in') && sharedCss.includes('#room-qr-large'), 'QR affordance and modal must be visibly styled');
assert(sharedCss.includes('calc(100vw - 28px)') && sharedCss.includes('width: 72px !important'), 'Narrow mobile lobbies and their QR preview must stay inside the viewport');
assert(!bazunga.includes('user-scalable=no'), 'Bazunga must not disable native mobile zoom');

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
}

assert(bazunga.includes('RoomTools.ResilientJoin.connect') && bazunga.includes('scheduleReconnect: hostId'), 'Bazunga must share resilient reconnect behavior');
assert(bazunga.includes('RoomTools.RoomRelay.host') && bazunga.includes('RoomTools.PEER_OPEN_TIMEOUT_MS'), 'Bazunga must accept relayed guests and recover from signalling timeouts');
assert(bazunga.includes('resetJoinAttempt:') && bazunga.includes('App.localId = null'), 'Bazunga retries must discard stale peer identities');
assert(bazunga.includes('UI.resetLobbyButtons();') && !bazunga.includes("const joinButton = document.getElementById('btn-join');\n            if (joinButton)"), 'Bazunga failures must restore Host, Join, and Spectate controls together');
assert(bazunga.includes('player.sessionToken = \'\''), 'Bazunga state delivery must hide other reconnect tokens');
assert(bazunga.includes('App.connections[conn.peer] !== conn'), 'Bazunga must ignore stale connection close events');
assert(bazunga.includes("playerId: existing.id") && !bazunga.includes('existing.id = conn.peer'), 'Bazunga reconnects must preserve the stable seat and pending final orbit');
assert(bazunga.includes("data.type === 'HOST_BACKUP'") && bazunga.includes('promoteFromBackup:'), 'Bazunga must promote a human vice-host without resetting the game');
assert(shared.includes('ConnectionProgress') && shared.includes('data-connection-log') && shared.includes('data-connection-error'), 'Join progress must expose stages, diagnostics, and exact errors');
assert(shared.includes("'HOST_SYNC_TIMEOUT'") && shared.includes("'RELAY_UNAVAILABLE'"), 'Join failures must identify the exact failed stage');
assert(sharedCss.includes('.connection-progress-track') && sharedCss.includes('.connection-progress-retry'), 'The progress bar and retry action must be visibly styled');
assert(sharedCss.includes('.join-row > .connection-progress') && sharedCss.includes('grid-column: 1 / -1'), 'President and Durak progress panels must span the full mobile join row');

console.log('Multiplayer UI: custom rooms, enlarged QR, resilient joins, visible diagnostics, reconnects, and spectator controls passed.');
