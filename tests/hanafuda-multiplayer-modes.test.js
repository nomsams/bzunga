const assert = require('assert');
const Rules = require('../hanafuda/rules.js');
const { HanafudaGameEngine } = require('../hanafuda/engine.js');

const expected = {
    duel: { players: 2, hand: 8, field: 8, deck: 24 },
    trio: { players: 3, hand: 7, field: 6, deck: 21 },
    party: { players: 4, hand: 5, field: 8, deck: 20 }
};

let seed = 90125;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000);
let nonce = 0;
const createEngine = () => new HanafudaGameEngine({ random, makeId: () => `multi-${++nonce}`, now: () => 50000 + nonce });

for (const [modeId, deal] of Object.entries(expected)) {
    const engine = createEngine();
    assert.strictEqual(engine.addPlayer({ id: `${modeId}-host`, name: 'Host', isHost: true, connected: true }), true);
    assert.strictEqual(engine.setTableMode(`${modeId}-host`, modeId).ok, true);
    for (let index = 1; index < deal.players; index += 1) {
        assert.strictEqual(engine.addPlayer({
            id: `${modeId}-p${index}`,
            name: `Seat ${index + 1}`,
            connected: true,
            isBot: index % 2 === 0,
            botDifficulty: index % 2 === 0 ? 4 : 0
        }), true, `${modeId} should accept seat ${index + 1}`);
    }
    assert.strictEqual(engine.addPlayer({ id: `${modeId}-overflow`, name: 'Overflow' }), false, `${modeId} must enforce its seat limit`);
    assert.strictEqual(engine.startGame({ mode: modeId, rounds: 3 }).ok, true);
    assert.strictEqual(engine.state.settings.mode, modeId);
    assert.strictEqual(engine.state.players.length, deal.players);
    assert(engine.state.players.every(player => player.hand.length === deal.hand), `${modeId} dealt the wrong hand size`);
    assert.strictEqual(engine.state.field.length, deal.field, `${modeId} dealt the wrong field size`);
    assert.strictEqual(engine.state.deck.length, deal.deck, `${modeId} left the wrong draw count`);
    assert.strictEqual(engine.state.players.reduce((total, player) => total + player.hand.length, 0) + engine.state.field.length + engine.state.deck.length, 48);
    assert(!Object.values(Rules.byMonth(engine.state.field)).some(cards => cards.length === 4), `${modeId} must redeal a blocked field`);

    for (const viewer of engine.state.players) {
        const view = engine.getViewState(viewer.id);
        assert.strictEqual(view.deck, undefined, `${modeId} leaked its draw order`);
        assert(view.players.find(player => player.id === viewer.id).hand.every(card => card.month), `${modeId} hid the viewer's own cards`);
        assert(view.players.filter(player => player.id !== viewer.id).every(player => player.hand.every(card => card.hidden && !card.month)), `${modeId} exposed another hand`);
    }
    const godView = engine.getViewState(engine.state.players[0].id, true);
    assert(godView.players.every(player => player.hand.every(card => card.month)), `${modeId} spectator view should expose every hand`);

    let actions = 0;
    while (!['END_ROUND', 'MATCH_OVER'].includes(engine.state.phase) && actions++ < 220) {
        const active = engine.activePlayer();
        assert(active, `${modeId} lost its active seat in ${engine.state.phase}`);
        if (engine.state.phase === 'WAIT_HAND_SELECTION') engine.playHandCard(active.id, active.hand[0].id);
        else if (['WAIT_HAND_CAPTURE', 'WAIT_DRAW_CAPTURE'].includes(engine.state.phase)) engine.chooseCapture(active.id, engine.state.pending.choiceIds[0]);
        else if (engine.state.phase === 'WAIT_KOI_KOI_CHOICE') engine.resolveKoiChoice(active.id, false);
    }
    assert(actions < 220, `${modeId} deadlocked in ${engine.state.phase}`);
    assert(engine.state.roundResult, `${modeId} did not produce a round result`);
}

const underfilled = createEngine();
underfilled.addPlayer({ id: 'under-host', name: 'Host', isHost: true, connected: true });
underfilled.setTableMode('under-host', 'party');
underfilled.addPlayer({ id: 'under-two', name: 'Two', connected: true });
assert.strictEqual(underfilled.startGame({ mode: 'party' }).ok, false, 'Party must not start with empty seats');
assert.match(underfilled.startGame({ mode: 'party' }).reason, /requires exactly 4 active players/);

const shrink = createEngine();
shrink.addPlayer({ id: 'shrink-host', name: 'Host', isHost: true, connected: true });
shrink.setTableMode('shrink-host', 'party');
shrink.addPlayer({ id: 'shrink-two', name: 'Two', connected: true });
shrink.addPlayer({ id: 'shrink-three', name: 'Three', connected: true });
assert.strictEqual(shrink.setTableMode('shrink-host', 'duel').ok, false, 'A mode change must not silently evict occupied seats');
assert.strictEqual(shrink.state.settings.mode, 'party');
assert.strictEqual(shrink.setTableMode('shrink-two', 'trio').ok, false, 'Only the host may change table size');

const risk = createEngine();
risk.addPlayer({ id: 'risk-host', name: 'Host', isHost: true, connected: true });
risk.setTableMode('risk-host', 'trio');
risk.addPlayer({ id: 'risk-two', name: 'Two', connected: true });
risk.addPlayer({ id: 'risk-three', name: 'Three', connected: true });
assert.strictEqual(risk.startGame({ mode: 'trio' }).ok, true);
risk.state.phase = 'WAIT_KOI_KOI_CHOICE';
risk.state.turnPlayerId = 'risk-three';
risk.state.pending = { playerId: 'risk-three', evaluation: { points: 5, yaku: [{ id: 'sanko', name: 'Sankō', points: 5 }] } };
risk.state.koiKoi = { 'risk-host': 1, 'risk-two': 2 };
assert.strictEqual(risk.resolveKoiChoice('risk-three', false).ok, true);
assert.strictEqual(risk.state.roundResult.points, 10, 'Multiple failed rival Koi-Koi calls apply one bounded x2 risk multiplier');
assert.deepStrictEqual(risk.state.roundResult.koiKoiPenaltyPlayerIds.sort(), ['risk-host', 'risk-two']);

const away = createEngine();
away.addPlayer({ id: 'away-host', name: 'Host', isHost: true, connected: true });
away.setTableMode('away-host', 'trio');
away.addPlayer({ id: 'away-two', name: 'Two', connected: true });
away.addPlayer({ id: 'away-three', name: 'Three', connected: true });
away.startGame({ mode: 'trio' });
const awayId = away.state.turnPlayerId;
away.disconnectPlayer(awayId);
for (let guard = 0; away.state.turnPlayerId === awayId && guard < 4; guard += 1) assert.strictEqual(away.skipDisconnectedTurn(), true);
assert.notStrictEqual(away.state.turnPlayerId, awayId, 'An away Trio seat must not deadlock the other two players');

console.log('Hanafuda multiplayer modes: 2/3/4-seat deals, capacity, mixed bots, privacy, Koi risk, disconnects, and full rounds passed.');
