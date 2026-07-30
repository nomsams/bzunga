const assert = require('assert');
const { PresidentGameEngine } = require('../president/engine.js');
const Rules = require('../president/rules.js');

let idCounter = 0;
const engine = new PresidentGameEngine({
    random: () => 0.42,
    now: () => 1000,
    makeId: () => `id-${++idCounter}`
});

const players = [
    { id: 'p1', name: 'One', isHost: true },
    { id: 'p2', name: 'Two' },
    { id: 'p3', name: 'Three' }
];
players.forEach(player => engine.addPlayer({ ...player, connected: true }));
assert.strictEqual(engine.startGame({ exchangeCount: 3 }).ok, true);
assert.strictEqual(engine.state.players.reduce((sum, player) => sum + player.hand.length, 0), 51);
assert.deepStrictEqual(
    engine.state.players.map(player => player.hand.length).sort((a, b) => a - b),
    [17, 17, 17],
    'Every player must receive exactly the same number of cards'
);
assert.strictEqual(engine.state.setAsideCount, 1, 'Uneven remainder cards must be removed before dealing');
const heartThreeOwner = engine.state.players.find(player =>
    player.hand.some(card => card.rank === '3' && card.suit === '♥')
);
assert.strictEqual(engine.activePlayer().id, heartThreeOwner.id, 'The 3♥ holder must open the first round');

for (let playerCount = 2; playerCount <= 8; playerCount++) {
    const equalDeal = new PresidentGameEngine({ random: () => 0.31, makeId: () => `equal-${++idCounter}` });
    for (let index = 0; index < playerCount; index++) {
        equalDeal.addPlayer({
            id: `equal-player-${playerCount}-${index}`,
            name: `Player ${index + 1}`,
            isHost: index === 0,
            connected: true
        });
    }
    assert.strictEqual(equalDeal.startGame().ok, true);
    const handSizes = equalDeal.state.players.map(player => player.hand.length);
    assert.strictEqual(new Set(handSizes).size, 1, `${playerCount} players must all receive equal hands`);
    assert.strictEqual(
        handSizes[0],
        Math.floor(52 / playerCount),
        `${playerCount} players received the wrong equal hand size`
    );
    assert(equalDeal.state.players.some(player =>
        player.hand.some(card => card.rank === '3' && card.suit === '♥')
    ), 'The opening 3♥ must never be set aside');
}

const makeCard = (id, rank, ownerId, suit = '♣') => ({
    id,
    rank,
    suit,
    ownerId,
    isRed: suit === '♥' || suit === '♦'
});

engine.state.phase = 'play';
engine.state.finishOrder = [];
engine.state.players.forEach(player => {
    player.passed = false;
    player.finishPosition = null;
});
engine.state.players[0].hand = [makeCard('p1-7', '7', 'p1'), makeCard('p1-9', '9', 'p1')];
engine.state.players[1].hand = [makeCard('p2-8', '8', 'p2'), makeCard('p2-k', 'K', 'p2')];
engine.state.players[2].hand = [makeCard('p3-10', '10', 'p3'), makeCard('p3-a', 'A', 'p3')];
engine.state.turnIndex = 0;
engine.state.trick = {
    id: 'test-trick',
    rank: '6',
    rankPower: Rules.RANK_POWER['6'],
    count: 1,
    lastPlayerId: 'p3',
    plays: []
};

assert.strictEqual(engine.pass('p1').ok, true);
assert.strictEqual(engine.activePlayer().id, 'p2');
assert.strictEqual(engine.state.players[0].passed, true);
assert.strictEqual(engine.playCards('p2', ['p2-8']).ok, true);
assert.strictEqual(engine.activePlayer().id, 'p3');
assert.strictEqual(engine.pass('p3').ok, true);
assert.strictEqual(engine.state.trick.rank, null, 'The pile must clear when only one active player remains');
assert.strictEqual(engine.activePlayer().id, 'p2', 'The sole remaining player must lead the fresh pile');
assert(engine.state.players.every(player => !player.passed), 'Passing flags must reset with the pile');

