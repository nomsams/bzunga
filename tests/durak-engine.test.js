const assert = require('assert');
const { DurakGameEngine } = require('../durak/engine.js');
const Rules = require('../durak/rules.js');

let id = 0;
const engine = new DurakGameEngine({
    random: () => 0.37,
    now: (() => { let time = 1000; return () => ++time; })(),
    idFactory: () => `pair-${++id}`
});
engine.addPlayer({ id: 'a', name: 'Anna' });
engine.addPlayer({ id: 'b', name: 'Boris' });
engine.addPlayer({ id: 'c', name: 'Cleo' });
assert.strictEqual(engine.startGame().ok, true);
assert.strictEqual(engine.state.players.every(player => player.hand.length === 6), true, 'Every player starts with six cards');
assert.strictEqual(engine.state.talon.length, 18, 'The remaining cards form the talon');
assert(engine.state.trumpSuit, 'The turn-up card must establish trumps');
assert.strictEqual(engine.state.talon[0].id, engine.state.trumpCardId, 'The face-up trump must remain the last talon card');

const initialView = engine.getViewState('a');
assert.strictEqual(initialView.players.find(player => player.id === 'a').hand[0].rank !== undefined, true, 'A player sees their own hand');
assert.strictEqual(initialView.players.find(player => player.id === 'b').hand[0].hidden, true, 'Opponent card values must stay private');
assert.strictEqual(initialView.players.find(player => player.id === 'b').hand[0].id.startsWith('hidden-'), true, 'Opponent card IDs must not encode rank or suit');
assert.strictEqual(initialView.talon, undefined, 'The talon order must not leak to clients');

// Deterministic two-player scenario for attacking, defending, pickup and draw order.
const game = new DurakGameEngine({ now: () => 5000, idFactory: () => `battle-${++id}` });
game.state.phase = 'attack';
game.state.players = [
    {
        id: 'attacker', name: 'Attacker', connected: true, isBot: false, out: false,
        hand: [
            { id: 'a6', rank: '6', suit: '♠', ownerId: 'attacker', loc: 'hand' },
            { id: 'a8', rank: '8', suit: '♥', ownerId: 'attacker', loc: 'hand' },
            { id: 'a7', rank: '7', suit: '♣', ownerId: 'attacker', loc: 'hand' }
        ]
    },
    {
        id: 'defender', name: 'Defender', connected: true, isBot: false, out: false,
        hand: [
            { id: 'd7', rank: '7', suit: '♠', ownerId: 'defender', loc: 'hand' },
            { id: 'd9', rank: '9', suit: '♦', ownerId: 'defender', loc: 'hand' }
        ]
    }
];
game.state.trumpSuit = '♦';
game.state.talon = [];
game.state.mainAttackerId = 'attacker';
game.state.defenderId = 'defender';
game.state.attackTurnId = 'attacker';
game.state.attackLimit = 2;
game.state.battle = [];
game.state.passedAttackers = [];
game.state.pickupDeclared = false;
game.state.finishedOrder = [];
game.state.logs = [];

assert.strictEqual(game.processAction({ type: 'ATTACK', cardId: 'a6' }, 'attacker').ok, true);
assert.strictEqual(game.state.phase, 'defend');
assert.strictEqual(game.processAction({ type: 'DEFEND', cardId: 'd9', pairId: game.state.battle[0].id }, 'defender').ok, true, 'A trump may defend');
assert.strictEqual(game.state.phase, 'attack');
assert.strictEqual(game.processAction({ type: 'ATTACK', cardId: 'a8' }, 'attacker').ok, false, 'A new attack must match a table rank');
assert.strictEqual(game.processAction({ type: 'PASS_ATTACK' }, 'attacker').ok, true);
assert.strictEqual(game.state.roundNumber, 1, 'A successful defender must start the next round');
assert.strictEqual(game.state.mainAttackerId, 'defender');
assert.strictEqual(game.state.discardCount, 2, 'Successfully defended cards are discarded without exposing a pile');
assert.strictEqual(game.state.lastRoundResult.type, 'round_defended', 'Round results must survive the next-round transition');
assert.strictEqual(game.state.lastRoundResult.cardCount, 2);

const pickup = new DurakGameEngine({ now: () => 9000, idFactory: () => `pickup-${++id}` });
pickup.state = JSON.parse(JSON.stringify(game.state));
pickup.state.phase = 'attack';
pickup.state.players = [
    {
        id: 'x', name: 'X', connected: true, isBot: false, out: false,
        hand: [
            { id: 'x6s', rank: '6', suit: '♠', ownerId: 'x', loc: 'hand' },
            { id: 'x6h', rank: '6', suit: '♥', ownerId: 'x', loc: 'hand' }
        ]
    },
    {
        id: 'y', name: 'Y', connected: true, isBot: false, out: false,
        hand: [{ id: 'y7', rank: '7', suit: '♣', ownerId: 'y', loc: 'hand' }]
    }
];
pickup.state.trumpSuit = '♦';
pickup.state.talon = [];
pickup.state.mainAttackerId = 'x';
pickup.state.defenderId = 'y';
pickup.state.attackTurnId = 'x';
pickup.state.attackLimit = 1;
pickup.state.battle = [];
pickup.state.passedAttackers = [];
pickup.state.pickupDeclared = false;
pickup.state.finishedOrder = [];
pickup.state.durakId = null;
pickup.state.logs = [];
pickup.state.discardCount = 0;
assert.strictEqual(pickup.processAction({ type: 'ATTACK', cardId: 'x6s' }, 'x').ok, true);
assert.strictEqual(pickup.processAction({ type: 'TAKE_CARDS' }, 'y').ok, true);
assert.strictEqual(pickup.getPlayer('y').hand.length, 2, 'The defender must collect the full battle at the cap');
assert.strictEqual(pickup.state.mainAttackerId, 'x', 'After pickup, play moves left of the defender');
assert.strictEqual(pickup.state.lastRoundResult.type, 'round_pickup', 'Pickup feedback must survive the next-round transition');

