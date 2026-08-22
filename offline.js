(function (root) {
    'use strict';

    const script = root.document?.currentScript;
    if (!script?.src) return;

    const siteRoot = new URL('./', script.src);
    const statusKey = 'bzunga-offline-cache-ready-v19';
    const localFiles = [
        './',
        './index.html',
        './bot.js',
        './historical-bots.js',
        './card-theme.js',
        './multiplayer.js',
        './multiplayer.css',
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
        './durak/app.js',
        './hanafuda/index.html',
        './hanafuda/styles.css',
        './hanafuda/rules.js',
        './hanafuda/engine.js',
        './hanafuda/bots.js',
        './hanafuda/app.js',
        './assets/hanafuda-svg/Hanafuda_overview.svg'
    ];
    const sharedRemoteFiles = [
        'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js',
        'https://unpkg.com/mqtt@5.14.1/dist/mqtt.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
        'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap',
        'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap'
    ];
    const hanafudaMonths = ['January_Pine', 'February_Plum', 'March_Cherry', 'April_Wisteria', 'May_Iris', 'June_Peony', 'July_Clover', 'August_Pampas', 'September_Chrysanthemum', 'October_Maple', 'November_Willow', 'December_Paulownia'];
    for (let month = 1; month <= 12; month++) {
        for (let card = 1; card <= 4; card++) {
            localFiles.push(`./assets/hanafuda-svg/${String(month).padStart(2, '0')}_${hanafudaMonths[month - 1]}_Card_${card}.svg`);
        }
    }
    const mantiaCards = {
        January: ['Hikari', 'Tanzaku', 'Kasu_1', 'Kasu_2'], February: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'],
        March: ['Hikari', 'Tanzaku', 'Kasu_1', 'Kasu_2'], April: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'],
        May: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'], June: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'],
        July: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'], August: ['Hikari', 'Tane', 'Kasu_1', 'Kasu_2'],
        September: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'], October: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'],
        November: ['Hikari', 'Tane', 'Tanzaku', 'Kasu'], December: ['Hikari', 'Kasu_1', 'Kasu_2', 'Kasu_3']
    };
    for (const [month, cards] of Object.entries(mantiaCards)) {
        for (const card of cards) localFiles.push(`./assets/hanafuda-mantia/Hanafuda_${month}_${card}.png`);
    }
    const hawaiiMonths = ['January_Pine', 'February_Plum', 'March_Cherry', 'April_Wisteria', 'May_Iris', 'June_Peony', 'July_BushClover', 'August_Grass', 'September_Chrysanthemum', 'October_Maple', 'November_Willow', 'December_Paulownia'];
    for (let month = 1; month <= 12; month++) {
        for (let card = 1; card <= 4; card++) localFiles.push(`./assets/hanafuda-hawaii/${String(month).padStart(2, '0')}_${hawaiiMonths[month - 1]}_Card_${card}.svg`);
    }

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
            setStatus(button, status, 'Ready: all four games, bot code and card designs are cached.', true);
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
