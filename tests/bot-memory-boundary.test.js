const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const indexPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const implementationStart = html.indexOf('Engine.rememberCardForBot =');
const implementationEnd = html.indexOf('Engine.memorizeForBot =');

assert(implementationStart >= 0 && implementationEnd > implementationStart, 'Bot memory implementation not found');

const implementation = html.slice(implementationStart, implementationEnd);
const context = { result: {} };
vm.runInNewContext(`
    const Utils = { timestamp: () => 1000 };
    const window = { Bot: { getNumericValue: () => 7 } };
    const Engine = {
        state: {
            phase: 'peek',
            players: [
                { id: 'baba', isBot: true },
                { id: 'human', isBot: false }
            ],
            publicPeekedCards: [],
            lastSlap: null,
            activeAbility: null
        },
        botMemory: {}
    };
    ${implementation}
    result.Engine = Engine;
`, context);

const Engine = context.result.Engine;
const ownOne = { id: 'own-1', ownerId: 'baba', loc: 'hand' };
const ownTwo = { id: 'own-2', ownerId: 'baba', loc: 'hand' };
const ownThree = { id: 'own-3', ownerId: 'baba', loc: 'hand' };
const hiddenHuman = { id: 'human-1', ownerId: 'human', loc: 'hand' };

assert.strictEqual(Engine.rememberCardForBot('baba', hiddenHuman), false);
assert.strictEqual(Engine.rememberCardForBot('baba', hiddenHuman, 'initial_peek'), false);
assert.strictEqual(Engine.rememberCardForBot('baba', ownOne, 'initial_peek'), true);
assert.strictEqual(Engine.rememberCardForBot('baba', ownTwo, 'initial_peek'), true);
assert.strictEqual(Engine.rememberCardForBot('baba', ownThree, 'initial_peek'), false);

Engine.state.phase = 'play';
assert.strictEqual(Engine.rememberCardForBot('baba', hiddenHuman, 'public_reveal'), false);
Engine.state.publicPeekedCards = [hiddenHuman.id];
assert.strictEqual(Engine.rememberCardForBot('baba', hiddenHuman, 'public_reveal'), true);

const ownDraw = { id: 'draw-1', ownerId: 'baba', loc: 'holding' };
assert.strictEqual(Engine.rememberCardForBot('baba', ownDraw, 'own_draw'), false);
Engine.state.activeAbility = { player: 'baba', card: ownDraw, type: 'holding' };
assert.strictEqual(Engine.rememberCardForBot('baba', ownDraw, 'own_draw'), true);

const secretMagicCard = { id: 'secret-1', ownerId: 'human', loc: 'hand' };
assert.strictEqual(Engine.rememberCardForBot('baba', secretMagicCard, 'private_magic'), false);
Engine.state.activeAbility = { player: 'baba', type: 'magic_10' };
assert.strictEqual(Engine.rememberCardForBot('baba', secretMagicCard, 'private_magic'), true);

console.log('Bot memory boundary: 10 assertions passed.');
