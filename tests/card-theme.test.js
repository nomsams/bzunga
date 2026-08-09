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
const deferredMarkup = CardTheme.faceMarkup({ rank: 'A', suit: '♠' }, '../', { priority: 'hand' });
assert(deferredMarkup.includes('../assets/deck-svg/Ace_of_Spades.svg'));
assert(deferredMarkup.includes('data-card-src='), 'Illustrated faces should defer network loading to the priority queue');
assert(!deferredMarkup.includes(' src='), 'Deferred illustrated faces must not start an uncontrolled eager request');
assert.strictEqual(new Set(CardTheme.allFaceUrls('../')).size, 54, 'Idle warmup should cover every face and both Jokers in a fixed order');

const beforeHiddenPreload = CardTheme.getLoadStats();
CardTheme.preloadVisibleCards([{ rank: 'K', suit: '♥', hidden: true }], { assetBase: '../' });
assert.deepStrictEqual(CardTheme.getLoadStats(), beforeHiddenPreload, 'Hidden card identities must never enter the asset queue');
CardTheme.preloadVisibleCards([{ rank: 'K', suit: '♥' }], { assetBase: '../', priority: 'hand' });
assert.strictEqual(CardTheme.getLoadStats().pending, beforeHiddenPreload.pending + 1, 'A visible card should enter the progressive queue');

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
for (const app of ['president/app.js', 'durak/app.js']) {
    const source = fs.readFileSync(path.join(root, app), 'utf8');
    assert(source.includes('CardTheme.preloadVisibleCards'), `${app} must prioritize the local visible hand`);
    assert(source.includes('CardTheme.hydrate'), `${app} must hydrate deferred faces through the shared queue`);
}
assert(
    fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes("art.fetchPriority = 'high'"),
    'Bazunga should prioritize a face only when it is actually revealed'
);

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
assert(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('html[data-card-theme^="svg-"] { --card-w: 49px; --card-h: 70px; }'), 'Bazunga illustrated cards must remain readable on narrow phones');
assert(/\[data-card-theme\^="svg-"\] \.playing-card\s*\{\s*width: 58px;\s*height: 83px;/.test(fs.readFileSync(path.join(root, 'president', 'styles.css'), 'utf8')), 'President illustrated hands must be larger on mobile');

console.log('Card themes: 56 SVG assets, privacy-safe progressive loading, idle cache warmup, exact-fit backs, and shared controls passed.');
