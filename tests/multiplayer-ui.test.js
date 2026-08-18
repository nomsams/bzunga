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

for (const [name, html] of [['Bazunga', bazunga], ['President', presidentHtml], ['Durak', durakHtml]]) {
    assert(html.includes('id="room-name"'), `${name} must accept a custom room name`);
    assert(html.includes('id="room-name-suggestions"'), `${name} must render collision alternatives`);
    assert(html.includes('id="btn-spectate"'), `${name} must offer spectator entry`);
    assert(html.includes('id="allow-spectators"') && html.includes('checked'), `${name} spectator mode must default on`);
    assert(html.includes('id="spectator-prev"') && html.includes('id="spectator-next"'), `${name} spectators need perspective arrows`);
}

assert(shared.includes("error?.type === 'unavailable-id'"), 'Room collisions must use the PeerJS unavailable-id signal');
assert(shared.includes('correctLevel') && shared.includes('size = 220'), 'QR codes must be generated natively at scanning resolution');
assert(shared.includes('room-qr-modal') && shared.includes('Math.min(420'), 'Tapping a QR must create a large scanner modal');
assert(shared.includes('modal._returnFocus'), 'Closing the enlarged QR must return keyboard focus to its trigger');
assert(sharedCss.includes('cursor: zoom-in') && sharedCss.includes('#room-qr-large'), 'QR affordance and modal must be visibly styled');
assert(sharedCss.includes('calc(100vw - 28px)') && sharedCss.includes('width: 72px !important'), 'Narrow mobile lobbies and their QR preview must stay inside the viewport');
assert(!bazunga.includes('user-scalable=no'), 'Bazunga must not disable native mobile zoom');

for (const [name, app] of [['President', presidentApp], ['Durak', durakApp]]) {
    assert(app.includes("serialization: 'json'"), `${name} must use cross-browser JSON data channels`);
    assert(app.includes("App.peer.on('disconnected'"), `${name} must reconnect to PeerServer signalling`);
    assert(app.includes('scheduleReconnect('), `${name} must automatically recover a dropped game channel`);
    assert(app.includes('RoomTools.PEER_OPEN_TIMEOUT_MS'), `${name} must recover when signalling never opens`);
    assert(app.includes('RoomTools.CONNECTION_OPEN_TIMEOUT_MS'), `${name} must recover when a room channel never opens`);
    assert(app.includes("connection._openTimer"), `${name} must clear and replace per-channel connection timers`);
    assert(app.includes("connection.close()"), `${name} must restart a channel that never delivers table state`);
    assert(app.includes('resetJoinAttempt(') && app.includes('App.localId = null'), `${name} retries must discard stale peer identities`);
    assert(app.includes('Net.sendState(connection, connection.peer)'), `${name} joins must receive an explicit first state`);
    assert(app.includes('const sameSeat ='), `${name} must accept retried JOIN handshakes for an existing seat`);
    assert(app.includes('App.connections[connection.peer] !== connection'), `${name} must ignore stale connection close events`);
    assert(app.includes('SPECTATOR_PERSPECTIVE'), `${name} must route spectator perspective changes through the host`);
}

assert(bazunga.includes("serialization: 'json'") && bazunga.includes('scheduleReconnect: hostId'), 'Bazunga must share cross-browser reconnect behavior');
assert(bazunga.includes('RoomTools.PEER_OPEN_TIMEOUT_MS') && bazunga.includes('RoomTools.CONNECTION_OPEN_TIMEOUT_MS'), 'Bazunga must recover both signalling and room-channel timeouts');
assert(bazunga.includes('resetJoinAttempt:') && bazunga.includes('App.localId = null'), 'Bazunga retries must discard stale peer identities');
assert(bazunga.includes('UI.resetLobbyButtons();') && !bazunga.includes("const joinButton = document.getElementById('btn-join');\n            if (joinButton)"), 'Bazunga failures must restore Host, Join, and Spectate controls together');
assert(bazunga.includes('player.sessionToken = \'\''), 'Bazunga state delivery must hide other reconnect tokens');
assert(bazunga.includes('App.connections[conn.peer] !== conn'), 'Bazunga must ignore stale connection close events');
assert(bazunga.includes('.map(playerId => playerId === oldId ? conn.peer : playerId)'), 'Bazunga reconnects must preserve a pending final orbit');

console.log('Multiplayer UI: custom rooms, enlarged QR, mobile zoom, reliable joins, reconnects, and spectator controls passed.');
