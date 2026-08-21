const assert = require('assert');
const { DurakGameEngine } = require('../durak/engine.js');
const Bots = require('../durak/bots.js');

for (const durakMode of ['throw-in', 'transfer']) {
for (let playerCount = 2; playerCount <= 6; playerCount++) {
    let seed = 17 + playerCount;
    const random = () => ((seed = seed * 48271 % 2147483647) / 2147483647);
    const engine = new DurakGameEngine({ random });
    engine.state.durakMode = durakMode;
    for (let index = 0; index < playerCount; index++) {
        engine.addPlayer({
            id: `p-${index}`,
            name: `Player ${index + 1}`,
            isBot: true,
            botDifficulty: 4
        });
    }
    assert.strictEqual(engine.startGame().ok, true);

    let actions = 0;
    while (engine.state.phase !== 'game_over' && actions < 10000) {
        const actorId = engine.state.phase === 'defend'
            ? engine.state.defenderId
            : engine.state.attackTurnId;
        const view = engine.getViewState(actorId);
        const action = Bots.chooseAction(view, actorId, random);
        assert(action, `${durakMode} ${playerCount}-player simulation deadlocked in ${engine.state.phase}`);
        const result = engine.processAction(action, actorId);
        assert.strictEqual(result.ok, true, `${playerCount}-player simulation produced an illegal ${action.type}`);
        actions += 1;
    }

    assert(actions < 10000, `${playerCount}-player simulation did not terminate`);
    assert.strictEqual(engine.state.phase, 'game_over');
    assert(engine.state.durakId, `${playerCount}-player deal needs one final Durak`);
    assert.strictEqual(engine.state.talon.length, 0, 'Players cannot leave before the talon is exhausted');
    assert.strictEqual(engine.activePlayers().length, 1, 'Exactly one player must remain with cards');
}
}

console.log('Durak simulation: complete legal throw-in and transfer deals for 2 through 6 players passed.');
