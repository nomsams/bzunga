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
    const CALENDAR_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const ASSET_MONTHS = ['January_Pine', 'February_Plum', 'March_Cherry', 'April_Wisteria', 'May_Iris', 'June_Peony', 'July_Clover', 'August_Pampas', 'September_Chrysanthemum', 'October_Maple', 'November_Willow', 'December_Paulownia'];
    const HAWAII_ASSET_MONTHS = ['January_Pine', 'February_Plum', 'March_Cherry', 'April_Wisteria', 'May_Iris', 'June_Peony', 'July_BushClover', 'August_Grass', 'September_Chrysanthemum', 'October_Maple', 'November_Willow', 'December_Paulownia'];
    const JAPANESE_MONTHS = [
        { name: '睦月・松', reading: 'Mutsuki · Matsu' }, { name: '如月・梅', reading: 'Kisaragi · Ume' },
        { name: '弥生・桜', reading: 'Yayoi · Sakura' }, { name: '卯月・藤', reading: 'Uzuki · Fuji' },
        { name: '皐月・菖蒲', reading: 'Satsuki · Ayame' }, { name: '水無月・牡丹', reading: 'Minazuki · Botan' },
        { name: '文月・萩', reading: 'Fumizuki · Hagi' }, { name: '葉月・芒', reading: 'Hazuki · Susuki' },
        { name: '長月・菊', reading: 'Nagatsuki · Kiku' }, { name: '神無月・紅葉', reading: 'Kannazuki · Momiji' },
        { name: '霜月・柳', reading: 'Shimotsuki · Yanagi' }, { name: '師走・桐', reading: 'Shiwasu · Kiri' }
    ];

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

    const MANTIA_ASSETS = [
        'Hanafuda_January_Hikari.png', 'Hanafuda_January_Tanzaku.png', 'Hanafuda_January_Kasu_1.png', 'Hanafuda_January_Kasu_2.png',
        'Hanafuda_February_Tane.png', 'Hanafuda_February_Tanzaku.png', 'Hanafuda_February_Kasu_1.png', 'Hanafuda_February_Kasu_2.png',
        'Hanafuda_March_Hikari.png', 'Hanafuda_March_Tanzaku.png', 'Hanafuda_March_Kasu_1.png', 'Hanafuda_March_Kasu_2.png',
        'Hanafuda_April_Tane.png', 'Hanafuda_April_Tanzaku.png', 'Hanafuda_April_Kasu_1.png', 'Hanafuda_April_Kasu_2.png',
        'Hanafuda_May_Tane.png', 'Hanafuda_May_Tanzaku.png', 'Hanafuda_May_Kasu_1.png', 'Hanafuda_May_Kasu_2.png',
        'Hanafuda_June_Tane.png', 'Hanafuda_June_Tanzaku.png', 'Hanafuda_June_Kasu_1.png', 'Hanafuda_June_Kasu_2.png',
        'Hanafuda_July_Tane.png', 'Hanafuda_July_Tanzaku.png', 'Hanafuda_July_Kasu_1.png', 'Hanafuda_July_Kasu_2.png',
        'Hanafuda_August_Hikari.png', 'Hanafuda_August_Tane.png', 'Hanafuda_August_Kasu_1.png', 'Hanafuda_August_Kasu_2.png',
        'Hanafuda_September_Tane.png', 'Hanafuda_September_Tanzaku.png', 'Hanafuda_September_Kasu_1.png', 'Hanafuda_September_Kasu_2.png',
        'Hanafuda_October_Tane.png', 'Hanafuda_October_Tanzaku.png', 'Hanafuda_October_Kasu_1.png', 'Hanafuda_October_Kasu_2.png',
        'Hanafuda_November_Hikari.png', 'Hanafuda_November_Tane.png', 'Hanafuda_November_Tanzaku.png', 'Hanafuda_November_Kasu.png',
        'Hanafuda_December_Hikari.png', 'Hanafuda_December_Kasu_1.png', 'Hanafuda_December_Kasu_2.png', 'Hanafuda_December_Kasu_3.png'
    ];

    // Hawaii's printed deck order differs from the traditional blueprint order.
    // Keep this list aligned with CARD_BLUEPRINTS so art, Yaku category and card details never drift apart.
    const HAWAII_CARDS = [
        { file: '01_January_Pine_Card_1.svg', name: 'Crane & Sun', printedPoints: '20 Points' },
        { file: '01_January_Pine_Card_2.svg', name: 'Poetry Ribbon', printedPoints: '10 Points' },
        { file: '01_January_Pine_Card_3.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '01_January_Pine_Card_4.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '02_February_Plum_Card_2.svg', name: 'Bush Warbler in Tree', printedPoints: '5 Points' },
        { file: '02_February_Plum_Card_1.svg', name: 'Poetry Ribbon', printedPoints: '10 Points' },
        { file: '02_February_Plum_Card_3.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '02_February_Plum_Card_4.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '03_March_Cherry_Card_1.svg', name: 'Camp Curtain', printedPoints: '20 Points' },
        { file: '03_March_Cherry_Card_2.svg', name: 'Poetry Ribbon', printedPoints: '10 Points' },
        { file: '03_March_Cherry_Card_3.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '03_March_Cherry_Card_4.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '04_April_Wisteria_Card_2.svg', name: 'Cuckoo Bird', printedPoints: '5 Points' },
        { file: '04_April_Wisteria_Card_1.svg', name: 'Red Ribbon', printedPoints: '10 Points' },
        { file: '04_April_Wisteria_Card_3.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '04_April_Wisteria_Card_4.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '05_May_Iris_Card_2.svg', name: 'Eight-Plank Bridge', printedPoints: '5 Points' },
        { file: '05_May_Iris_Card_1.svg', name: 'Red Ribbon', printedPoints: '10 Points' },
        { file: '05_May_Iris_Card_3.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '05_May_Iris_Card_4.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '06_June_Peony_Card_2.svg', name: 'Butterflies', printedPoints: '5 Points' },
        { file: '06_June_Peony_Card_1.svg', name: 'Blue Ribbon', printedPoints: '10 Points' },
        { file: '06_June_Peony_Card_3.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '06_June_Peony_Card_4.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '07_July_BushClover_Card_2.svg', name: 'Boar', printedPoints: '5 Points' },
        { file: '07_July_BushClover_Card_1.svg', name: 'Red Ribbon', printedPoints: '10 Points' },
        { file: '07_July_BushClover_Card_3.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '07_July_BushClover_Card_4.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '08_August_Grass_Card_1.svg', name: 'Moon & Rabbit', printedPoints: '20 Points' },
        { file: '08_August_Grass_Card_2.svg', name: 'Geese Flying', printedPoints: '5 Points' },
        { file: '08_August_Grass_Card_3.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '08_August_Grass_Card_4.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '09_September_Chrysanthemum_Card_2.svg', name: 'Sake Cup', printedPoints: '5 Points' },
        { file: '09_September_Chrysanthemum_Card_1.svg', name: 'Blue Ribbon', printedPoints: '10 Points' },
        { file: '09_September_Chrysanthemum_Card_3.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '09_September_Chrysanthemum_Card_4.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '10_October_Maple_Card_2.svg', name: 'Deer', printedPoints: '5 Points' },
        { file: '10_October_Maple_Card_1.svg', name: 'Blue Ribbon', printedPoints: '10 Points' },
        { file: '10_October_Maple_Card_3.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '10_October_Maple_Card_4.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '11_November_Willow_Card_2.svg', name: 'Rainman', printedPoints: '5 Points' },
        { file: '11_November_Willow_Card_3.svg', name: 'Swallow Bird', printedPoints: '5 Points' },
        { file: '11_November_Willow_Card_1.svg', name: 'Red Ribbon', printedPoints: '10 Points' },
        { file: '11_November_Willow_Card_4.svg', name: 'Lightning Storm · Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '12_December_Paulownia_Card_1.svg', name: 'Phoenix', printedPoints: '20 Points' },
        { file: '12_December_Paulownia_Card_2.svg', name: 'Yellow Base Chaff', printedPoints: '10 Points' },
        { file: '12_December_Paulownia_Card_3.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' },
        { file: '12_December_Paulownia_Card_4.svg', name: 'Plain (Chaff)', printedPoints: 'No points printed' }
    ];

    const HAWAII_MONTH_NAMES = ['Pine', 'Plum', 'Cherry', 'Wisteria', 'Iris', 'Peony', 'Bush Clover', 'Grass', 'Chrysanthemum', 'Maple', 'Willow', 'Paulownia'];

    const JAPANESE_CARD_NAMES = [
        '松に鶴', '赤短', '松のカス', '松のカス',
        '梅に鶯', '赤短', '梅のカス', '梅のカス',
        '桜に幕', '赤短', '桜のカス', '桜のカス',
        '藤に不如帰', '藤の短冊', '藤のカス', '藤のカス',
        '菖蒲に八橋', '菖蒲の短冊', '菖蒲のカス', '菖蒲のカス',
        '牡丹に蝶', '青短', '牡丹のカス', '牡丹のカス',
        '萩に猪', '萩の短冊', '萩のカス', '萩のカス',
        '芒に月', '芒に雁', '芒のカス', '芒のカス',
        '菊に盃', '青短', '菊のカス', '菊のカス',
        '紅葉に鹿', '青短', '紅葉のカス', '紅葉のカス',
        '柳に小野道風', '柳に燕', '柳の短冊', '柳のカス',
        '桐に鳳凰', '桐のカス', '桐のカス', '桐のカス'
    ];

    const JAPANESE_TYPES = {
        Bright: { name: '光札', reading: 'Hikari-fuda' },
        Animal: { name: '種札', reading: 'Tane-fuda' },
        Ribbon: { name: '短冊札', reading: 'Tanzaku-fuda' },
        Chaff: { name: 'カス札', reading: 'Kasu-fuda' }
    };

    const TABLE_MODES = Object.freeze({
        duel: Object.freeze({
            id: 'duel', name: 'Koi-Koi Duel', shortName: 'DUEL', playerCount: 2,
            handSize: 8, fieldSize: 8, variant: false,
            description: 'Classic head-to-head Koi-Koi. Eight cards each and eight cards on the field.'
        }),
        trio: Object.freeze({
            id: 'trio', name: 'Koi-Koi Trio', shortName: 'TRIO', playerCount: 3,
            handSize: 7, fieldSize: 6, variant: true,
            description: 'Three-player Koi-Koi variant using the traditional Hana-Awase seven-card, six-field deal.'
        }),
        party: Object.freeze({
            id: 'party', name: 'Koi-Koi Party', shortName: 'PARTY', playerCount: 4,
            handSize: 5, fieldSize: 8, variant: true,
            description: 'Fast four-player Koi-Koi variant with five cards each and eight cards on the field.'
        })
    });

    const tableMode = modeId => TABLE_MODES[modeId] || TABLE_MODES.duel;

    const YAKU_GUIDE = [
        { id: 'kasu', name: 'Kasu · Chaff', japanese: 'カス', points: '1 point at 10 · +1 each extra', description: 'Collect 10 Chaff cards. The September Sake Cup also counts as Chaff.', cardIds: ['h-1-2', 'h-2-2', 'h-3-2', 'h-4-2'] },
        { id: 'tanzaku', name: 'Tanzaku · Ribbons', japanese: '短冊', points: '1 point at 5 · +1 each extra', description: 'Collect any 5 Ribbon cards.', cardIds: ['h-1-1', 'h-2-1', 'h-3-1', 'h-4-1', 'h-5-1'] },
        { id: 'tane', name: 'Tane · Animals', japanese: 'タネ', points: '1 point at 5 · +1 each extra', description: 'Collect any 5 Animal cards. The September Sake Cup counts here too.', cardIds: ['h-2-0', 'h-4-0', 'h-5-0', 'h-6-0', 'h-7-0'] },
        { id: 'inoshikacho', name: 'Ino-Shika-Chō · Boar, Deer, Butterflies', japanese: '猪鹿蝶', points: '5 points', description: 'Collect the July Boar, October Deer, and June Butterflies.', cardIds: ['h-7-0', 'h-10-0', 'h-6-0'] },
        { id: 'akatan', name: 'Akatan · Red Poetry Ribbons', japanese: '赤短', points: '5 points', description: 'Collect all 3 red Poetry Ribbons from January, February, and March.', cardIds: ['h-1-1', 'h-2-1', 'h-3-1'] },
        { id: 'aotan', name: 'Aotan · Blue Ribbons', japanese: '青短', points: '5 points', description: 'Collect all 3 blue Ribbons from June, September, and October.', cardIds: ['h-6-1', 'h-9-1', 'h-10-1'] },
        { id: 'sanko', name: 'Sankō · Three Brights', japanese: '三光', points: '5 points', description: 'Collect any 3 Bright cards without the November Rain Man.', cardIds: ['h-1-0', 'h-3-0', 'h-8-0'] },
        { id: 'ameshiko', name: 'Ame-Shikō · Rainy Four Brights', japanese: '雨四光', points: '7 points', description: 'Collect the November Rain Man plus any 3 other Bright cards.', cardIds: ['h-11-0', 'h-1-0', 'h-3-0', 'h-8-0'] },
        { id: 'shiko', name: 'Shikō · Four Brights', japanese: '四光', points: '8 points', description: 'Collect all 4 non-rain Bright cards.', cardIds: ['h-1-0', 'h-3-0', 'h-8-0', 'h-12-0'] },
        { id: 'goko', name: 'Gokō · Five Brights', japanese: '五光', points: '10 points', description: 'Collect all 5 Bright cards, including the November Rain Man.', cardIds: ['h-1-0', 'h-3-0', 'h-8-0', 'h-11-0', 'h-12-0'] },
        { id: 'tsukimi', name: 'Tsukimi-zake · Moon Viewing', japanese: '月見酒', points: '5 points · optional rule', description: 'Collect the August Full Moon and September Sake Cup. This Yaku is off by default.', cardIds: ['h-8-0', 'h-9-0'], optional: true },
        { id: 'hanami', name: 'Hanami-zake · Blossom Viewing', japanese: '花見酒', points: '5 points · optional rule', description: 'Collect the March Curtain and September Sake Cup. This Yaku is off by default.', cardIds: ['h-3-0', 'h-9-0'], optional: true },
        { id: 'oya-ken', name: 'Oya-ken · Dealer privilege', japanese: '親権', points: '6 points', description: 'If both hands run out without a new winning Yaku, the dealer receives 6 points.', cardIds: [], system: true },
        { id: 'bake-fuda', name: 'Bake-fuda · Dual-type Sake Cup', japanese: '化け札', points: 'Special card', description: 'The September Sake Cup counts once as an Animal and once as Chaff at the same time.', cardIds: ['h-9-0'], system: true },
        { id: 'tsuki-fuda', name: 'Tsuki-fuda · Monthly Cards', japanese: '月札', points: '4 points in that variant · not active', description: 'Some variants award 4 points for all four cards of one month. This table does not score that Yaku.', cardIds: ['h-1-0', 'h-1-1', 'h-1-2', 'h-1-3'], variant: true }
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
        return shuffle(CARD_BLUEPRINTS.map(([month, name, categories, motif], blueprintIndex) => {
            const monthIndex = monthOffsets[month - 1]++;
            const cardTypes = ['Bright', 'Animal', 'Ribbon', 'Chaff'].filter(category => categories.includes(category));
            const hawaii = HAWAII_CARDS[blueprintIndex];
            return {
                id: `h-${month}-${monthIndex}`,
                month,
                monthIndex,
                calendarMonth: CALENDAR_MONTHS[month - 1],
                monthName: MONTHS[month - 1],
                name,
                japaneseName: JAPANESE_CARD_NAMES[blueprintIndex],
                japaneseMonth: JAPANESE_MONTHS[month - 1].name,
                japaneseMonthReading: JAPANESE_MONTHS[month - 1].reading,
                japaneseType: cardTypes.map(type => JAPANESE_TYPES[type].name).join('・'),
                japaneseTypeReading: cardTypes.map(type => JAPANESE_TYPES[type].reading).join(' / '),
                categories: [...categories],
                motif,
                asset: `../assets/hanafuda-svg/${String(month).padStart(2, '0')}_${ASSET_MONTHS[month - 1]}_Card_${monthIndex + 1}.svg`,
                mantiaAsset: `../assets/hanafuda-mantia/${MANTIA_ASSETS[blueprintIndex]}`,
                hawaiiAsset: `../assets/hanafuda-hawaii/${hawaii.file}`,
                hawaiiName: hawaii.name,
                hawaiiPrintedPoints: hawaii.printedPoints,
                hawaiiMonthName: HAWAII_MONTH_NAMES[month - 1],
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

    function cardPresentation(card, artTheme = 'scanned-svg') {
        if (artTheme === 'hawaii-svg' && card?.hawaiiName) {
            return {
                name: card.hawaiiName,
                calendarMonth: card.calendarMonth || CALENDAR_MONTHS[(card.month || 1) - 1],
                monthName: card.hawaiiMonthName || card.monthName,
                pointLabel: card.hawaiiPrintedPoints || 'No points printed',
                pointTitle: 'Printed value',
                deckName: 'Hawaii style'
            };
        }
        const traditionalPoints = card?.categories?.includes('Bright') ? 20 : card?.categories?.includes('Animal') ? 10 : card?.categories?.includes('Ribbon') ? 5 : 1;
        return {
            name: card?.name || 'Hanafuda card',
            calendarMonth: card?.calendarMonth || CALENDAR_MONTHS[((card?.month || 1) - 1)],
            monthName: card?.monthName || '',
            pointLabel: `${traditionalPoints} Point${traditionalPoints === 1 ? '' : 's'}`,
            pointTitle: 'Traditional card value',
            deckName: artTheme === 'mantia-png' ? 'Louie Mantia' : 'Scanned traditional'
        };
    }

    return {
        MONTHS,
        CALENDAR_MONTHS,
        ASSET_MONTHS,
        HAWAII_ASSET_MONTHS,
        JAPANESE_MONTHS,
        CARD_BLUEPRINTS,
        MANTIA_ASSETS,
        HAWAII_CARDS,
        HAWAII_MONTH_NAMES,
        JAPANESE_CARD_NAMES,
        JAPANESE_TYPES,
        TABLE_MODES,
        tableMode,
        YAKU_GUIDE,
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
        cardPriority,
        cardPresentation
    };
});
