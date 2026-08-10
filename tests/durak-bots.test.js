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

const trumpSuit = Rules.SUITS[2];
const plainSuit = Rules.SUITS[3];
const otherPlainSuit = Rules.SUITS[1];
const hiddenOpponent = {
    id: 'human',
    name: 'Human',
    isBot: false,
    handCount: 5,
    hand: Array.from({ length: 5 }, (_, index) => ({ id: `private-${index}`, hidden: true }))
};
const pickupStrategyBot = {
    id: 'bot',
    name: 'Baba',
    isBot: true,
    botDifficulty: 5,
    handCount: 2,
    hand: [
        { id: 'plain-nine', rank: '9', suit: plainSuit },
        { id: 'trump-nine', rank: '9', suit: trumpSuit }
    ]
};
const earlyPickup = {
    ...opening,
    phase: 'throw_in',
    players: [pickupStrategyBot, hiddenOpponent],
    battle: [{
        id: 'pickup-pair',
        attackCard: { id: 'table-nine', rank: '9', suit: otherPlainSuit },
        defenseCard: null
    }],
    attackLimit: 5,
    trumpSuit,
    talonCount: 12
};
assert.strictEqual(
    Bots.chooseAction(earlyPickup, 'bot', () => 0.5).cardId,
    'plain-nine',
    'Expert bots must dump a matching plain card before donating a trump while the talon is open'
);
assert.strictEqual(
    Bots.chooseAction({
        ...earlyPickup,
        players: [{ ...pickupStrategyBot, handCount: 1, hand: [pickupStrategyBot.hand[1]] }, hiddenOpponent]
    }, 'bot', () => 0.5).type,
    'PASS_ATTACK',
    'Expert bots must keep their last matching trump instead of gifting it into an early pickup'
);
assert.strictEqual(
    Bots.chooseAction({ ...earlyPickup, talonCount: 0 }, 'bot', () => 0.5).cardId,
    'trump-nine',
    'Once the talon is empty, an expert may shed a matching trump into a pickup'
);

const trumpOnlyContinuation = {
    ...earlyPickup,
    phase: 'attack',
    players: [{
        ...pickupStrategyBot,
        handCount: 1,
        hand: [{ id: 'trump-eight', rank: '8', suit: trumpSuit }]
    }, hiddenOpponent],
    battle: [{
        id: 'plain-covered-pair',
        attackCard: { id: 'plain-six', rank: '6', suit: plainSuit },
        defenseCard: { id: 'plain-eight', rank: '8', suit: plainSuit }
    }]
};
assert.strictEqual(
    Bots.chooseAction(trumpOnlyContinuation, 'bot', () => 0.5).type,
    'PASS_ATTACK',
    'Experts must not continue an early attack when the only matching card is a trump'
);
assert.strictEqual(
    Bots.chooseAction({ ...trumpOnlyContinuation, battle: [] }, 'bot', () => 0.5).type,
    'ATTACK',
    'A bot with only trumps must still make a legal opening attack'
);

const forcedTrumpDefense = {
    ...opening,
    phase: 'defend',
    players: [{
        id: 'bot',
        name: 'Baba',
        isBot: true,
        botDifficulty: 5,
        handCount: 1,
        hand: [{ id: 'jack-trump', rank: 'J', suit: trumpSuit }]
    }, hiddenOpponent],
    attackTurnId: null,
    defenderId: 'bot',
    battle: [{
        id: 'plain-attack-pair',
        attackCard: { id: 'plain-six', rank: '6', suit: plainSuit },
        defenseCard: null
    }],
    trumpSuit,
    talonCount: 12
};
assert.strictEqual(
    Bots.chooseAction(forcedTrumpDefense, 'bot', () => 0.5).type,
    'TAKE_CARDS',
    'Expert bots should take a cheap early attack rather than burn a scarce trump'
);
assert.strictEqual(
    Bots.chooseAction({ ...forcedTrumpDefense, talonCount: 0 }, 'bot', () => 0.5).type,
    'DEFEND',
    'Trump conservation must relax once the talon is exhausted'
);

