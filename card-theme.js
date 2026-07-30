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

    let currentTheme = 'classic';
    let currentAssetBase = '';

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

    function faceMarkup(card, assetBase = currentAssetBase) {
        if (!isIllustrated()) return '';
        const url = getFaceUrl(card, assetBase);
        return url
            ? `<img class="svg-card-art" src="${url}" alt="" aria-hidden="true" draggable="false">`
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
        faceMarkup
    };
});
