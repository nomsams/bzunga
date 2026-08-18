const assert = require('assert');
const Rules = require('../hanafuda/rules.js');
const { HanafudaBotBrain } = require('../hanafuda/bots.js');

const deck = Rules.createDeck(() => 0.7);
const bot = { id: 'bot', name: 'Baba Gupta', botDifficulty: 5, hand: deck.slice(0, 8), captured: deck.slice(8, 13), score: 0 };
const secretHand = Array.from({ length: 8 }, (_, index) => new Proxy({ id: `secret-${index}` }, { get(target, key) { if (['month', 'name', 'categories', 'motif'].includes(key)) throw new Error('Bot inspected a hidden opponent card'); return target[key]; } }));
const state = { phase: 'WAIT_HAND_SELECTION', turnPlayerId: 'bot', roundNumber: 1, settings: { rounds: 6 }, field: deck.slice(21, 29), deckCount: 19, players: [bot, { id: 'human', name: 'Human', hand: secretHand, captured: deck.slice(29, 33), score: 0 }], pending: null, koiKoi: {} };
assert.doesNotThrow(() => HanafudaBotBrain.publicContext(bot, state));
const action = HanafudaBotBrain.chooseAction(bot, state, () => 0.47);
assert.strictEqual(action.type, 'PLAY_HAND_CARD');
assert(bot.hand.some(card => card.id === action.cardId));

state.phase = 'WAIT_KOI_KOI_CHOICE';
state.pending = { playerId: 'bot', evaluation: { yaku: [{ id: 'goko', points: 10 }], points: 10 } };
assert.strictEqual(HanafudaBotBrain.chooseAction(bot, state, () => 0.5).type, 'SHOBU', 'Baba should bank a high-value Yaku instead of gambling blindly');

console.log('Hanafuda bots: legal decisions, hidden-information boundary, search, and Koi-Koi risk passed.');