const bankBurnedTrump = {
    ...opening,
    phase: 'attack',
    players: [{
        id: 'bot',
        name: 'Baba',
        isBot: true,
        botDifficulty: 5,
        handCount: 1,
        hand: [{ id: 'follow-up-six', rank: '6', suit: otherPlainSuit }]
    }, { ...hiddenOpponent, handCount: 4 }],
    battle: [{
        id: 'covered-pair',
        attackCard: { id: 'opening-six', rank: '6', suit: plainSuit },
        defenseCard: { id: 'spent-trump', rank: '9', suit: trumpSuit }
    }],
    attackLimit: 5,
    trumpSuit,
    talonCount: 12
};
assert.strictEqual(
    Bots.chooseAction(bankBurnedTrump, 'bot', () => 0.5).type,
    'PASS_ATTACK',
    'Baba should end the attack and lock a defender-spent trump into the discard'
);
assert.strictEqual(
    Bots.chooseAction({
        ...bankBurnedTrump,
        talonCount: 0,
        players: [bankBurnedTrump.players[0], { ...hiddenOpponent, handCount: 0 }]
    }, 'bot', () => 0.5).type,
    'ATTACK',
    'Baba should keep attacking an empty-handed defender after the talon is gone'
);

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
    assert(dialogue.length >= 220, `Difficulty ${difficulty} needs a deep Durak dialogue rotation`);
    for (const [category, lines] of Object.entries(Bots.LINES[difficulty])) {
        assert.strictEqual(new Set(lines).size, lines.length, `Difficulty ${difficulty} ${category} contains duplicate lines`);
    }
    assert(dialogue.some(line => /knock knock/i.test(line)), `Difficulty ${difficulty} needs a knock-knock roast`);
    assert(dialogue.some(line => /roses|violets/i.test(line)), `Difficulty ${difficulty} needs a rhyme roast`);
    assert(
        dialogue.filter(line => /dad joke|why did|what do you call|twenty-five letters|knock knock/i.test(line)).length >= 7,
        `Difficulty ${difficulty} needs a proper joke rotation`
    );
    assert(dialogue.filter(line => /\*{2,}/.test(line)).length >= 2, `Difficulty ${difficulty} needs censored outbursts`);
    assert(dialogue.some(line => /bullshit|clown|bastard|bozo|ass/i.test(line)), `Difficulty ${difficulty} needs sharper disses`);
    assert(
        dialogue.filter(line => /fuck|shit|bullshit|clown|bastard|bozo|donkey|arse|idiot|toilet|glue|bollocks|goblin|rat|dickhead|wanker|gobshite|muppet|peasant/i.test(line)).length >= 34,
        `Difficulty ${difficulty} needs a substantial rough table-talk rotation`
    );
    assert(
        dialogue.filter(line => /fair play|respect|bloody nice|annoyingly good|good pressure|fine defence|earned|clean cover/i.test(line)).length >= 10,
        `Difficulty ${difficulty} needs occasional grudging compliments`
    );
    assert(
        dialogue.filter(line => /\bmate\b|old friend|friendship|pint|drinks/i.test(line)).length >= 16,
        `Difficulty ${difficulty} needs old-friends pub-table banter`
    );
    assert(
        !dialogue.some(line => /\b(distribution|expected value|minimum sufficient|profitable continuation|preserve control|public information|strategic pickup|tempo|calculat\w*|information|accounting|position|horizon|legally binding|paperwork|efficient|structure)\b/i.test(line)),
        `Difficulty ${difficulty} should avoid lecture-heavy bot jargon`
    );
    assert(Bots.PROFILES[difficulty].chat >= 0.8, `Difficulty ${difficulty} should comment regularly`);
    assert(Bots.LINES[difficulty].chat.length >= 30, `Difficulty ${difficulty} needs direct chat replies`);
    for (const category of ['attack', 'defend', 'take', 'throw', 'pass', 'chat']) {
        const line = Bots.lineFor(difficulty, category, () => 0.61);
        assert(line.length <= 68, `Difficulty ${difficulty} ${category} commentary should stay short on mobile`);
    }
}
assert.strictEqual(typeof Bots.DurakBotController.prototype.respondToHumanChat, 'function', 'Durak bots should answer human table chat');

console.log('Durak bots: talon-aware trump conservation, discard banking, legal private-view strategy, timing, and Baba dialogue passed.');
