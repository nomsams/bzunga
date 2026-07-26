const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sliceBetween = (start, end) => {
    const from = html.indexOf(start);
    const to = html.indexOf(end, from);
    assert(from >= 0 && to > from, `Could not extract ${start}`);
    return html.slice(from, to);
};

const guardHelpers = sliceBetween('Engine.isLayoutCard =', 'Engine.drawPenalty =');
const nextTurn = sliceBetween('Engine.nextTurn =', 'Engine.endGame =');
const processAction = sliceBetween('Engine.processAction =', 'Engine.executeSwap =');
const context = { result: {} };
vm.runInNewContext(`
    const App = { isHost: true };
    let uuidCount = 0;
    const Utils = { timestamp: () => 10000, uuid: () => 'bazunga-nonce-' + (++uuidCount) };
    const MAGIC_VALUES = ['9', '10', 'J', 'Q', 'K'];
    const window = {};
    const Engine = {
        state: {
            phase: 'lobby', players: [], turnIndex: 0, activeAbility: null,
            deck: [], discardPile: [], publicPeekedCards: [], orbitPendingPlayerIds: [],
            openingPeekedCards: [], peekPhaseCompleted: false
        },
        botMemory: {},
        lastBazungaVariant: 0,
        cards: [],
        getCardById(id) { return this.cards.find(card => card.id === id); },
        startCalls: 0,
        startGame() { this.startCalls++; },
        chatCalls: 0,
        chatLog() { this.chatCalls++; },
        nextCalls: 0,
        nextTurn() { this.nextCalls++; },
        endCalls: 0,
        endGame() { this.endCalls++; },
        penaltyCalls: [],
        drawPenalty(id) { this.penaltyCalls.push(id); },
        sysLog() {}, broadcast() {}, rememberCardForBot() {},
        executeSwap() { return true; }, checkDeckEmpty() {}
    };
    ${guardHelpers}
    ${processAction}
    result.Engine = Engine;
`, context);

const Engine = context.result.Engine;
const host = { id: 'host', name: 'Host', isHost: true, isBot: false, connected: true, hand: [], penaltyCards: [] };
const guest = { id: 'guest', name: 'Guest', isHost: false, isBot: false, connected: true, hand: [], penaltyCards: [] };
const offline = { id: 'offline', name: 'Offline', isHost: false, isBot: false, connected: false, hand: [], penaltyCards: [] };
const ownCard = { id: 'own', ownerId: 'host', loc: 'hand', value: '4' };
const ownCardTwo = { id: 'own-two', ownerId: 'host', loc: 'hand', value: '6' };
const guestCard = { id: 'guest-card', ownerId: 'guest', loc: 'hand', value: '8' };
Engine.state.players = [host, guest, offline];
Engine.cards = [ownCard, ownCardTwo, guestCard];

Engine.state.turnIndex = 99;
assert.doesNotThrow(() => Engine.processAction({ type: 'CHAT', msg: 'hello' }, host.id), 'Lobby chat must not require an active turn');
assert.strictEqual(Engine.chatCalls, 1);

Engine.state.phase = 'game_over';
Engine.processAction({ type: 'PLAY_AGAIN' }, guest.id);
assert.strictEqual(Engine.startCalls, 0, 'A guest must not restart the game');
Engine.processAction({ type: 'PLAY_AGAIN' }, host.id);
assert.strictEqual(Engine.startCalls, 1, 'The host should be able to restart the game');

Engine.state.phase = 'peek';
Engine.state.openingPeekedCards = [];
Engine.processAction({ type: 'READY_PEEK' }, host.id);
assert.notStrictEqual(host.ready, true, 'A player cannot skip the two-card opening peek');
Engine.processAction({ type: 'PEEK_CARD', targetId: guestCard.id }, host.id);
assert.deepStrictEqual(Array.from(Engine.state.openingPeekedCards), [], 'A player cannot peek at an opponent opening card');
Engine.processAction({ type: 'PEEK_CARD', targetId: ownCard.id }, host.id);
Engine.processAction({ type: 'PEEK_CARD', targetId: ownCardTwo.id }, host.id);
assert.deepStrictEqual(Array.from(Engine.state.openingPeekedCards), ['own', 'own-two'], 'The host should track exactly two authorized opening peeks');
Engine.processAction({ type: 'PEEK_CARD', targetId: ownCard.id }, host.id);
assert.strictEqual(Engine.state.openingPeekedCards.length, 2, 'Repeated opening peeks must not create extra entries');
Engine.processAction({ type: 'READY_PEEK' }, host.id);
assert.strictEqual(host.ready, true, 'Ready should succeed after two authorized opening peeks');

