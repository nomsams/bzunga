(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.CardTheme = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    const STORAGE_KEY = 'bzunga-card-theme';
    const THEMES = {
        classic: { label: 'Classic Cards', buttonLabel: 'CLASSIC', shortLabel: 'OLD', back: null },
        'svg-blue': { label: 'Illustrated Deck · Blue Back', buttonLabel: 'ART BLUE', shortLabel: 'BLUE', back: 'Deck_Back_Blue.svg' },
        'svg-red': { label: 'Illustrated Deck · Red Back', buttonLabel: 'ART RED', shortLabel: 'RED', back: 'Deck_Back_Red.svg' }
    };
    const RANK_FILES = {
        A: 'Ace',
        K: 'King',
        Q: 'Queen',
        J: 'Jack',
        '10': '10',
        '9': '9',
        '8': '8',
        '7': '7',
        '6': '6',
        '5': '5',
        '4': '4',
        '3': '3',
        '2': '2'
    };
    const SUIT_FILES = {
        '♣': 'Clubs',
        '♦': 'Diamonds',
        '♥': 'Hearts',
        '♠': 'Spades'
    };
    const LOAD_PRIORITIES = {
        public: 0,
        hand: 10,
        normal: 20,
        idle: 100
    };
    const MAX_CONCURRENT_LOADS = 3;

    let currentTheme = 'classic';
    let currentAssetBase = '';
    let activeLoads = 0;
    let loadOrder = 0;
    let idleWarmupScheduled = false;
    const loadQueue = [];
    const pendingLoads = new Map();
    const loadedUrls = new Set();

    function normalize(theme) {
        return Object.prototype.hasOwnProperty.call(THEMES, theme) ? theme : 'classic';
    }

    function readStoredTheme() {
        try {
            return normalize(root.localStorage?.getItem(STORAGE_KEY));
        } catch (error) {
            return 'classic';
        }
    }

    function assetUrl(filename, assetBase = currentAssetBase) {
        return `${assetBase || ''}assets/deck-svg/${filename}`;
    }

    function getFaceFile(card) {
        if (!card) return null;
        const rawRank = String(card.rank ?? card.value ?? '').trim();
        const jokerColor = String(card.color || card.jokerColor || '').toLowerCase();
        if (/joker/i.test(rawRank)) return jokerColor === 'red' ? 'Red_Joker.svg' : 'Black_Joker.svg';
        const rank = RANK_FILES[rawRank.toUpperCase()];
        const suit = SUIT_FILES[card.suit];
        return rank && suit ? `${rank}_of_${suit}.svg` : null;
    }

    function getFaceUrl(card, assetBase = currentAssetBase) {
        const filename = getFaceFile(card);
        return filename ? assetUrl(filename, assetBase) : null;
    }

    function getBackUrl(assetBase = currentAssetBase, theme = currentTheme) {
        const back = THEMES[normalize(theme)].back;
        return back ? assetUrl(back, assetBase) : null;
    }

    function isIllustrated(theme = currentTheme) {
        return normalize(theme) !== 'classic';
    }

    function priorityValue(priority) {
        if (Number.isFinite(priority)) return priority;
        return LOAD_PRIORITIES[priority] ?? LOAD_PRIORITIES.normal;
    }

    function assignLoadedSource(target, url) {
        if (!target) return;
        target.src = url;
        target.removeAttribute?.('data-card-src');
        target.removeAttribute?.('data-card-priority');
    }

    function pumpLoadQueue() {
        if (typeof root.Image !== 'function') return;
        loadQueue.sort((first, second) => first.priority - second.priority || first.order - second.order);
        while (activeLoads < MAX_CONCURRENT_LOADS && loadQueue.length) {
            const entry = loadQueue.shift();
            if (entry.loading) continue;
            entry.loading = true;
            activeLoads++;
            const loader = new root.Image();
            loader.decoding = 'async';
            loader.fetchPriority = entry.priority <= LOAD_PRIORITIES.hand ? 'high' : 'low';
            const finish = loaded => {
                if (loaded) loadedUrls.add(entry.url);
                pendingLoads.delete(entry.url);
                activeLoads--;
                if (loaded) entry.targets.forEach(target => assignLoadedSource(target, entry.url));
                pumpLoadQueue();
            };
            loader.onload = () => finish(true);
            loader.onerror = () => finish(false);
            loader.src = entry.url;
        }
    }

    function queueUrl(url, priority = 'normal', target = null) {
        if (!url) return;
        if (loadedUrls.has(url)) {
            assignLoadedSource(target, url);
            return;
        }
        const numericPriority = priorityValue(priority);
        const existing = pendingLoads.get(url);
        if (existing) {
            if (target) existing.targets.push(target);
            existing.priority = Math.min(existing.priority, numericPriority);
            pumpLoadQueue();
            return;
        }
        const entry = {
            url,
            priority: numericPriority,
            order: loadOrder++,
            targets: target ? [target] : [],
            loading: false
        };
        pendingLoads.set(url, entry);
        loadQueue.push(entry);
        pumpLoadQueue();
    }

    function hydrate(container = root.document) {
        if (!isIllustrated() || !container) return;
        const images = [];
        if (container.matches?.('img.svg-card-art[data-card-src]')) images.push(container);
        container.querySelectorAll?.('img.svg-card-art[data-card-src]').forEach(image => images.push(image));
        images.forEach((image, index) => {
            const priority = image.dataset.cardPriority || 'normal';
            const url = image.dataset.cardSrc;
            const staggeredPriority = priorityValue(priority) + Math.min(index, 30) / 100;
            queueUrl(url, staggeredPriority, image);
        });
    }

    function preloadVisibleCards(cards, options = {}) {
        if (!isIllustrated()) return;
        const assetBase = options.assetBase ?? currentAssetBase;
        const priority = options.priority || 'hand';
        (cards || [])
            .filter(card => card && !card.hidden)
            .forEach(card => queueUrl(getFaceUrl(card, assetBase), priority));
    }

    function allFaceUrls(assetBase = currentAssetBase) {
        const urls = [];
        for (const rank of Object.keys(RANK_FILES)) {
            for (const suit of Object.keys(SUIT_FILES)) {
                urls.push(getFaceUrl({ rank, suit }, assetBase));
            }
        }
        urls.push(assetUrl('Black_Joker.svg', assetBase), assetUrl('Red_Joker.svg', assetBase));
        return urls;
    }

    function scheduleIdleWarmup(assetBase = currentAssetBase) {
        if (!isIllustrated() || idleWarmupScheduled) return;
        const connection = root.navigator?.connection;
        if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return;
        idleWarmupScheduled = true;
        const warm = () => allFaceUrls(assetBase).forEach(url => queueUrl(url, 'idle'));
        if (typeof root.requestIdleCallback === 'function') {
            root.requestIdleCallback(warm, { timeout: 5000 });
        } else {
            root.setTimeout?.(warm, 3000);
        }
    }

    function faceMarkup(card, assetBase = currentAssetBase, options = {}) {
        if (!isIllustrated()) return '';
        const url = getFaceUrl(card, assetBase);
        const priority = options.priority || 'normal';
        return url
            ? `<img class="svg-card-art" data-card-src="${url}" data-card-priority="${priority}" alt="" aria-hidden="true" draggable="false" decoding="async">`
            : '';
    }

    function apply(theme = currentTheme, assetBase = currentAssetBase) {
        currentTheme = normalize(theme);
        currentAssetBase = assetBase || '';
        const document = root.document;
        if (!document?.documentElement) return currentTheme;
        document.documentElement.dataset.cardTheme = currentTheme;
        const backUrl = getBackUrl(currentAssetBase, currentTheme);
        if (backUrl) {
            document.documentElement.style.setProperty('--card-theme-back-image', `url("${backUrl}")`);
            queueUrl(backUrl, 'public');
            scheduleIdleWarmup(currentAssetBase);
        } else {
            document.documentElement.style.removeProperty('--card-theme-back-image');
        }
        return currentTheme;
    }

    function set(theme, assetBase = currentAssetBase) {
        const nextTheme = apply(theme, assetBase);
        try {
            root.localStorage?.setItem(STORAGE_KEY, nextTheme);
        } catch (error) {}
        return nextTheme;
    }

    function cycle(assetBase = currentAssetBase) {
        const keys = Object.keys(THEMES);
        const next = keys[(keys.indexOf(currentTheme) + 1) % keys.length];
        return set(next, assetBase);
    }

    function updateControls(selects, buttons) {
        selects.forEach(select => {
            select.value = currentTheme;
        });
        buttons.forEach(button => {
            button.textContent = `CARDS: ${THEMES[currentTheme].buttonLabel}`;
            button.dataset.shortLabel = THEMES[currentTheme].shortLabel;
            button.setAttribute('aria-label', `Card design: ${THEMES[currentTheme].label}. Activate to change.`);
            button.title = `Card design: ${THEMES[currentTheme].label}`;
        });
    }

    function bind(options = {}) {
        const document = root.document;
        if (!document) return;
        const selectIds = options.selectIds || [];
        const buttonIds = options.buttonIds || [];
        const selects = selectIds.map(id => document.getElementById(id)).filter(Boolean);
        const buttons = buttonIds.map(id => document.getElementById(id)).filter(Boolean);
        currentTheme = readStoredTheme();
        apply(currentTheme, options.assetBase || '');

        selects.forEach(select => {
            select.replaceChildren(...Object.entries(THEMES).map(([value, theme]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = theme.label;
                return option;
            }));
            select.onchange = () => {
                set(select.value, options.assetBase || '');
                updateControls(selects, buttons);
                options.onChange?.(currentTheme);
            };
        });
        buttons.forEach(button => {
            button.onclick = () => {
                cycle(options.assetBase || '');
                updateControls(selects, buttons);
                options.onChange?.(currentTheme);
            };
        });
        updateControls(selects, buttons);
        hydrate(document);
    }

    currentTheme = readStoredTheme();

    return {
        STORAGE_KEY,
        THEMES,
        normalize,
        get: () => currentTheme,
        set,
        cycle,
        apply,
        bind,
        isIllustrated,
        getFaceFile,
        getFaceUrl,
        getBackUrl,
        faceMarkup,
        hydrate,
        preloadVisibleCards,
        scheduleIdleWarmup,
        allFaceUrls,
        getLoadStats: () => ({
            active: activeLoads,
            queued: loadQueue.length,
            pending: pendingLoads.size,
            loaded: loadedUrls.size
        }),
        LOAD_PRIORITIES
    };
});
