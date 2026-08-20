const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Rules = require('../hanafuda/rules.js');

const assetDir = path.join(__dirname, '..', 'assets', 'hanafuda-hawaii');
const files = fs.readdirSync(assetDir).filter(file => file.endsWith('.svg')).sort();
const expected = [];
for (let month = 1; month <= 12; month++) {
    for (let card = 1; card <= 4; card++) expected.push(`${String(month).padStart(2, '0')}_${Rules.HAWAII_ASSET_MONTHS[month - 1]}_Card_${card}.svg`);
}
assert.strictEqual(files.length, 48, 'The Hawaii deck must contain exactly 48 SVG faces');
assert.deepStrictEqual(files, expected, 'The Hawaii filenames must cover four cards for every month');

for (const file of files) {
    const svg = fs.readFileSync(path.join(assetDir, file), 'utf8');
    const dimensions = svg.match(/<svg[^>]*width="(\d+)"[^>]*height="(\d+)"[^>]*viewBox="0 0 (\d+) (\d+)"/);
    assert(dimensions, `${file} must declare its card canvas`);
    const [width, height, viewWidth, viewHeight] = dimensions.slice(1).map(Number);
    assert(width >= 220 && width <= 232 && height >= 333 && height <= 346, `${file} must retain its source card proportions`);
    assert.deepStrictEqual([viewWidth, viewHeight], [width, height], `${file} viewBox and canvas must match`);
    const match = svg.match(/href="data:image\/png;base64,([^"\s]+)"/);
    assert(match, `${file} must contain its embedded PNG artwork`);
    const png = Buffer.from(match[1], 'base64');
    assert(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${file} must contain a valid PNG`);
    assert.deepStrictEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [width, height], `${file} must retain the source raster dimensions`);
}

const deck = Rules.createDeck(() => 0.5);
assert.strictEqual(new Set(deck.map(card => card.hawaiiAsset)).size, 48);
for (const card of deck) assert(files.includes(path.basename(card.hawaiiAsset)), `${card.id} must map to an existing Hawaii face`);

const manifest = [
    ['h-1-0', '01_January_Pine_Card_1.svg', 'Crane & Sun', '20 Points', ['Bright']],
    ['h-1-1', '01_January_Pine_Card_2.svg', 'Poetry Ribbon', '10 Points', ['Ribbon', 'Poetry']],
    ['h-1-2', '01_January_Pine_Card_3.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-1-3', '01_January_Pine_Card_4.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-2-0', '02_February_Plum_Card_2.svg', 'Bush Warbler in Tree', '5 Points', ['Animal']],
    ['h-2-1', '02_February_Plum_Card_1.svg', 'Poetry Ribbon', '10 Points', ['Ribbon', 'Poetry']],
    ['h-2-2', '02_February_Plum_Card_3.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-2-3', '02_February_Plum_Card_4.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-3-0', '03_March_Cherry_Card_1.svg', 'Camp Curtain', '20 Points', ['Bright']],
    ['h-3-1', '03_March_Cherry_Card_2.svg', 'Poetry Ribbon', '10 Points', ['Ribbon', 'Poetry']],
    ['h-3-2', '03_March_Cherry_Card_3.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-3-3', '03_March_Cherry_Card_4.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-4-0', '04_April_Wisteria_Card_2.svg', 'Cuckoo Bird', 'No points printed', ['Animal']],
    ['h-4-1', '04_April_Wisteria_Card_1.svg', 'Red Ribbon', '10 Points', ['Ribbon']],
    ['h-4-2', '04_April_Wisteria_Card_3.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-4-3', '04_April_Wisteria_Card_4.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-5-0', '05_May_Iris_Card_2.svg', 'Eight-Plank Bridge', '5 Points', ['Animal']],
    ['h-5-1', '05_May_Iris_Card_1.svg', 'Red Ribbon', '10 Points', ['Ribbon']],
    ['h-5-2', '05_May_Iris_Card_3.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-5-3', '05_May_Iris_Card_4.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-6-0', '06_June_Peony_Card_2.svg', 'Butterflies', '5 Points', ['Animal']],
    ['h-6-1', '06_June_Peony_Card_1.svg', 'Blue Ribbon', '10 Points', ['Ribbon', 'Blue']],
    ['h-6-2', '06_June_Peony_Card_3.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-6-3', '06_June_Peony_Card_4.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-7-0', '07_July_BushClover_Card_2.svg', 'Boar', '5 Points', ['Animal']],
    ['h-7-1', '07_July_BushClover_Card_1.svg', 'Red Ribbon', '10 Points', ['Ribbon']],
    ['h-7-2', '07_July_BushClover_Card_3.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-7-3', '07_July_BushClover_Card_4.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-8-0', '08_August_Grass_Card_1.svg', 'Moon & Rabbit', '20 Points', ['Bright']],
    ['h-8-1', '08_August_Grass_Card_2.svg', 'Geese Flying', '5 Points', ['Animal']],
    ['h-8-2', '08_August_Grass_Card_3.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-8-3', '08_August_Grass_Card_4.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-9-0', '09_September_Chrysanthemum_Card_2.svg', 'Sake Cup', '5 Points', ['Animal', 'Chaff']],
    ['h-9-1', '09_September_Chrysanthemum_Card_1.svg', 'Blue Ribbon', '10 Points', ['Ribbon', 'Blue']],
    ['h-9-2', '09_September_Chrysanthemum_Card_3.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-9-3', '09_September_Chrysanthemum_Card_4.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-10-0', '10_October_Maple_Card_2.svg', 'Deer', '5 Points', ['Animal']],
    ['h-10-1', '10_October_Maple_Card_1.svg', 'Blue Ribbon', '10 Points', ['Ribbon', 'Blue']],
    ['h-10-2', '10_October_Maple_Card_3.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-10-3', '10_October_Maple_Card_4.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-11-0', '11_November_Willow_Card_2.svg', 'Rainman', 'No points printed', ['Bright', 'Rain']],
    ['h-11-1', '11_November_Willow_Card_3.svg', 'Swallow Bird', '5 Points', ['Animal']],
    ['h-11-2', '11_November_Willow_Card_1.svg', 'Red Ribbon', '10 Points', ['Ribbon']],
    ['h-11-3', '11_November_Willow_Card_4.svg', 'Lightning Storm · Plain (Chaff)', 'No points printed', ['Chaff', 'Lightning']],
    ['h-12-0', '12_December_Paulownia_Card_1.svg', 'Phoenix', '20 Points', ['Bright']],
    ['h-12-1', '12_December_Paulownia_Card_2.svg', 'Yellow Base Chaff', '10 Points', ['Chaff']],
    ['h-12-2', '12_December_Paulownia_Card_3.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']],
    ['h-12-3', '12_December_Paulownia_Card_4.svg', 'Plain (Chaff)', 'No points printed', ['Chaff']]
];
const byId = Object.fromEntries(deck.map(card => [card.id, card]));
assert.strictEqual(manifest.length, 48);
for (const [id, file, name, points, categories] of manifest) {
    const card = byId[id];
    assert(card, `Missing ${id}`);
    assert.strictEqual(path.basename(card.hawaiiAsset), file, `${id} uses the wrong Hawaii artwork`);
    assert.strictEqual(card.hawaiiName, name, `${file} has the wrong display name`);
    assert.strictEqual(card.hawaiiPrintedPoints, points, `${file} has the wrong printed value`);
    assert.deepStrictEqual(card.categories, categories, `${file} has the wrong Yaku category`);
    const presentation = Rules.cardPresentation(card, 'hawaii-svg');
    assert.strictEqual(`${presentation.calendarMonth} · ${presentation.monthName} · ${presentation.name} · ${presentation.pointLabel}`, `${Rules.CALENDAR_MONTHS[card.month - 1]} · ${card.hawaiiMonthName} · ${name} · ${points}`, `${file} detail text is wrong`);
}

console.log('Hanafuda Hawaii deck: all 48 filenames, artwork identities, printed values, and Yaku categories passed.');
