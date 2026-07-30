const assert = require('assert');
const Bots = require('../durak/bots.js');
const Rules = require('../durak/rules.js');

const basePlayers = [
    {
        id: 'bot', name: 'Baba', isBot: true, botDifficulty: 5, handCount: 5,
        hand: [
            { id: 'low', rank: '6', suit: '♣' },
            { id: 'pair', rank: '6', suit: '♥' },
            { id: 'cover', rank: '8', suit: '♣' },
            { id: 'high', rank: 'A', suit: '♠' },
            { id: 'trump', rank: '7', suit: '♦' }
        ]
    },
    {
        id: 'human', name: 'Human', isBot: false, handCount: 6,
        hand: Array.from({ length: 6 }, (_, index) => ({ id: `hidden-${index}`, hidden: true }))
    }
];

const opening = {
    phase: 'attack',
    roundNumber: 1,
    players: basePlayers,
    attackTurnId: 'bot',
    defenderId: 'human',
    battle: [],
    attackLimit: 6,
    trumpSuit: '♦',
    talonCount: 20,
    lastAction: { time: 1 }
};
const openingAction = Bots.chooseAction(opening, 'bot', () => 0.5);
assert.strictEqual(openingAction.type, 'ATTACK');
assert(['low', 'pair'].includes(openingAction.cardId), 'Expert bots should open with a low duplicated non-trump rank');

const defending = {
    ...opening,
    phase: 'defend',
    defenderId: 'bot',
    attackTurnId: null,
    battle: [{
        id: 'pair-1',
        attackCard: { id: 'attack', rank: '7', suit: '♣' },
        defenseCard: null
    }]
};
const defendAction = Bots.chooseAction(defending, 'bot', () => 0.5);
assert.strictEqual(defendAction.type, 'DEFEND');
assert.strictEqual(defendAction.cardId, 'cover', 'The bot should use the cheapest legal plain-suit defence before trump');
assert.strictEqual(Rules.canBeat(basePlayers[0].hand.find(card => card.id === defendAction.cardId), defending.battle[0].attackCard, '♦'), true);

const forcedTake = {
    ...defending,
    players: [{
        ...basePlayers[0],
        handCount: 1,
        hand: [{ id: 'six-club', rank: '6', suit: '♣' }]
    }, basePlayers[1]],
    battle: [{
        id: 'pair-2',
        attackCard: { id: 'ace-heart', rank: 'A', suit: '♥' },
        defenseCard: null
    }]
};
assert.strictEqual(Bots.chooseAction(forcedTake, 'bot', () => 0.5).type, 'TAKE_CARDS', 'Bots must pick up when no legal defence exists');

const throwIn = {
    ...opening,
    phase: 'throw_in',
    battle: [{ id: 'p', attackCard: { rank: '6', suit: '♠' }, defenseCard: null }],
    attackLimit: 4
};
const throwAction = Bots.chooseAction(throwIn, 'bot', () => 0.5);
assert.strictEqual(throwAction.type, 'ATTACK');
assert(['low', 'pair'].includes(throwAction.cardId), 'Throw-ins must match a public table rank');

const privacySource = Bots.chooseAction.toString();
assert(!privacySource.includes('Engine.state'), 'Bot strategy must operate on a private player view, not authoritative hidden hands');
assert(!privacySource.includes('getCard('), 'Bot strategy must not look up hidden opponent cards');

for (const difficulty of Object.keys(Bots.PROFILES)) {
    const samples = Array.from({ length: 60 }, (_, index) => Bots.getDecisionDelay(Number(difficulty), () => ((index * 17) % 59) / 59, index % 2 ? 'attack' : 'defend'));
    assert(samples.every(delay => delay >= 850 && delay <= 6200), `Difficulty ${difficulty} timing escaped human bounds`);
}

const babaLines = Bots.LINES[5];
assert(Object.values(babaLines).flat().length >= 15, 'Baba needs a distinct Durak voice with enough variation');
assert(Bots.lineFor(5, 'attack', () => 0).includes('Baba'), 'Baba attack dialogue must feel unique');
for (let difficulty = 1; difficulty <= 5; difficulty++) {
    const dialogue = Object.values(Bots.LINES[difficulty]).flat();
    assert(dialogue.length >= 58, `Difficulty ${difficulty} needs a deep Durak dialogue rotation`);
    assert(dialogue.some(line => /knock knock/i.test(line)), `Difficulty ${difficulty} needs a knock-knock roast`);
    assert(dialogue.some(line => /roses|violets/i.test(line)), `Difficulty ${difficulty} needs a rhyme roast`);
    assert(dialogue.some(line => /bullshit|clown|bastard|bozo|ass/i.test(line)), `Difficulty ${difficulty} needs sharper disses`);
    assert(
        dialogue.filter(line => /fuck|shit|bullshit|clown|bastard|bozo|donkey|arse|idiot|toilet|glue|bollocks|goblin|rat/i.test(line)).length >= 7,
        `Difficulty ${difficulty} needs a substantial rough table-talk rotation`
    );
    assert(
        !dialogue.some(line => /distribution|expected value|minimum sufficient|profitable continuation|preserve control|public information|strategic pickup/i.test(line)),
        `Difficulty ${difficulty} should avoid lecture-heavy bot jargon`
    );
    assert(Bots.PROFILES[difficulty].chat >= 0.68, `Difficulty ${difficulty} should comment regularly`);
    assert(Bots.LINES[difficulty].chat.length >= 11, `Difficulty ${difficulty} needs direct chat replies`);
}
assert.strictEqual(typeof Bots.DurakBotController.prototype.respondToHumanChat, 'function', 'Durak bots should answer human table chat');

console.log('Durak bots: legal private-view strategy, trump conservation, pickup logic, timing, and Baba dialogue passed.');
