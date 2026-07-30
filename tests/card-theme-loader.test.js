const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'card-theme.js'), 'utf8');
const requests = [];

class FakeImage {
    set src(value) {
        this.requestedUrl = value;
        requests.push(this);
    }
}

const styleValues = new Map();
const sandbox = {
    module: { exports: {} },
    console,
    Image: FakeImage,
    document: {
        documentElement: {
            dataset: {},
            style: {
                setProperty: (name, value) => styleValues.set(name, value),
                removeProperty: name => styleValues.delete(name)
            }
        }
    },
    localStorage: {
        getItem: () => 'classic',
        setItem: () => {}
    },
    navigator: { connection: { saveData: false, effectiveType: '4g' } },
    requestIdleCallback: callback => callback(),
    setTimeout: callback => callback()
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox);

const CardTheme = sandbox.module.exports;
CardTheme.apply('svg-blue', '../');

assert.strictEqual(requests.length, 3, 'The loader must cap illustrated asset requests at three concurrent downloads');
assert.strictEqual(CardTheme.getLoadStats().active, 3);
assert(CardTheme.getLoadStats().queued > 40, 'The privacy-safe fixed-order idle cache should wait behind critical assets');

const statsBeforeHidden = CardTheme.getLoadStats();
CardTheme.preloadVisibleCards([{ rank: 'Q', suit: '♠', hidden: true }], { assetBase: '../', priority: 'public' });
assert.deepStrictEqual(CardTheme.getLoadStats(), statsBeforeHidden, 'Hidden identities must never affect the request queue');

const target = {
    dataset: {
        cardSrc: '../assets/deck-svg/King_of_Hearts.svg',
        cardPriority: 'public'
    },
    removeAttribute(name) {
        if (name === 'data-card-src') delete this.dataset.cardSrc;
        if (name === 'data-card-priority') delete this.dataset.cardPriority;
    }
};
CardTheme.hydrate({
    querySelectorAll: selector => selector === 'img.svg-card-art[data-card-src]' ? [target] : []
});

requests[0].onload();
assert.strictEqual(
    requests[3].requestedUrl,
    '../assets/deck-svg/King_of_Hearts.svg',
    'A visible public card must jump ahead of fixed-order idle warmup'
);
requests[3].onload();
assert.strictEqual(target.src, '../assets/deck-svg/King_of_Hearts.svg', 'Hydration should attach the cached face to its visible card');
assert.strictEqual(CardTheme.getLoadStats().active, 3, 'Completing one request should immediately advance the queue');

console.log('Card theme loader: concurrency cap, visible-card priority, fixed-order idle warmup, and hidden-card privacy passed.');
