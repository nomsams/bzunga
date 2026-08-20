const assert = require('assert');
const { HanafudaGameEngine } = require('../hanafuda/engine.js');
const Rules = require('../hanafuda/rules.js');

let seed = 1337;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000);
let ids = 0;
const engine = new HanafudaGameEngine({ random, makeId: () => `test-${++ids}`, now: () => 10000 + ids });
engine.addPlayer({ id: 'host', name: 'Host', isHost: true, connected: true, sessionToken: 'host-secret' });
engine.addPlayer({ id: 'guest', name: 'Guest', connected: true, sessionToken: 'guest-secret' });
assert.strictEqual(engine.startGame({ rounds: 3, cardArt: 'hawaii-svg' }).ok, true);
assert.strictEqual(engine.state.settings.cardArt, 'hawaii-svg');
assert.strictEqual(engine.state.players.every(player => player.hand.length === 8), true);
assert.strictEqual(engine.state.field.length, 8);
assert.strictEqual(engine.state.deck.length, 24);
assert(!Object.values(Rules.byMonth(engine.state.field)).some(group => group.length === 4));

const privateView = engine.getViewState('host');
assert.strictEqual(privateView.deck, undefined, 'The deck order must never leave the host');
assert.strictEqual(privateView.deckCount, 24);
assert(privateView.players.find(player => player.id === 'guest').hand.every(card => card.hidden && !card.month));
assert(privateView.players.find(player => player.id === 'guest').hand.every(card => card.id.startsWith('hidden-') && !card.id.startsWith('h-')), 'Hidden Hanafuda IDs must not encode card identity');
assert(privateView.players.every(player => player.sessionToken === ''));
const godView = engine.getViewState('host', true);
assert(godView.players.every(player => player.hand.every(card => card.month)));

let actions = 0;
let observedTurnAnimation = null;
while (!['END_ROUND', 'MATCH_OVER'].includes(engine.state.phase) && actions++ < 100) {
    const active = engine.activePlayer();
    if (engine.state.phase === 'WAIT_HAND_SELECTION') engine.playHandCard(active.id, active.hand[0].id);
    else if (['WAIT_HAND_CAPTURE', 'WAIT_DRAW_CAPTURE'].includes(engine.state.phase)) engine.chooseCapture(active.id, engine.state.pending.choiceIds[0]);
    else if (engine.state.phase === 'WAIT_KOI_KOI_CHOICE') engine.resolveKoiChoice(active.id, false);
    if (!observedTurnAnimation && engine.state.turnAnimation?.draw) observedTurnAnimation = JSON.parse(JSON.stringify(engine.state.turnAnimation));
}
assert(actions < 100, `Round deadlocked in ${engine.state.phase}`);
assert(engine.state.roundResult && engine.state.roundResult.points > 0);
assert(observedTurnAnimation?.nonce && observedTurnAnimation.hand?.card && observedTurnAnimation.draw?.card, 'A completed turn must publish both the hand play and automatic deck draw for animation');
assert(Array.isArray(observedTurnAnimation.hand.captured) && Array.isArray(observedTurnAnimation.draw.captured), 'Animation state must identify each public match and destination');
assert.notStrictEqual(observedTurnAnimation.hand.card.id, observedTurnAnimation.draw.card.id, 'Hand and draw animation cards must remain distinct');

const animationEngine = new HanafudaGameEngine({ random: () => 0.5, makeId: () => `animation-${++ids}`, now: () => 30000 + ids });
const animationDeck = Rules.createDeck(() => 0.5);
const animationHandCard = animationDeck.find(card => card.month === 1 && card.monthIndex === 0);
const animationDrawCard = animationDeck.find(card => card.month === 1 && card.monthIndex === 1);
const waitingCard = animationDeck.find(card => card.month === 2 && card.monthIndex === 0);
animationHandCard.ownerId = 'animator'; waitingCard.ownerId = 'waiting';
animationEngine.state.players = [
    { id: 'animator', name: 'Animator', connected: true, hand: [animationHandCard], captured: [], score: 0, lastChatAt: 0 },
    { id: 'waiting', name: 'Waiting', connected: true, hand: [waitingCard], captured: [], score: 0, lastChatAt: 0 }
];
animationEngine.state.phase = 'WAIT_HAND_SELECTION'; animationEngine.state.turnPlayerId = 'animator'; animationEngine.state.dealerId = 'animator'; animationEngine.state.roundNumber = 1;
animationEngine.state.field = []; animationEngine.state.deck = [animationDrawCard]; animationEngine.state.roundBaselines = { animator: { yaku: [], points: 0, signature: '' } };
assert.strictEqual(animationEngine.playHandCard('animator', animationHandCard.id).ok, true);
assert.strictEqual(animationEngine.state.turnAnimation.hand.captured.length, 0, 'An unmatched hand card must visibly wait on the field');
assert.deepStrictEqual(new Set(animationEngine.state.turnAnimation.draw.captured.map(card => card.id)), new Set([animationHandCard.id, animationDrawCard.id]), 'A deck card matching the just-played hand card must animate both cards into captures');

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
