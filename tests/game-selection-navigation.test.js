const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pages = [
    ['Bazunga', path.join(root, 'index.html'), './index.html#game-selection'],
    ['President', path.join(root, 'president', 'index.html'), '../index.html#game-selection'],
    ['Durak', path.join(root, 'durak', 'index.html'), '../index.html#game-selection'],
    ['Hanafuda', path.join(root, 'hanafuda', 'index.html'), '../index.html#game-selection']
];

for (const [name, file, target] of pages) {
    const html = fs.readFileSync(file, 'utf8');
    assert(html.includes(`class="back-to-games" href="${target}"`), `${name} needs a visible lobby link back to game selection`);
    assert(html.includes(`class="table-game-selection" href="${target}"`), `${name} needs a compact table link back to game selection`);
}

const bazunga = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(bazunga.includes('id="game-selection"'), 'The shared return route needs a stable game-selection target');

console.log('Game navigation: every lobby, room, and live table can return to the shared game selection.');
