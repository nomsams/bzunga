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
const awayHandBefore = awayEngine.getPlayer(awayId).hand.map(card => card.id);
awayEngine.disconnectPlayer(awayId);
for (let guard = 0; awayEngine.state.turnPlayerId === awayId && guard < 4; guard += 1) {
    assert.strictEqual(awayEngine.skipDisconnectedTurn(), true);
}
assert.notStrictEqual(awayEngine.state.turnPlayerId, awayId, 'An absent Hanafuda seat must not deadlock the table');
assert.deepStrictEqual(awayEngine.getPlayer(awayId).hand.map(card => card.id), awayHandBefore, 'Skipping an absent seat must never choose or expose one of its cards');

const scoreEngine = new HanafudaGameEngine({ random: () => 0.4, makeId: () => `score-${++ids}`, now: () => 40000 + ids });
scoreEngine.state.settings = { mode: 'trio', rounds: 3 };
scoreEngine.state.roundNumber = 2;
scoreEngine.state.dealerId = 'score-host';
scoreEngine.state.turnPlayerId = 'score-baba';
scoreEngine.state.phase = 'WAIT_KOI_KOI_CHOICE';
scoreEngine.state.players = [
    { id: 'score-host', name: 'Host', isHost: true, isBot: false, connected: true, hand: [{}], captured: [], score: 3 },
    { id: 'score-guest', name: 'Guest', isHost: false, isBot: false, connected: true, hand: [{}], captured: [], score: 5 },
    { id: 'score-baba', name: 'Baba Gupta', isHost: false, isBot: true, connected: true, hand: [{}], captured: [], score: 2 }
];
scoreEngine.state.pending = { playerId: 'score-baba', evaluation: { points: 7, yaku: [{ id: 'ameshiko', name: 'Ame-Shikō', points: 7 }] } };
scoreEngine.state.koiKoi = { 'score-guest': 1 };
assert.strictEqual(scoreEngine.resolveKoiChoice('score-baba', false).ok, true);
assert.strictEqual(scoreEngine.state.roundResult.points, 28, 'Seven-plus and failed-rival Koi-Koi multipliers must stack exactly once');
assert.deepStrictEqual(scoreEngine.state.roundResult.scoreBefore, { 'score-host': 3, 'score-guest': 5, 'score-baba': 2 });
assert.deepStrictEqual(scoreEngine.state.roundResult.scoreAfter, { 'score-host': 3, 'score-guest': 5, 'score-baba': 30 });
assert.strictEqual(scoreEngine.getPlayer('score-baba').score, 30, 'A bot win must add the award to its existing match score without changing either human score');

scoreEngine.state.players.forEach(player => { player.score = 12; });
scoreEngine.state.roundNumber = 3;
scoreEngine.state.dealerId = 'score-guest';
scoreEngine._endRound('score-host', 0, 'test-tie', { retainDealer: true, yaku: [] });
assert.strictEqual(scoreEngine.state.matchResult.winnerId, 'score-guest', 'A tied three-seat match must use the dealer tie-break deterministically');
scoreEngine.state.thinkingBots = ['score-guest'];
scoreEngine.state.typingBots = ['score-guest'];
assert.strictEqual(scoreEngine.reconnectPlayer('score-guest', 'score-guest-new'), true, 'A reserved seat should accept a fresh transport identity');
assert.strictEqual(scoreEngine.state.dealerId, 'score-guest-new');
assert.strictEqual(scoreEngine.state.matchResult.winnerId, 'score-guest-new', 'Reconnect migration must preserve a tied match winner');
assert(scoreEngine.state.matchResult.order.includes('score-guest-new') && !scoreEngine.state.matchResult.order.includes('score-guest'));
assert(Object.prototype.hasOwnProperty.call(scoreEngine.state.roundResult.scoreBefore, 'score-guest-new'));
assert(!Object.prototype.hasOwnProperty.call(scoreEngine.state.roundResult.scoreBefore, 'score-guest'));
assert.deepStrictEqual(scoreEngine.state.thinkingBots, ['score-guest-new']);
assert.deepStrictEqual(scoreEngine.state.typingBots, ['score-guest-new']);
assert.strictEqual(scoreEngine.reconnectPlayer('score-host', 'score-guest-new'), false, 'Reconnect migration must never create duplicate player IDs');

const stalled = new HanafudaGameEngine({ makeId: () => `stalled-${++ids}`, now: () => 50000 + ids });
stalled.state.settings = { mode: 'trio', rounds: 3 };
stalled.state.roundNumber = 1;
stalled.state.phase = 'WAIT_HAND_SELECTION';
stalled.state.dealerId = 'empty-bot';
stalled.state.turnPlayerId = 'empty-bot';
stalled.state.players = [
    { id: 'empty-bot', name: 'Baba Gupta', isBot: true, connected: true, hand: [], captured: [], score: 0 },
    { id: 'next-human', name: 'Next player', isBot: false, connected: true, hand: [{ id: 'playable' }], captured: [], score: 0 },
    { id: 'other-bot', name: 'Other bot', isBot: true, connected: true, hand: [], captured: [], score: 0 }
];
assert.strictEqual(stalled.recoverStalledTurn(), true, 'An empty active bot must be recovered instead of thinking forever');
assert.strictEqual(stalled.state.turnPlayerId, 'next-human');

