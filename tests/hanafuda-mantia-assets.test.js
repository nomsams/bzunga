const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Rules = require('../hanafuda/rules.js');

const assetDir = path.join(__dirname, '..', 'assets', 'hanafuda-mantia');
const files = fs.readdirSync(assetDir).filter(file => file.endsWith('.png')).sort();
assert.strictEqual(files.length, 48, 'The optional Mantia deck must contain exactly 48 PNG faces');
assert.deepStrictEqual(files, [...Rules.MANTIA_ASSETS].sort(), 'Downloaded filenames and the card-ID mapping must stay in sync');

for (const file of files) {
    const png = fs.readFileSync(path.join(assetDir, file));
    assert(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${file} must remain a PNG`);
    assert.deepStrictEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1250, 2049], `${file} must retain the source deck dimensions`);
}

const deck = Rules.createDeck(() => 0.75);
for (const card of deck) {
    assert(files.includes(path.basename(card.mantiaAsset)), `${card.id} must map to an existing Mantia face`);
}

const attribution = fs.readFileSync(path.join(assetDir, 'ATTRIBUTION.md'), 'utf8');
assert(attribution.includes('Louie Mantia') && attribution.includes('CC BY-SA 4.0') && attribution.includes('game-prototypes/hanafuda'));

console.log('Hanafuda Mantia deck: 48 original PNG filenames, card-ID mapping, dimensions, and attribution passed.');