engine.state.players[1].hand.push(makeCard('p2-a', 'A', 'p2'));
engine.state.turnIndex = 1;
assert.strictEqual(engine.playCards('p2', ['p2-a']).ok, true);
assert.strictEqual(engine.state.trick.rank, null, 'An Ace must clear immediately');
assert.strictEqual(engine.activePlayer().id, 'p2', 'An Ace player who still has cards must lead again');

const roleEngine = new PresidentGameEngine({ makeId: () => `role-${++idCounter}` });
['pres', 'vice', 'citizen', 'vslave', 'slave'].forEach((id, index) => {
    roleEngine.addPlayer({ id, name: id, isHost: index === 0, connected: true });
});
roleEngine.state.finishOrder = ['pres', 'vice', 'citizen', 'vslave', 'slave'];
roleEngine._finishGame();
assert.strictEqual(roleEngine.getPlayer('pres').role, 'president');
assert.strictEqual(roleEngine.getPlayer('vice').role, 'vice_president');
assert.strictEqual(roleEngine.getPlayer('vslave').role, 'vice_slave');
assert.strictEqual(roleEngine.getPlayer('slave').role, 'slave');

const exchangeCards = {
    pres: [makeCard('pres-3', '3', 'pres'), makeCard('pres-4', '4', 'pres'), makeCard('pres-5', '5', 'pres')],
    vice: [makeCard('vice-4', '4', 'vice'), makeCard('vice-k', 'K', 'vice')],
    citizen: [makeCard('citizen-7', '7', 'citizen')],
    vslave: [makeCard('vslave-a', 'A', 'vslave'), makeCard('vslave-6', '6', 'vslave')],
    slave: [
        makeCard('slave-2', '2', 'slave'),
        makeCard('slave-a', 'A', 'slave'),
        makeCard('slave-9', '9', 'slave')
    ]
};
for (const player of roleEngine.state.players) player.hand = exchangeCards[player.id];
roleEngine.state.settings.exchangeCount = 2;
roleEngine._prepareExchange();
assert.strictEqual(roleEngine.state.phase, 'exchange');
assert.strictEqual(roleEngine.state.exchange.tasks.length, 4, 'Five-player games need primary and vice exchanges');
const forcedPrimary = roleEngine.state.exchange.tasks.find(task => task.giverId === 'slave');
assert.deepStrictEqual(forcedPrimary.selectedIds, ['slave-2', 'slave-a'], 'The Slave must surrender the objectively best cards');

let activeTask = roleEngine.state.exchange.tasks.find(task => task.id === roleEngine.state.exchange.activeTaskId);
assert.strictEqual(activeTask.giverId, 'pres');
assert.strictEqual(roleEngine.submitExchange('pres', ['pres-3', 'pres-4']).ok, true);
activeTask = roleEngine.state.exchange.tasks.find(task => task.id === roleEngine.state.exchange.activeTaskId);
assert.strictEqual(activeTask.giverId, 'vice');
assert.strictEqual(roleEngine.submitExchange('vice', ['vice-4']).ok, true);
assert.strictEqual(roleEngine.state.phase, 'play');
assert.strictEqual(roleEngine.activePlayer().id, 'slave', 'The Slave must open after the exchange');
assert(roleEngine.getPlayer('pres').hand.some(card => card.id === 'slave-2'));
assert(roleEngine.getPlayer('slave').hand.some(card => card.id === 'pres-3'));
assert(roleEngine.getPlayer('vice').hand.some(card => card.id === 'vslave-a'));

const presidentView = roleEngine.getViewState('pres');
const hiddenOpponent = presidentView.players.find(player => player.id === 'slave').hand[0];
assert.strictEqual(hiddenOpponent.hidden, true);
assert.strictEqual(hiddenOpponent.rank, undefined, 'Remote players must never receive opponent card ranks');
assert(presidentView.players.find(player => player.id === 'pres').hand.every(card => card.rank), 'A player must receive their own card values');

console.log('President engine: deal, starter, passing, Ace clears, roles, simultaneous exchange, and privacy passed.');
