const assert = require('assert');
const Rules = require('../durak/rules.js');

const deck = Rules.createDeck();
assert.strictEqual(deck.length, 36, 'Durak must use a 36-card deck');
assert.strictEqual(new Set(deck.map(card => card.id)).size, 36, 'Every Durak card needs a stable unique id');
assert(deck.every(card => Rules.RANKS.includes(card.rank)), 'Ranks 2 through 5 must be removed');

const trump = '♦';
const sevenSpades = { rank: '7', suit: '♠' };
const tenSpades = { rank: '10', suit: '♠' };
const sixDiamonds = { rank: '6', suit: '♦' };
const aceClubs = { rank: 'A', suit: '♣' };
assert.strictEqual(Rules.canBeat(tenSpades, sevenSpades, trump), true, 'A higher same-suit card must defend');
assert.strictEqual(Rules.canBeat(sixDiamonds, aceClubs, trump), true, 'The lowest trump must beat any plain suit');
assert.strictEqual(Rules.canBeat(sevenSpades, aceClubs, trump), false, 'A plain off-suit card cannot defend');
assert.strictEqual(Rules.canBeat(sevenSpades, sevenSpades, trump), false, 'Equal rank never beats equal rank');

const battle = [
    { attackCard: { rank: '7', suit: '♠' }, defenseCard: { rank: '9', suit: '♠' } },
    { attackCard: { rank: '9', suit: '♣' }, defenseCard: null }
];
assert.strictEqual(Rules.canAttack({ rank: '7', suit: '♥' }, battle, 6), true, 'Throw-ins may match an attack rank');
assert.strictEqual(Rules.canAttack({ rank: '9', suit: '♦' }, battle, 6), true, 'Throw-ins may match a defence rank');
assert.strictEqual(Rules.canAttack({ rank: '8', suit: '♦' }, battle, 6), false, 'Unseen ranks cannot be thrown in');
assert.strictEqual(Rules.canAttack({ rank: '7', suit: '♥' }, battle, 2), false, 'The attack cap must be enforced');

const sorted = Rules.sortHand([
    { rank: 'A', suit: '♦' },
    { rank: '6', suit: '♣' },
    { rank: '7', suit: '♦' },
    { rank: 'K', suit: '♠' }
], trump);
assert.deepStrictEqual(sorted.map(card => `${card.rank}${card.suit}`), ['6♣', 'K♠', '7♦', 'A♦'], 'Trump cards belong at the far right');

console.log('Durak rules: deck, rank matching, trump defence, attack limits, and sorting passed.');
