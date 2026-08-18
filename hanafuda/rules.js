(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.HanafudaRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const MONTHS = [
        'Pine', 'Plum', 'Cherry', 'Wisteria', 'Iris', 'Peony',
        'Bush Clover', 'Pampas', 'Chrysanthemum', 'Maple', 'Willow', 'Paulownia'
    ];
    const ASSET_MONTHS = ['January_Pine', 'February_Plum', 'March_Cherry', 'April_Wisteria', 'May_Iris', 'June_Peony', 'July_Clover', 'August_Pampas', 'September_Chrysanthemum', 'October_Maple', 'November_Willow', 'December_Paulownia'];

    const CARD_BLUEPRINTS = [
        [1, 'Crane & Sun', ['Bright'], 'crane'], [1, 'Poetry Ribbon', ['Ribbon', 'Poetry'], 'ribbon-poetry'], [1, 'Pine Chaff I', ['Chaff'], 'chaff'], [1, 'Pine Chaff II', ['Chaff'], 'chaff'],
        [2, 'Bush Warbler', ['Animal'], 'warbler'], [2, 'Poetry Ribbon', ['Ribbon', 'Poetry'], 'ribbon-poetry'], [2, 'Plum Chaff I', ['Chaff'], 'chaff'], [2, 'Plum Chaff II', ['Chaff'], 'chaff'],
        [3, 'Curtain', ['Bright'], 'curtain'], [3, 'Poetry Ribbon', ['Ribbon', 'Poetry'], 'ribbon-poetry'], [3, 'Cherry Chaff I', ['Chaff'], 'chaff'], [3, 'Cherry Chaff II', ['Chaff'], 'chaff'],
        [4, 'Cuckoo', ['Animal'], 'cuckoo'], [4, 'Red Ribbon', ['Ribbon'], 'ribbon-red'], [4, 'Wisteria Chaff I', ['Chaff'], 'chaff'], [4, 'Wisteria Chaff II', ['Chaff'], 'chaff'],
        [5, 'Eight-plank Bridge', ['Animal'], 'bridge'], [5, 'Red Ribbon', ['Ribbon'], 'ribbon-red'], [5, 'Iris Chaff I', ['Chaff'], 'chaff'], [5, 'Iris Chaff II', ['Chaff'], 'chaff'],
        [6, 'Butterflies', ['Animal'], 'butterfly'], [6, 'Blue Ribbon', ['Ribbon', 'Blue'], 'ribbon-blue'], [6, 'Peony Chaff I', ['Chaff'], 'chaff'], [6, 'Peony Chaff II', ['Chaff'], 'chaff'],
        [7, 'Boar', ['Animal'], 'boar'], [7, 'Red Ribbon', ['Ribbon'], 'ribbon-red'], [7, 'Bush Clover Chaff I', ['Chaff'], 'chaff'], [7, 'Bush Clover Chaff II', ['Chaff'], 'chaff'],
        [8, 'Full Moon', ['Bright'], 'moon'], [8, 'Geese', ['Animal'], 'geese'], [8, 'Pampas Chaff I', ['Chaff'], 'chaff'], [8, 'Pampas Chaff II', ['Chaff'], 'chaff'],
        [9, 'Sake Cup', ['Animal', 'Chaff'], 'sake'], [9, 'Blue Ribbon', ['Ribbon', 'Blue'], 'ribbon-blue'], [9, 'Chrysanthemum Chaff I', ['Chaff'], 'chaff'], [9, 'Chrysanthemum Chaff II', ['Chaff'], 'chaff'],
        [10, 'Deer', ['Animal'], 'deer'], [10, 'Blue Ribbon', ['Ribbon', 'Blue'], 'ribbon-blue'], [10, 'Maple Chaff I', ['Chaff'], 'chaff'], [10, 'Maple Chaff II', ['Chaff'], 'chaff'],
        [11, 'Rain Man', ['Bright', 'Rain'], 'rain-man'], [11, 'Swallow', ['Animal'], 'swallow'], [11, 'Red Ribbon', ['Ribbon'], 'ribbon-red'], [11, 'Lightning', ['Chaff', 'Lightning'], 'lightning'],
        [12, 'Phoenix', ['Bright'], 'phoenix'], [12, 'Paulownia Chaff I', ['Chaff'], 'chaff'], [12, 'Paulownia Chaff II', ['Chaff'], 'chaff'], [12, 'Paulownia Chaff III', ['Chaff'], 'chaff']
    ];

    const SPECIAL = {
        crane: 'h-1-0', curtain: 'h-3-0', boar: 'h-7-0', moon: 'h-8-0',
        sake: 'h-9-0', deer: 'h-10-0', rain: 'h-11-0', lightning: 'h-11-3', phoenix: 'h-12-0',
        poetry: ['h-1-1', 'h-2-1', 'h-3-1'],
        blue: ['h-6-1', 'h-9-1', 'h-10-1']
    };

    function shuffle(cards, random = Math.random) {
        const result = [...cards];
        for (let index = result.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(random() * (index + 1));
            [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
        }
        return result;
    }

    function createDeck(random = Math.random) {
        const monthOffsets = Array(12).fill(0);
        return shuffle(CARD_BLUEPRINTS.map(([month, name, categories, motif]) => {
            const monthIndex = monthOffsets[month - 1]++;
            return {
                id: `h-${month}-${monthIndex}`,
                month,
                monthName: MONTHS[month - 1],
                name,
                categories: [...categories],
                motif,
                asset: `../assets/hanafuda-svg/${String(month).padStart(2, '0')}_${ASSET_MONTHS[month - 1]}_Card_${monthIndex + 1}.svg`,
                ownerId: null
            };
        }), random);
    }

    const byMonth = cards => cards.reduce((groups, card) => {
        (groups[card.month] ||= []).push(card);
        return groups;
    }, {});

    function instantWin(cards) {
        const counts = Object.values(byMonth(cards)).map(group => group.length);
        if (counts.includes(4)) return { type: 'teshi', label: 'Teshi (four of one month)', points: 6 };
        if (counts.filter(count => count === 2).length === 4) return { type: 'kuttsuki', label: 'Kuttsuki (four pairs)', points: 6 };
        return null;
    }

    const hasAll = (ids, required) => required.every(id => ids.has(id));

    function evaluateYaku(captured, settings = {}) {
        const cards = Array.isArray(captured) ? captured : [];
        const ids = new Set(cards.map(card => card.id));
        const category = name => cards.filter(card => card.categories?.includes(name));
        const brights = category('Bright');
        const nonRainBrights = brights.filter(card => card.id !== SPECIAL.rain);
        const yaku = [];

        if (brights.length === 5) yaku.push({ id: 'goko', name: 'Gokō · Five Brights', points: 10 });
        else if (nonRainBrights.length === 4) yaku.push({ id: 'shiko', name: 'Shikō · Four Brights', points: 8 });
        else if (brights.length >= 4 && ids.has(SPECIAL.rain)) yaku.push({ id: 'ameshiko', name: 'Ame-Shikō · Rainy Four Brights', points: 7 });
        else if (nonRainBrights.length >= 3) yaku.push({ id: 'sanko', name: 'Sankō · Three Brights', points: 5 });

        if (hasAll(ids, [SPECIAL.boar, SPECIAL.deer, 'h-6-0'])) {
            yaku.push({ id: 'inoshikacho', name: 'Ino-Shika-Chō', points: 5 });
        }
        if (hasAll(ids, SPECIAL.poetry)) yaku.push({ id: 'akatan', name: 'Akatan · Poetry Ribbons', points: 5 });
        if (hasAll(ids, SPECIAL.blue)) yaku.push({ id: 'aotan', name: 'Aotan · Blue Ribbons', points: 5 });

        const animals = category('Animal').length;
        const ribbons = category('Ribbon').length;
        const chaff = category('Chaff').length;
        if (animals >= 5) yaku.push({ id: 'tane', name: `Tane · ${animals} Animals`, points: animals - 4, level: animals });
        if (ribbons >= 5) yaku.push({ id: 'tanzaku', name: `Tanzaku · ${ribbons} Ribbons`, points: ribbons - 4, level: ribbons });
        if (chaff >= 10) yaku.push({ id: 'kasu', name: `Kasu · ${chaff} Chaff`, points: chaff - 9, level: chaff });

        if (settings.viewingYaku) {
            const busted = settings.bustedViewing && ids.has(SPECIAL.lightning);
            if (!busted && ids.has(SPECIAL.sake) && ids.has(SPECIAL.moon)) {
                yaku.push({ id: 'tsukimi', name: 'Tsukimi-zake · Moon Viewing', points: 5 });
            }
            if (!busted && ids.has(SPECIAL.sake) && ids.has(SPECIAL.curtain)) {
                yaku.push({ id: 'hanami', name: 'Hanami-zake · Blossom Viewing', points: 5 });
            }
        }

        const points = yaku.reduce((sum, item) => sum + item.points, 0);
        return { yaku, points, signature: yaku.map(item => `${item.id}:${item.level || item.points}`).sort().join('|') };
    }

    function isNewOrUpgraded(previous, current) {
        const prior = new Map((previous?.yaku || []).map(item => [item.id, item.level || item.points]));
        return (current?.yaku || []).some(item => !prior.has(item.id) || (item.level || item.points) > prior.get(item.id));
    }

    function scoreWin(basePoints, opponentCalledKoiKoi = false) {
        const base = Math.max(0, Number(basePoints) || 0);
        const sevenPlusMultiplier = base >= 7 ? 2 : 1;
        const koiKoiPenaltyMultiplier = opponentCalledKoiKoi ? 2 : 1;
        return {
            base,
            sevenPlusMultiplier,
            koiKoiPenaltyMultiplier,
            total: base * sevenPlusMultiplier * koiKoiPenaltyMultiplier
        };
    }

    function matchingFieldCards(field, card) {
        return (field || []).filter(item => item.month === card.month);
    }

    function resolveCapture(field, card, targetId = null) {
        const matches = matchingFieldCards(field, card);
        if (matches.length === 2 && !targetId) return { needsChoice: true, choices: matches };
        let captured = [];
        if (matches.length === 1) captured = [matches[0], card];
        else if (matches.length >= 3) captured = [...matches, card];
        else if (matches.length === 2) {
            const target = matches.find(item => item.id === targetId);
            if (!target) return { invalid: true, reason: 'Choose one of the two matching field cards.' };
            captured = [target, card];
        }
        const capturedIds = new Set(captured.map(item => item.id));
        return {
            captured,
            field: captured.length ? field.filter(item => !capturedIds.has(item.id)) : [...field, card],
            needsChoice: false
        };
    }

    function cardPriority(card) {
        const weights = { Bright: 18, Animal: 7, Ribbon: 5, Chaff: 1 };
        return Math.max(...(card.categories || []).map(category => weights[category] || 0), 0)
            + (card.categories?.includes('Poetry') || card.categories?.includes('Blue') ? 4 : 0)
            + (card.id === SPECIAL.sake ? 7 : 0);
    }

    return {
        MONTHS,
        ASSET_MONTHS,
        CARD_BLUEPRINTS,
        SPECIAL,
        shuffle,
        createDeck,
        byMonth,
        instantWin,
        evaluateYaku,
        isNewOrUpgraded,
        scoreWin,
        matchingFieldCards,
        resolveCapture,
        cardPriority
    };
});
