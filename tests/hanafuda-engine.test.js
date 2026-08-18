const assert = require('assert');
const { HanafudaGameEngine } = require('../hanafuda/engine.js');
const Rules = require('../hanafuda/rules.js');

let seed = 1337;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000);
let ids = 0;
const engine = new HanafudaGameEngine({ random, makeId: () => `test-${++ids}`, now: () => 10000 + ids });
engine.addPlayer({ id: 'host', name: 'Host', isHost: true, connected: true, sessionToken: 'host-secret' });
engine.addPlayer({ id: 'guest', name: 'Guest', connected: true, sessionToken: 'guest-secret' });
assert.strictEqual(engine.startGame({ rounds: 3 }).ok, true);
assert.strictEqual(engine.state.players.every(player => player.hand.length === 8), true);
assert.strictEqual(engine.state.field.length, 8);
assert.strictEqual(engine.state.deck.length, 24);
assert(!Object.values(Rules.byMonth(engine.state.field)).some(group => group.length === 4));

const privateView = engine.getViewState('host');
assert.strictEqual(privateView.deck, undefined, 'The deck order must never leave the host');
assert.strictEqual(privateView.deckCount, 24);
assert(privateView.players.find(player => player.id === 'guest').hand.every(card => card.hidden && !card.month));
assert(privateView.players.every(player => player.sessionToken === ''));
const godView = engine.getViewState('host', true);
assert(godView.players.every(player => player.hand.every(card => card.month)));

let actions = 0;
while (!['END_ROUND', 'MATCH_OVER'].includes(engine.state.phase) && actions++ < 100) {
    const active = engine.activePlayer();
    if (engine.state.phase === 'WAIT_HAND_SELECTION') engine.playHandCard(active.id, active.hand[0].id);
    else if (['WAIT_HAND_CAPTURE', 'WAIT_DRAW_CAPTURE'].includes(engine.state.phase)) engine.chooseCapture(active.id, engine.state.pending.choiceIds[0]);
    else if (engine.state.phase === 'WAIT_KOI_KOI_CHOICE') engine.resolveKoiChoice(active.id, false);
}
assert(actions < 100, `Round deadlocked in ${engine.state.phase}`);
assert(engine.state.roundResult && engine.state.roundResult.points > 0);

seed = 2026;
const awayEngine = new HanafudaGameEngine({ random, makeId: () => `away-${++ids}`, now: () => 20000 + ids });
awayEngine.addPlayer({ id: 'away', name: 'Away player', isHost: true, connected: true });
awayEngine.addPlayer({ id: 'seat', name: 'Other seat', connected: true });
assert.strictEqual(awayEngine.startGame({ rounds: 3 }).ok, true);
const awayId = awayEngine.state.turnPlayerId;
awayEngine.disconnectPlayer(awayId);
for (let guard = 0; awayEngine.state.turnPlayerId === awayId && guard < 4; guard += 1) {
    assert.strictEqual(awayEngine.skipDisconnectedTurn(), true);
}
assert.notStrictEqual(awayEngine.state.turnPlayerId, awayId, 'An absent Hanafuda seat must not deadlock the table');

console.log('Hanafuda engine: deal, privacy, disconnect recovery, turn/capture loop, scoring, and round termination passed.');
