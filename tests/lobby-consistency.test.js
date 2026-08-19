const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pages = [
    ['bazunga', path.join(root, 'index.html')],
    ['president', path.join(root, 'president', 'index.html')],
    ['durak', path.join(root, 'durak', 'index.html')],
    ['hanafuda', path.join(root, 'hanafuda', 'index.html')]
];
const gameNames = ['BAZUNGA', 'PRESIDENT &amp; SLAVE', 'THE FOOL / DURAK', 'HANAFUDA · KOI-KOI'];
const descriptions = [
    'Memory, powers and glorious chaos',
    'Climb combinations and rule the table',
    'Attack, defend and escape',
    'Capture months and build Yaku'
];

for (const [theme, file] of pages) {
    const html = fs.readFileSync(file, 'utf8');
    assert(html.includes(`data-game-theme="${theme}"`), `${theme} needs its own shared-lobby accent theme`);
    for (const contract of ['game-lobby-card', 'game-menu-header', 'game-picker', 'game-identity', 'game-title', 'pre-room-option']) {
        assert(html.includes(contract), `${theme} lobby is missing the shared ${contract} structure`);
    }
    assert(html.includes('CHOOSE YOUR GAME') && html.includes('4 TABLE MODES'), `${theme} needs the shared game-menu heading`);
    const menuStart = html.indexOf('class="game-picker"');
    const identityStart = html.indexOf('class="game-identity"');
    assert(menuStart >= 0 && identityStart > menuStart, `${theme} must show game selection before its aligned identity block`);
    const menu = html.slice(menuStart, identityStart);
    let previous = -1;
    gameNames.forEach((name, index) => {
        const position = menu.indexOf(`<strong>${name}</strong>`);
        assert(position > previous, `${theme} game names must use the same order and wording`);
        assert(menu.includes(`<span>${descriptions[index]}</span>`), `${theme} game descriptions must be consistent`);
        previous = position;
    });
    assert.strictEqual((menu.match(/selected-label/g) || []).length, 1, `${theme} must mark exactly one selected mode`);
    for (const label of ['Your table name', 'Custom room name', 'Room name, Game ID or invite']) {
        assert(html.includes(label), `${theme} setup form is missing the shared “${label}” label`);
    }
    assert(html.includes('Spaces and punctuation are normalized'), `${theme} needs the same custom-room guidance`);
}

const css = fs.readFileSync(path.join(root, 'multiplayer.css'), 'utf8');
for (const theme of pages.map(([name]) => name)) assert(css.includes(`data-game-theme="${theme}"`), `Missing ${theme} lobby theme tokens`);
assert(css.includes('width: min(720px, calc(100vw - 28px))'), 'Desktop creation menus need one shared width');
assert(css.includes('justify-content: flex-start') && css.includes('overflow-y: auto'), 'Tall creation menus must remain scrollable instead of clipping at the top');
assert(css.includes('min-height: 100px') && css.includes('min-height: 2.55em'), 'Selector cards need aligned titles and descriptions');
assert(css.includes('grid-template-rows: 18px 92px minmax(48px, auto)'), 'Game identity blocks need aligned title/copy rows');
assert(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'Mobile game selection needs a consistent two-column layout');

console.log('Lobby consistency: shared selector geometry, aligned game identities/forms, responsive layout, and four accent themes passed.');
