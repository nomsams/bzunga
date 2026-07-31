const assert = require('assert');
const { PresidentBotBrain, PHRASES, BABA_PHRASES, PROFILES } = require('../president/bots.js');
const Rules = require('../president/rules.js');

const card = (id, rank, ownerId = 'bot', suit = '♣') => ({
    id,
    rank,
    suit,
    ownerId,
    isRed: suit === '♥' || suit === '♦'
});

for (const collection of [PHRASES, BABA_PHRASES]) {
    for (const category of ['intro', 'play', 'bigPlay', 'pass', 'ace', 'lowHand', 'victory', 'defeat', 'chat']) {
        assert(collection[category].length >= 15, `${category} needs deep conversational variety`);
        assert.strictEqual(new Set(collection[category]).size, collection[category].length, `${category} contains duplicate lines`);
    }
    const fullDialogue = Object.values(collection).flat();
    assert(fullDialogue.length >= 170, 'President bots need a very large dialogue rotation');
    assert(fullDialogue.some(line => /knock knock/i.test(line)), 'President bots need knock-knock trash talk');
    assert(fullDialogue.some(line => /roses|violets/i.test(line)), 'President bots need rhyme roasts');
    assert(
        fullDialogue.filter(line => /dad joke|why did|what do you call|knock knock/i.test(line)).length >= 5,
        'President bots need a proper joke rotation'
    );
    assert(fullDialogue.filter(line => /\*{2,}/.test(line)).length >= 5, 'President bots need censored outbursts');
    assert(fullDialogue.some(line => /bullshit|clown|bastard|bozo/i.test(line)), 'President bots need sharper table disses');
    assert(
        fullDialogue.filter(line => /fuck|shit|bullshit|clown|bastard|bozo|donkey|arse|idiot|toilet|glue|bollocks|dickhead|wanker|gobshite|muppet|peasant/i.test(line)).length >= 28,
        'President bots need a substantial rough table-talk rotation'
    );
    assert(
        !fullDialogue.some(line => /\b(probability|distribution|public information|optimal|optimization|optimizing|mathemat\w*|outlier|forecast|strategic value|hand structure|expected value|card economy|tempo|calculat\w*|model|sample|protocol)\b/i.test(line)),
        'President dialogue should avoid lecture-heavy bot jargon'
    );
}
assert(Object.values(PROFILES).every(profile => profile.chatChance >= 0.7), 'Every President bot should speak up regularly');

const bot = {
    id: 'bot',
    name: 'Baba Gupta',
    isBot: true,
    botDifficulty: 5,
    hand: [
        card('b5-1', '5'),
        card('b5-2', '5', 'bot', '♦'),
        card('b9', '9'),
        card('ba', 'A'),
        card('b2', '2')
    ]
};

const opponentHand = [
    new Proxy({ id: 'secret-1' }, {
        get(target, property) {
            if (property === 'rank' || property === 'suit' || property === 'value') {
                throw new Error('Bot attempted to inspect an opponent card value');
            }
            return target[property];
        }
    }),
    new Proxy({ id: 'secret-2' }, {
        get(target, property) {
            if (property === 'rank' || property === 'suit' || property === 'value') {
                throw new Error('Bot attempted to inspect an opponent card value');
            }
            return target[property];
        }
    })
];

const state = {
    roundNumber: 1,
    players: [
        bot,
        { id: 'human', name: 'Human', hand: opponentHand, passed: false }
    ],
    finishOrder: [],
    history: [],
    trick: {
        id: 'trick',
        rank: '4',
        rankPower: Rules.RANK_POWER['4'],
        count: 2,
        plays: []
    }
};

assert.doesNotThrow(() => PresidentBotBrain.getPublicContext(bot, state), 'Bots may use opponent counts but not hidden values');
const action = PresidentBotBrain.chooseAction(bot, state, () => 0.5);
assert(['PLAY_CARDS', 'PASS'].includes(action.type));
if (action.type === 'PLAY_CARDS') {
    const chosen = action.cardIds.map(id => bot.hand.find(item => item.id === id));
    assert.strictEqual(Rules.validateSelection(chosen, state.trick, bot.hand.length).valid, true);
}

const exchange = PresidentBotBrain.chooseExchangeCards(bot, 2);
assert.deepStrictEqual(exchange, ['b5-1', 'b5-2'], 'Strong bots must return low natural cards before Aces and Twos');

const almostOut = {
    ...bot,
    hand: [card('finish-k', 'K'), card('finish-2', '2')]
};
const leadState = {
    ...state,
    players: [almostOut, state.players[1]],
    trick: { id: 'empty', rank: null, rankPower: null, count: 0, plays: [] }
};
const finishingAction = PresidentBotBrain.chooseAction(almostOut, leadState, () => 0.4);
if (finishingAction.type === 'PLAY_CARDS') {
    assert.notDeepStrictEqual(
        finishingAction.cardIds.sort(),
        ['finish-2', 'finish-k'].sort(),
        'Bots must respect the rule against finishing with a 2'
    );
}

console.log('President bots: strategy legality, public-information boundary, exchanges, dialogue, and wild endgame passed.');
