const assert = require('assert');
const Rules = require('../hanafuda/rules.js');
const { CHAT_POOLS, HanafudaDialogue, HanafudaBotBrain, HanafudaBotController } = require('../hanafuda/bots.js');

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

const secondSecretHand = Array.from({ length: 7 }, (_, index) => new Proxy({ id: `secret-two-${index}` }, { get(target, key) { if (['month', 'name', 'categories', 'motif'].includes(key)) throw new Error('Bot inspected a second opponent hidden card'); return target[key]; } }));
const trioState = {
    ...state,
    phase: 'WAIT_HAND_SELECTION',
    pending: null,
    settings: { rounds: 6, mode: 'trio' },
    players: [bot, state.players[1], { id: 'human-two', name: 'Human Two', hand: secondSecretHand, captured: deck.slice(33, 38), score: 4 }]
};
const trioContext = HanafudaBotBrain.publicContext(bot, trioState);
assert.strictEqual(trioContext.opponents.length, 2, 'Bots must evaluate every rival at a Trio table');
assert.strictEqual(trioContext.opponentHandCount, 7, 'Bots should react to the rival closest to an empty hand');
assert.doesNotThrow(() => HanafudaBotBrain.chooseAction(bot, trioState, () => 0.41), 'Multi-opponent strategy must use public counts and captures only');

assert.strictEqual(HanafudaDialogue.classifyChatIntent('dude'), 'greeting');
assert.strictEqual(HanafudaDialogue.classifyChatIntent('Bro you suck'), 'insult');
assert.strictEqual(HanafudaDialogue.classifyChatIntent('your mom is cardboard'), 'family');
assert.strictEqual(HanafudaDialogue.classifyChatIntent('is that all you got'), 'challenge');
assert.strictEqual(HanafudaDialogue.classifyChatIntent('Where are you?'), 'where');
assert.strictEqual(HanafudaDialogue.classifyChatIntent('how does koi koi work?'), 'confusion');
assert.strictEqual(HanafudaDialogue.classifyChatIntent('nice move'), 'compliment');

const sharedLineCount = Object.values(CHAT_POOLS.shared).reduce((total, lines) => total + lines.length, 0);
assert(sharedLineCount > 130, 'Hanafuda chat needs a deep shared reply bank');
for (const [intent, lines] of Object.entries(CHAT_POOLS.shared)) {
    assert(lines.length >= 8, `${intent} needs enough replies to avoid a visible loop`);
}

const casualBot = { ...bot, id: 'petal', name: 'Petal Pete', botDifficulty: 1, hand: deck.slice(0, 6) };
const chatState = {
    ...state,
    roundNumber: 2,
    players: [casualBot, { id: 'human', name: 'Player 1', hand: secretHand, captured: [], score: 2 }]
};
const fakeEngine = {
    state: chatState,
    getPlayer(id) { return this.state.players.find(player => player.id === id); },
    setBotActivity() {},
    addBotChat() {}
};
const controller = new HanafudaBotController(fakeEngine, { random: () => 0 });
const insultReplies = Array.from({ length: 12 }, (_, index) => controller.selectChatReply(casualBot, {
    playerId: 'human',
    message: `you suck ${index}`
}, chatState));
assert.strictEqual(new Set(insultReplies).size, insultReplies.length, 'A long exchange should not expose a short reply loop');

const firstDudeReply = controller.selectChatReply(casualBot, { playerId: 'human', message: 'dude' }, chatState);
const repeatedDudeReply = controller.selectChatReply(casualBot, { playerId: 'human', message: 'dude' }, chatState);
assert.notStrictEqual(firstDudeReply, repeatedDudeReply, 'Repeated input should not get the same canned response');
assert(
    CHAT_POOLS.shared.repeat.includes(repeatedDudeReply) || (CHAT_POOLS.casual.repeat || []).includes(repeatedDudeReply),
    'Repeated input should be acknowledged as repetition'
);
assert.doesNotThrow(() => controller.selectChatReply(casualBot, { playerId: 'human', message: 'where are you?' }, chatState));

console.log('Hanafuda bots: legal decisions, hidden-information boundary, search, Koi-Koi risk, and varied contextual chat passed.');