// A throw-in that reaches the defender's attack limit resolves immediately.
const cappedPickup = new DurakGameEngine({ now: () => 9500, idFactory: () => `cap-${++id}` });
cappedPickup.state.phase = 'attack';
cappedPickup.state.players = [
    {
        id: 'cap-a', name: 'Cap attacker', connected: true, isBot: false, out: false,
        hand: [
            { id: 'cap-6s', rank: '6', suit: '♠', ownerId: 'cap-a', loc: 'hand' },
            { id: 'cap-6h', rank: '6', suit: '♥', ownerId: 'cap-a', loc: 'hand' }
        ]
    },
    {
        id: 'cap-d', name: 'Cap defender', connected: true, isBot: false, out: false,
        hand: [
            { id: 'cap-7c', rank: '7', suit: '♣', ownerId: 'cap-d', loc: 'hand' },
            { id: 'cap-8c', rank: '8', suit: '♣', ownerId: 'cap-d', loc: 'hand' }
        ]
    }
];
cappedPickup.state.trumpSuit = '♦';
cappedPickup.state.talon = [];
cappedPickup.state.mainAttackerId = 'cap-a';
cappedPickup.state.defenderId = 'cap-d';
cappedPickup.state.attackTurnId = 'cap-a';
cappedPickup.state.lastAttackerId = 'cap-a';
cappedPickup.state.attackLimit = 2;
cappedPickup.state.battle = [];
cappedPickup.state.passedAttackers = [];
cappedPickup.state.pickupDeclared = false;
cappedPickup.state.finishedOrder = [];
cappedPickup.state.logs = [];
assert.strictEqual(cappedPickup.processAction({ type: 'ATTACK', cardId: 'cap-6s' }, 'cap-a').ok, true);
assert.strictEqual(cappedPickup.processAction({ type: 'TAKE_CARDS' }, 'cap-d').ok, true);
assert.strictEqual(cappedPickup.processAction({ type: 'ATTACK', cardId: 'cap-6h' }, 'cap-a').ok, true);
assert.strictEqual(cappedPickup.state.lastRoundResult.cardCount, 2, 'The capped throw-in should resolve without extra pass clicks');
assert.strictEqual(cappedPickup.state.battle.length, 0);

// Refill order: main attacker first, defender last, with the face-up trump drawn last.
const refill = new DurakGameEngine();
refill.state.players = [
    { id: 'm', hand: [], out: false },
    { id: 'd', hand: [], out: false },
    { id: 'o', hand: [], out: false }
];
refill.state.mainAttackerId = 'm';
refill.state.defenderId = 'd';
refill.state.talon = [
    { id: 'trump', rank: '6', suit: '♣', loc: 'talon' },
    { id: 'next-1', rank: '7', suit: '♠', loc: 'talon' },
    { id: 'next-2', rank: '8', suit: '♠', loc: 'talon' },
    { id: 'next-3', rank: '9', suit: '♠', loc: 'talon' },
    { id: 'next-4', rank: '10', suit: '♠', loc: 'talon' },
    { id: 'next-5', rank: 'J', suit: '♠', loc: 'talon' },
    { id: 'next-6', rank: 'Q', suit: '♠', loc: 'talon' }
];
refill.state.trumpCardId = 'trump';
const drawReport = refill.refillHands();
assert.strictEqual(refill.getPlayer('m').hand[0].id, 'next-6', 'The main attacker draws first');
assert.strictEqual(refill.getPlayer('o').hand[0].id, 'trump', 'Other attackers draw before the defender');
assert.strictEqual(refill.getPlayer('d').hand.length, 0, 'Replenishment stops completely once the talon is empty');
assert.strictEqual(drawReport[0].playerId, 'm');

// Last player holding cards is the Durak.
refill.state.phase = 'attack';
refill.getPlayer('m').hand = [];
refill.getPlayer('m').out = true;
refill.getPlayer('o').hand = [];
refill.getPlayer('o').out = true;
refill.getPlayer('d').hand = [{ id: 'last', rank: 'A', suit: '♥' }];
assert.strictEqual(refill.finishIfNeeded(), true);
assert.strictEqual(refill.state.durakId, 'd');
assert.strictEqual(refill.state.phase, 'game_over');

console.log('Durak engine: deal, privacy, defence, pickup, refill order, talon exhaustion, and fool result passed.');
