'use strict';

const CACHE_PREFIX = 'bzunga-offline-';
const CACHE_NAME = `${CACHE_PREFIX}v16`;

self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names
            .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

async function cacheOne(cache, rawUrl) {
    const url = new URL(rawUrl, self.location.href);
    const sameOrigin = url.origin === self.location.origin;
    const request = new Request(url.href, {
        cache: 'reload',
        credentials: sameOrigin ? 'same-origin' : 'omit',
        mode: sameOrigin ? 'same-origin' : 'no-cors'
    });
    const response = await fetch(request);
    if (!response || (!response.ok && response.type !== 'opaque')) {
        throw new Error(`HTTP ${response?.status || 'error'}`);
    }
    await cache.put(url.href, response.clone());
}

self.addEventListener('message', event => {
    if (event.data?.type !== 'CACHE_OFFLINE') return;
    const port = event.ports?.[0];
    const urls = [...new Set((event.data.urls || []).filter(url => typeof url === 'string'))];
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        const failed = [];
        let completed = 0;
        for (const url of urls) {
            try {
                await cacheOne(cache, url);
            } catch (error) {
                failed.push(url);
            }
            completed++;
            port?.postMessage({ type: 'CACHE_PROGRESS', completed, total: urls.length });
        }
        port?.postMessage({ type: 'CACHE_COMPLETE', completed, total: urls.length, failed });
    })());
});

function isAppShellRequest(request) {
    const url = new URL(request.url);
    return url.origin === self.location.origin
        && (request.mode === 'navigate' || /\.(?:html|js|css)$/i.test(url.pathname));
}

async function cachedResponse(request) {
    const cache = await caches.open(CACHE_NAME);
    if (isAppShellRequest(request)) {
        try {
            const freshRequest = new Request(request, { cache: 'no-cache' });
            const fresh = await fetch(freshRequest);
            if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => {});
            return fresh;
        } catch (error) {
            // The explicitly downloaded cache remains the offline fallback below.
        }
    }

    const direct = await cache.match(request);
    if (direct) return direct;
    if (request.mode === 'navigate') {
        const navigationUrl = new URL(request.url);
        navigationUrl.search = '';
        const pageWithoutInvite = await cache.match(navigationUrl.href);
        if (pageWithoutInvite) return pageWithoutInvite;
    }

    try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
            cache.put(request, response.clone()).catch(() => {});
        }
        return response;
    } catch (error) {
        if (request.mode !== 'navigate') throw error;
        const path = new URL(request.url).pathname;
        const fallback = path.includes('/president/')
            ? './president/index.html'
            : path.includes('/durak/')
                ? './durak/index.html'
                : path.includes('/hanafuda/')
                    ? './hanafuda/index.html'
                    : './index.html';
        return cache.match(new URL(fallback, self.registration.scope).href, { ignoreSearch: true });
    }
}

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith(cachedResponse(event.request));
});
