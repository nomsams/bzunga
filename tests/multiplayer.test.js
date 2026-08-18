const assert = require('assert');
const fs = require('fs');
const path = require('path');

require('../multiplayer.js');
const RoomTools = global.RoomTools;
const multiplayerSource = fs.readFileSync(path.join(__dirname, '..', 'multiplayer.js'), 'utf8');
const { PresidentGameEngine } = require('../president/engine.js');
const { DurakGameEngine } = require('../durak/engine.js');

assert.strictEqual(RoomTools.makeRoomId('president', ' Friday   Cabinet! '), 'bz-president-friday-cabinet');
assert.strictEqual(RoomTools.makeRoomId('president', 'FRIDAY-CABINET'), 'bz-president-friday-cabinet', 'Similar names must claim the same normalized room');
assert.strictEqual(RoomTools.makeRoomId('durak', 'Friday Cabinet'), 'bz-durak-friday-cabinet', 'Room namespaces must stay game-specific');
assert.strictEqual(RoomTools.resolveJoinId('bazunga', 'My Table'), 'bz-bazunga-my-table');
assert.strictEqual(RoomTools.resolveJoinId('bazunga', 'bz-bazunga-direct-room'), 'bz-bazunga-direct-room');
assert.strictEqual(RoomTools.suggestions('My Table').length, 3);
assert.strictEqual(new Set(RoomTools.suggestions('My Table')).size, 3);
assert(RoomTools.PEER_OPEN_TIMEOUT_MS >= 8000, 'Slow mobile signalling must get a realistic connection window');
assert(RoomTools.CONNECTION_OPEN_TIMEOUT_MS > RoomTools.PEER_OPEN_TIMEOUT_MS, 'Room channels need longer than signalling to open');
assert(RoomTools.STATE_SYNC_TIMEOUT_MS > RoomTools.JOIN_RETRY_MS, 'A retried join must have time to receive state before recovery');
const iceServers = RoomTools.peerOptions().config.iceServers;
assert(iceServers.some(server => String(server.urls).startsWith('stun:')), 'Direct P2P should still use STUN when available');
assert(!multiplayerSource.includes('openrelay.metered.ca'), 'The retired public Open Relay hostname must never be shipped again');
assert(RoomTools.DIRECT_FALLBACK_MS <= 5000, 'A blocked direct channel must switch to relay promptly');
assert(RoomTools.RELAY_CONNECT_TIMEOUT_MS >= 12000, 'Mobile WebSocket relay negotiation needs a realistic timeout');
assert(RoomTools.RoomRelay && RoomTools.ResilientJoin, 'An independent room relay must back up direct P2P');
assert(multiplayerSource.includes("name: 'AES-GCM'") && multiplayerSource.includes("digest('SHA-256'"), 'Relay packets and room topics must be encrypted and opaque');
assert(multiplayerSource.includes("qos: 1, retain: false"), 'Relay messages must be delivered reliably without persisting game state');
assert(multiplayerSource.includes('broker.hivemq.com') && multiplayerSource.includes('broker.emqx.io'), 'The WebSocket relay must have broker failover');
assert(multiplayerSource.includes('brokers.forEach') && multiplayerSource.includes('connection._relayClient'), 'Hosts must listen on every independent broker and answer on the guest broker');
assert(multiplayerSource.includes('rememberRelayMessage') && multiplayerSource.includes('messageId: relayMessageId()'), 'QoS retries must not replay game actions');
const customIceServers = [{ urls: 'turn:relay.example.test:443', username: 'room', credential: 'secret' }];
global.BZUNGA_ICE_SERVERS = customIceServers;
assert.strictEqual(RoomTools.peerOptions().config.iceServers, customIceServers, 'A deployment must be able to replace the default relay credentials');
delete global.BZUNGA_ICE_SERVERS;

const president = new PresidentGameEngine({ random: () => 0.42 });
president.addPlayer({ id: 'p1', name: 'One', connected: true });
president.addPlayer({ id: 'p2', name: 'Two', connected: true });
president.addPlayer({ id: 'p3', name: 'Three', connected: true });
assert.strictEqual(president.startGame().ok, true);
const privatePresident = president.getViewState('p1');
const godPresident = president.getViewState('p1', true);
assert(privatePresident.players.find(player => player.id === 'p2').hand.every(card => card.hidden), 'Regular President views must hide opponents');
assert(godPresident.players.every(player => player.hand.every(card => !card.hidden)), 'President spectators must be able to inspect every hand');
assert(godPresident.players.every(player => player.sessionToken === ''), 'Spectator state must never expose reconnect tokens');

const disconnectedPresident = president.state.players.find(player => player.id === 'p2');
president.state.phase = 'play';
president.state.turnIndex = president.state.players.indexOf(disconnectedPresident);
president.state.trick = president.createEmptyTrick();
president.disconnectPlayer('p2');
assert.notStrictEqual(president.activePlayer()?.id, 'p2', 'A disconnected President player must not block the current turn');

const durak = new DurakGameEngine({ random: () => 0.31 });
durak.addPlayer({ id: 'd1', name: 'One', connected: true, sessionToken: 'token-one' });
durak.addPlayer({ id: 'd2', name: 'Two', connected: true, sessionToken: 'token-two' });
durak.addPlayer({ id: 'd3', name: 'Three', connected: true, sessionToken: 'token-three' });
assert.strictEqual(durak.startGame().ok, true);
const privateDurak = durak.getViewState('d1');
const godDurak = durak.getViewState('d1', true);
assert(privateDurak.players.find(player => player.id === 'd2').hand.every(card => card.hidden), 'Regular Durak views must hide opponents');
assert(godDurak.players.every(player => player.hand.every(card => !card.hidden)), 'Durak spectators must be able to inspect every hand');
assert(godDurak.players.every(player => player.sessionToken === ''), 'Durak god view must not expose reconnect tokens');

const absent = durak.getPlayer('d3');
const recycledCount = absent.hand.length;
const talonBefore = durak.state.talon.length;
absent.connected = false;
for (let turn = 0; turn < 4; turn++) durak.advanceDisconnectClock();
assert.strictEqual(durak.getPlayer('d3'), undefined, 'A Durak player missing more than three turns must lose their seat');
assert.strictEqual(durak.state.talon.length, talonBefore + recycledCount, 'The removed Durak hand must be shuffled back into the talon');

console.log('Multiplayer: resilient encrypted joins, normalized rooms, private/god views, reconnect skips, and Durak recycling passed.');