Engine.state.phase = 'play';
Engine.state.turnIndex = 0;
Engine.state.activeAbility = { player: host.id, type: 'magic_9', step: 1 };
Engine.processAction({ type: 'RESOLVE_MAGIC', targetId: guestCard.id }, host.id);
assert.strictEqual(Engine.nextCalls, 0, 'Magic 9 must reject an opponent card');
Engine.processAction({ type: 'RESOLVE_MAGIC', targetId: ownCard.id }, host.id);
assert.strictEqual(Engine.nextCalls, 1, 'Magic 9 should accept an own-layout card');

Engine.state.activeAbility = { player: host.id, type: 'magic_K', step: 1 };
Engine.processAction({ type: 'RESOLVE_MAGIC', targetPlayerId: host.id }, host.id);
assert.deepStrictEqual(Array.from(Engine.penaltyCalls), [], 'Red King must reject self-targeting');
Engine.processAction({ type: 'RESOLVE_MAGIC', targetPlayerId: guest.id }, host.id);
assert.deepStrictEqual(Array.from(Engine.penaltyCalls), ['guest'], 'Red King should accept a connected opponent');

assert.strictEqual(Engine.isValidSwap(ownCard.id, ownCard.id), false, 'A card cannot swap with itself');
assert.strictEqual(Engine.isValidSwap(ownCard.id, guestCard.id), true, 'Two layout cards should be swappable');

Engine.state.activeAbility = null;
Engine.state.phase = 'play';
Engine.state.peekPhaseCompleted = true;
Engine.state.deck = [];
Engine.state.discardPile = [];
Engine.processAction({ type: 'DRAW_DECK' }, host.id);
assert.strictEqual(Engine.endCalls, 1, 'A round with no drawable cards must end instead of looping forever');

Engine.processAction({ type: 'CALL_BAZUNGA' }, host.id);
assert.deepStrictEqual(Array.from(Engine.state.orbitPendingPlayerIds), ['guest'], 'Disconnected seats must not enter the final orbit');
assert.strictEqual(Engine.state.bazungaEffect.callerId, host.id, 'BAZUNGA alert must identify the caller');
assert.strictEqual(Engine.state.bazungaEffect.nonce, 'bazunga-nonce-1', 'BAZUNGA alert must carry a synchronized nonce');
assert(Engine.state.bazungaEffect.variant >= 1 && Engine.state.bazungaEffect.variant <= 3, 'BAZUNGA alert must select a supported animation variant');
const firstBazungaVariant = Engine.state.bazungaEffect.variant;
Engine.state.phase = 'play';
Engine.state.turnIndex = 0;
Engine.processAction({ type: 'CALL_BAZUNGA' }, host.id);
assert.notStrictEqual(Engine.state.bazungaEffect.variant, firstBazungaVariant, 'Consecutive BAZUNGA calls must use different alert variants');
assert.strictEqual(Engine.state.bazungaEffect.nonce, 'bazunga-nonce-2', 'Every BAZUNGA alert must carry a fresh nonce');

const orbitContext = { result: {} };
vm.runInNewContext(`
    const Utils = { timestamp: () => 20000 };
    const Engine = {
        state: {
            phase: 'orbit', activeAbility: null, turnIndex: 0, bazungaCallerId: 'caller',
            orbitPendingPlayerIds: ['guest', 'offline'],
            players: [
                { id: 'caller', connected: true, isBot: false },
                { id: 'offline', connected: false, isBot: false },
                { id: 'guest', connected: true, isBot: false }
            ]
        },
        broadcasts: 0, broadcast() { this.broadcasts++; },
        ends: 0, endGame() { this.ends++; }
    };
    ${nextTurn}
    result.Engine = Engine;
`, orbitContext);
const OrbitEngine = orbitContext.result.Engine;
OrbitEngine.nextTurn();
assert.strictEqual(OrbitEngine.state.players[OrbitEngine.state.turnIndex].id, 'guest', 'Orbit must skip a disconnected seat');
OrbitEngine.nextTurn();
assert.strictEqual(OrbitEngine.ends, 1, 'Orbit should end after the last eligible opponent');
assert.strictEqual(OrbitEngine.state.players[OrbitEngine.state.turnIndex].id, 'guest', 'Caller must not receive an accidental extra orbit turn');

console.log('Engine action guards: opening peeks, host authority, magic targets, swaps, and BAZUNGA orbit passed.');
