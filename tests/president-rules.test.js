const assert = require('assert');
const Rules = require('../president/rules.js');

const card = (id, rank, suit = '♣') => ({
    id,
    rank,
    suit,
    isRed: suit === '♥' || suit === '♦'
});

const deck = Rules.createDeck(() => 0.5);
assert.strictEqual(deck.length, 52, 'President must use a 52-card deck');
assert.strictEqual(new Set(deck.map(item => item.id)).size, 52, 'Every card must have a unique ID');
assert(!deck.some(item => item.rank === 'JOKER'), 'Jokers must not be included');

const sorted = Rules.sortHand([
    card('two', '2'),
    card('king-spade', 'K', '♠'),
    card('ace', 'A'),
    card('three', '3'),
    card('king-club', 'K', '♣')
]);
assert.deepStrictEqual(
    sorted.map(item => item.id),
    ['three', 'king-club', 'king-spade', 'ace', 'two'],
    'Rank sorting must group equal ranks and place Aces/Twos at the far right'
);

assert.strictEqual(
    Rules.validateSelection([card('wild', '2')], null, 5).valid,
    false,
    'A 2 cannot be played alone'
);
assert.strictEqual(
    Rules.validateSelection([card('five', '5'), card('six', '6')], null, 5).valid,
    false,
    'Natural cards in a play must share a rank'
);

const kingPair = Rules.validateSelection([card('king', 'K'), card('wild', '2')], null, 6);
assert.strictEqual(kingPair.valid, true);
assert.strictEqual(kingPair.rank, 'K');
assert.strictEqual(kingPair.count, 2);
assert.strictEqual(kingPair.wildCount, 1);

const onPairOfFives = { rank: '5', rankPower: Rules.RANK_POWER['5'], count: 2 };
assert.strictEqual(
    Rules.validateSelection([card('same-five', '5'), card('same-five-2', '5')], onPairOfFives, 6).valid,
    false,
    'An equal rank must never beat itself'
);
assert.strictEqual(
    Rules.validateSelection([card('six-single', '6')], onPairOfFives, 6).valid,
    false,
    'A single cannot beat a pair'
);
assert.strictEqual(
    Rules.validateSelection(
        [card('six-1', '6'), card('six-2', '6'), card('six-3', '6')],
        onPairOfFives,
        6
    ).valid,
    true,
    'A higher triple must beat a lower pair'
);

const sixKings = [
    card('k1', 'K', '♣'),
    card('k2', 'K', '♦'),
    card('k3', 'K', '♥'),
    card('k4', 'K', '♠'),
    card('w1', '2', '♣'),
    card('w2', '2', '♦')
];
const sixKingCombo = Rules.validateSelection(sixKings, { rank: 'Q', rankPower: 12, count: 4 }, 9);
assert.strictEqual(sixKingCombo.valid, true, 'More than four cards must be legal when Twos extend a natural rank');
assert.strictEqual(sixKingCombo.count, 6);

assert.strictEqual(
    Rules.validateSelection([card('last-k', 'K'), card('last-2', '2')], null, 2).valid,
    false,
    'A player cannot finish with a wild 2 in the final play'
);
assert.strictEqual(
    Rules.validateSelection([card('ace-1', 'A'), card('ace-2', 'A')], onPairOfFives, 5).clearsTrick,
    true,
    'Any valid Ace combination must clear the pile'
);

const legal = Rules.getLegalPlays(
    [card('h7-1', '7'), card('h7-2', '7'), card('h2', '2'), card('h9', '9')],
    { rank: '6', rankPower: Rules.RANK_POWER['6'], count: 2 }
);
assert(legal.some(candidate => candidate.combo.rank === '7' && candidate.combo.count === 2));
assert(legal.every(candidate => candidate.cards.some(item => item.rank !== '2')), 'Generated plays may never contain only wild cards');
assert(legal.every(candidate => candidate.combo.count >= 2), 'Generated plays must respect the pile count');

console.log('President rules: deck, sorting, wilds, climbing, counts, Aces, and finishing constraints passed.');
