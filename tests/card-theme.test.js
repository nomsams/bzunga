const assert = require('assert');
const fs = require('fs');
const path = require('path');
const CardTheme = require('../card-theme.js');

const root = path.join(__dirname, '..');
const assetDirectory = path.join(root, 'assets', 'deck-svg');
const files = fs.readdirSync(assetDirectory).filter(file => file.endsWith('.svg'));
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const suits = ['♣', '♦', '♥', '♠'];

assert.strictEqual(files.length, 56, 'The optional illustrated deck should include 52 faces, two Jokers, and two backs');
for (const rank of ranks) {
    for (const suit of suits) {
        const filename = CardTheme.getFaceFile({ rank, suit });
        assert(filename, `Missing theme filename for ${rank}${suit}`);
        assert(fs.existsSync(path.join(assetDirectory, filename)), `Missing illustrated card asset ${filename}`);
    }
}

assert.strictEqual(CardTheme.getFaceFile({ value: 'Joker', color: 'red' }), 'Red_Joker.svg');
assert.strictEqual(CardTheme.getFaceFile({ value: 'Joker' }), 'Black_Joker.svg');
assert.strictEqual(CardTheme.getFaceFile({ value: 'not-a-card', suit: '♠' }), null);
assert(CardTheme.getBackUrl('../', 'svg-blue').endsWith('assets/deck-svg/Deck_Back_Blue.svg'));
assert(CardTheme.getBackUrl('../', 'svg-red').endsWith('assets/deck-svg/Deck_Back_Red.svg'));
assert.strictEqual(CardTheme.getBackUrl('../', 'classic'), null);

CardTheme.set('svg-blue', '../');
assert(CardTheme.faceMarkup({ rank: 'A', suit: '♠' }, '../').includes('../assets/deck-svg/Ace_of_Spades.svg'));
CardTheme.set('unknown-theme', '../');
assert.strictEqual(CardTheme.get(), 'classic', 'Unknown themes must safely fall back to the classic deck');

for (const page of ['index.html', 'president/index.html', 'durak/index.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert(html.includes('id="card-theme-select"'), `${page} needs a lobby card-theme selector`);
    assert(html.includes('id="btn-card-theme"'), `${page} needs an in-game card-theme toggle`);
    assert(html.includes('card-theme.js'), `${page} must load the shared card-theme controller`);
}

for (const app of ['index.html', 'president/app.js', 'durak/app.js']) {
    const source = fs.readFileSync(path.join(root, app), 'utf8');
    assert(source.includes('CardTheme.bind'), `${app} must bind the persistent theme controls`);
    assert(
        source.includes('CardTheme.faceMarkup') || source.includes('CardTheme.getFaceUrl'),
        `${app} must render illustrated card faces`
    );
}

for (const stylesheet of ['index.html', 'president/styles.css', 'durak/styles.css']) {
    const source = fs.readFileSync(path.join(root, stylesheet), 'utf8');
    assert(
        source.includes('border: 0.75px solid rgba(2, 6, 23, 0.96)'),
        `${stylesheet} must use the thin dark illustrated-card edge`
    );
    assert(
        source.includes('100% 100% no-repeat'),
        `${stylesheet} must fit illustrated backs to the exact card slot`
    );
}

console.log('Card themes: all 56 SVG assets, shared persistence controls, exact-fit backs, thin dark edges, face mapping, and back variants passed.');
