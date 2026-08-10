(function (root) {
    'use strict';

    const script = root.document?.currentScript;
    if (!script?.src) return;

    const siteRoot = new URL('./', script.src);
    const statusKey = 'bzunga-offline-cache-ready';
    const localFiles = [
        './',
        './index.html',
        './bot.js',
        './card-theme.js',
        './offline.js',
        './service-worker.js',
        './president/index.html',
        './president/styles.css',
        './president/rules.js',
        './president/engine.js',
        './president/bots.js',
        './president/app.js',
        './durak/index.html',
        './durak/styles.css',
        './durak/rules.js',
        './durak/engine.js',
        './durak/bots.js',
        './durak/app.js'
    ];
    const sharedRemoteFiles = [
        'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
        'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap',
        'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap'
    ];

    function unique(values) {
        return [...new Set(values.filter(Boolean))];
    }

    function allOfflineUrls() {
        const urls = localFiles.map(file => new URL(file, siteRoot).href);
        if (root.CardTheme) {
            urls.push(...root.CardTheme.allFaceUrls(siteRoot.href));
            urls.push(root.CardTheme.getBackUrl(siteRoot.href, 'svg-blue'));
            urls.push(root.CardTheme.getBackUrl(siteRoot.href, 'svg-red'));
        }
        return unique([...urls, ...sharedRemoteFiles]);
    }

    function setStatus(button, status, message, ready = false) {
        if (status) status.textContent = message;
        if (!button) return;
        button.classList.toggle('offline-ready', ready);
        button.textContent = ready ? '✓ ALL MODES SAVED OFFLINE' : '⬇ DOWNLOAD ALL MODES';
        button.disabled = false;
    }

    async function registerWorker() {
        if (!('serviceWorker' in root.navigator) || !root.isSecureContext) {
            throw new Error('Offline download needs HTTPS or localhost.');
        }
        const workerUrl = new URL('service-worker.js', siteRoot);
        const registration = await root.navigator.serviceWorker.register(workerUrl, {
            scope: siteRoot.pathname
        });
        await root.navigator.serviceWorker.ready;
        return registration;
    }

    function sendCacheRequest(worker, urls, onProgress) {
        return new Promise((resolve, reject) => {
            const channel = new MessageChannel();
            const timeout = root.setTimeout(() => reject(new Error('The offline download timed out.')), 120000);
            channel.port1.onmessage = event => {
                const data = event.data || {};
                if (data.type === 'CACHE_PROGRESS') {
                    onProgress?.(data);
                    return;
                }
                if (data.type === 'CACHE_COMPLETE') {
                    root.clearTimeout(timeout);
                    resolve(data);
                }
            };
            worker.postMessage({ type: 'CACHE_OFFLINE', urls }, [channel.port2]);
        });
    }

    async function downloadAll(button, status) {
        button.disabled = true;
        button.textContent = 'PREPARING OFFLINE DOWNLOAD…';
        if (status) status.textContent = 'Starting secure browser cache…';
        try {
            const registration = await registerWorker();
            const worker = root.navigator.serviceWorker.controller || registration.active;
            if (!worker) throw new Error('The offline worker is still starting. Try once more.');
            const urls = allOfflineUrls();
            const result = await sendCacheRequest(worker, urls, progress => {
                if (status) status.textContent = `Saving ${progress.completed} of ${progress.total} files…`;
            });
            if (result.failed?.length) {
                throw new Error(`${result.failed.length} files could not be saved. Check the connection and retry.`);
            }
            root.localStorage?.setItem(statusKey, new Date().toISOString());
            setStatus(button, status, 'Ready: all three games, bot code and card designs are cached.', true);
        } catch (error) {
            setStatus(button, status, error?.message || 'Offline download failed. Please retry while online.');
        }
    }

    function bind() {
        const button = root.document.getElementById('btn-download-offline');
        const status = root.document.getElementById('offline-download-status');
        if (!button) return;
        const cachedAt = root.localStorage?.getItem(statusKey);
        if (cachedAt) {
            setStatus(button, status, 'Offline copy saved. Press again anytime to refresh it.', true);
        } else if (!('serviceWorker' in root.navigator) || !root.isSecureContext) {
            setStatus(button, status, 'Offline download is available on HTTPS or localhost.');
        }
        button.addEventListener('click', () => downloadAll(button, status));
        registerWorker().catch(() => {});
    }

    root.BzungaOffline = { allOfflineUrls, registerWorker };
    if (root.document?.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', bind, { once: true });
    else bind();
})(globalThis);
