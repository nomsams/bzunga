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

console.log('Hanafuda Hawaii deck: 48 SVG faces, embedded artwork, dimensions, and card-ID mapping passed.');
