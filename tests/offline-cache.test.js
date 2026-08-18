const assert = require('assert');
const fs = require('fs');
const path = require('path');
const CardTheme = require('../card-theme.js');

const root = path.join(__dirname, '..');
const offlineSource = fs.readFileSync(path.join(root, 'offline.js'), 'utf8');
const workerSource = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

for (const page of ['index.html', 'president/index.html', 'durak/index.html']) {
    const source = fs.readFileSync(path.join(root, page), 'utf8');
    assert(source.includes('id="btn-download-offline"'), `${page} must expose the all-modes offline download`);
    assert(source.includes('id="offline-download-status"'), `${page} must announce offline download progress`);
    assert(source.includes('offline.js'), `${page} must load the shared offline controller`);
}

for (const gameFile of [
    './index.html',
    './bot.js',
    './historical-bots.js',
    './service-worker.js',
    './president/index.html',
    './president/app.js',
    './president/engine.js',
    './president/bots.js',
    './durak/index.html',
    './durak/app.js',
    './durak/engine.js',
    './durak/bots.js'
]) {
    assert(offlineSource.includes(`'${gameFile}'`), `Offline manifest is missing ${gameFile}`);
}
assert(offlineSource.includes('CardTheme.allFaceUrls'), 'Offline download must include every illustrated face');
assert(offlineSource.includes("getBackUrl(siteRoot.href, 'svg-blue')"), 'Offline download must include the blue back');
assert(offlineSource.includes("getBackUrl(siteRoot.href, 'svg-red')"), 'Offline download must include the red back');
assert.strictEqual(CardTheme.allFaceUrls('./').length, 54, 'The full face manifest should contain 52 faces and two Jokers');

assert(workerSource.includes("self.addEventListener('message'"), 'Service worker must accept an explicit full-cache command');
assert(workerSource.includes("event.data?.type !== 'CACHE_OFFLINE'"), 'Service worker must scope messages to offline caching');
assert(workerSource.includes("self.addEventListener('fetch'"), 'Service worker must serve cached gameplay files');
assert(workerSource.includes('isAppShellRequest') && workerSource.includes("cache: 'no-cache'"), 'Online app code must refresh before falling back to its offline cache');
assert(workerSource.includes("request.mode !== 'navigate'"), 'Service worker must provide per-game navigation fallbacks');
assert(workerSource.includes("navigationUrl.search = ''"), 'Offline invite URLs must resolve to their cached game page');
assert(!workerSource.includes('cache.match(request, { ignoreSearch: true })'), 'Remote resources with different query strings must not collide');

for (const appFile of ['index.html', 'president/app.js', 'durak/app.js']) {
    const source = fs.readFileSync(path.join(root, appFile), 'utf8');
    assert(source.includes('openOfflineHost'), `${appFile} must start bot games without PeerJS`);
    assert(source.includes('!navigator.onLine'), `${appFile} must detect offline host startup immediately`);
    assert(source.includes('BOTS ONLY'), `${appFile} must clearly label local-only rooms`);
}

console.log('Offline mode: all game code, 56 deck assets, progress UI, cache routing, and local bot hosts passed.');