const repairDeck = Rules.createDeck(() => 0.4);
const repairCard = repairDeck.find(card => card.month === 4 && card.monthIndex === 2);
const repairField = repairDeck.filter(card => card.month === 4 && card.id !== repairCard.id).slice(0, 2);
repairCard.ownerId = 'repair-bot';
const repair = new HanafudaGameEngine({ makeId: () => `repair-${++ids}`, now: () => 60000 + ids });
repair.state.settings = { mode: 'duel', rounds: 3 };
repair.state.roundNumber = 1;
repair.state.phase = 'WAIT_HAND_CAPTURE';
repair.state.dealerId = 'repair-bot';
repair.state.turnPlayerId = 'repair-bot';
repair.state.field = repairField;
repair.state.players = [
    { id: 'repair-bot', name: 'Baba Gupta', isBot: true, connected: true, hand: [{}], captured: [], score: 0 },
    { id: 'repair-human', name: 'Human', isBot: false, connected: true, hand: [{}], captured: [], score: 0 }
];
repair.state.pending = { playerId: 'repair-bot', source: 'hand', card: repairCard, choiceIds: [] };
repair.state.currentTurn = null;
assert.strictEqual(repair.recoverStalledTurn(), true, 'A restored capture with stale choices must be repaired');
assert.strictEqual(repair.state.pending.choiceIds.length, 2);
assert.strictEqual(repair.state.currentTurn.playerId, 'repair-bot');
assert.strictEqual(repair.chooseCapture('repair-bot', repair.state.pending.choiceIds[0]).ok, true, 'The repaired bot capture must complete normally');

const awayCapture = new HanafudaGameEngine({ makeId: () => `away-capture-${++ids}`, now: () => 65000 + ids });
awayCapture.state.settings = { mode: 'duel', rounds: 3 };
awayCapture.state.roundNumber = 1;
awayCapture.state.phase = 'WAIT_HAND_CAPTURE';
awayCapture.state.dealerId = 'away-capture-player';
awayCapture.state.turnPlayerId = 'away-capture-player';
awayCapture.state.field = repairField.map(card => ({ ...card, ownerId: null }));
awayCapture.state.currentTurn = { playerId: 'away-capture-player', handCard: { ...repairCard }, handCaptured: [], drawCard: null, drawCaptured: [] };
awayCapture.state.pending = null;
awayCapture.state.players = [
    { id: 'away-capture-player', name: 'Away capture', isBot: false, connected: false, hand: [{}], captured: [], score: 0 },
    { id: 'capture-witness', name: 'Witness', isBot: false, connected: true, hand: [{}], captured: [], score: 0 }
];
assert.strictEqual(awayCapture.skipDisconnectedTurn(), true, 'A missing restored capture prompt must be recoverable for an absent player');
assert.strictEqual(awayCapture.state.pending?.choiceIds?.length, 2, 'Recovery must rebuild the absent player capture choices before resolving them');

for (const [mode, count] of Object.entries({ duel: 2, trio: 3, party: 4 })) {
    const fallback = new HanafudaGameEngine({ random: () => 0, makeId: () => `fallback-${mode}-${++ids}`, now: () => 70000 + ids });
    fallback.addPlayer({ id: `${mode}-fallback-host`, name: 'Host', isHost: true, connected: true });
    fallback.setTableMode(`${mode}-fallback-host`, mode);
    for (let index = 1; index < count; index += 1) fallback.addPlayer({ id: `${mode}-fallback-${index}`, name: `Seat ${index + 1}`, connected: true });
    assert.strictEqual(fallback.startGame({ mode, rounds: 3 }).ok, true, `${mode} must recover from a pathological shuffle source`);
    assert(!Object.values(Rules.byMonth(fallback.state.field)).some(cards => cards.length === 4));
}

const upperBoundRandom = new HanafudaGameEngine({ random: () => 1, makeId: () => `upper-bound-${++ids}`, now: () => 80000 + ids });
upperBoundRandom.addPlayer({ id: 'upper-host', name: 'Host', isHost: true, connected: true });
upperBoundRandom.addPlayer({ id: 'upper-guest', name: 'Guest', connected: true });
assert.strictEqual(upperBoundRandom.startGame({ rounds: 3 }).ok, true, 'Out-of-contract random sources must be bounded instead of corrupting the deck');
assert.strictEqual(upperBoundRandom.state.players.reduce((count, player) => count + player.hand.length, 0) + upperBoundRandom.state.field.length + upperBoundRandom.state.deck.length, 48);

console.log('Hanafuda engine: deal, privacy, disconnect recovery, turn/capture loop, scoring, and round termination passed.');
