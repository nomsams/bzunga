const assert = require('assert');
const Rules = require('../hanafuda/rules.js');

const deck = Rules.createDeck(() => 0.42);
assert.strictEqual(deck.length, 48, 'Koi-Koi needs the complete 48-card deck');
for (let month = 1; month <= 12; month++) assert.strictEqual(deck.filter(card => card.month === month).length, 4);
assert.strictEqual(new Set(deck.map(card => card.asset)).size, 48, 'Every flower card needs distinct artwork');
assert.strictEqual(new Set(deck.map(card => card.mantiaAsset)).size, 48, 'Every flower card needs a distinct optional Mantia PNG');
assert(deck.every(card => card.mantiaAsset.endsWith('.png')), 'The optional Mantia deck must retain its PNG format');
assert.strictEqual(new Set(deck.map(card => card.hawaiiAsset)).size, 48, 'Every flower card needs a distinct Hawaii SVG');
assert(deck.every(card => card.hawaiiAsset.endsWith('.svg')), 'The Hawaii deck must retain its SVG format');
assert(deck.every(card => card.japaneseName && card.japaneseMonth && card.japaneseType), 'Every reference card needs English and Japanese metadata');
assert.strictEqual(Rules.YAKU_GUIDE.length, 15, 'The guide should cover scoring, optional, system, and reference combinations');
const guideById = Object.fromEntries(Rules.YAKU_GUIDE.map(item => [item.id, item]));
assert(guideById.goko.points.startsWith('10') && guideById.shiko.points.startsWith('8') && guideById.ameshiko.points.startsWith('7'), 'Reference scores must match this engine rather than a different regional table');
assert(guideById['tsuki-fuda'].variant && guideById['tsuki-fuda'].points.includes('not active'), 'Monthly Cards must be clearly marked as a non-scoring reference variant');

const sake = deck.find(card => card.id === Rules.SPECIAL.sake);
assert(sake.categories.includes('Animal') && sake.categories.includes('Chaff'), 'Sake Cup must count in both categories');
assert(sake.japaneseType.includes('種札') && sake.japaneseType.includes('カス札'), 'The bilingual detail must show both Sake Cup types');

const byId = Object.fromEntries(deck.map(card => [card.id, card]));
let captured = [Rules.SPECIAL.crane, Rules.SPECIAL.curtain, Rules.SPECIAL.moon, Rules.SPECIAL.phoenix].map(id => byId[id]);
let yaku = Rules.evaluateYaku(captured);
assert(yaku.yaku.some(item => item.id === 'shiko' && item.points === 8));
captured.push(byId[Rules.SPECIAL.rain]);
yaku = Rules.evaluateYaku(captured);
assert(yaku.yaku.some(item => item.id === 'goko' && item.points === 10));

const sakeAndChaff = [sake, ...deck.filter(card => card.id !== sake.id && card.categories.includes('Chaff')).slice(0, 9)];
assert(Rules.evaluateYaku(sakeAndChaff).yaku.some(item => item.id === 'kasu'), 'Sake + 9 ordinary Chaff is Kasu');
const sakeAndAnimals = [sake, ...deck.filter(card => card.id !== sake.id && card.categories.includes('Animal')).slice(0, 4)];
assert(Rules.evaluateYaku(sakeAndAnimals).yaku.some(item => item.id === 'tane'), 'Sake + 4 ordinary Animals is Tane');

assert.deepStrictEqual(Rules.scoreWin(10, true), { base: 10, sevenPlusMultiplier: 2, koiKoiPenaltyMultiplier: 2, total: 40 });
assert.strictEqual(Rules.evaluateYaku([byId[Rules.SPECIAL.moon], sake]).points, 0, 'Viewing Yaku is off by default');
assert.strictEqual(Rules.evaluateYaku([byId[Rules.SPECIAL.moon], sake], { viewingYaku: true }).points, 5);
assert.strictEqual(Rules.evaluateYaku([byId[Rules.SPECIAL.moon], sake, byId[Rules.SPECIAL.lightning]], { viewingYaku: true, bustedViewing: true }).points, 0);

const field = deck.filter(card => card.month === 1).slice(0, 2);
const matching = deck.find(card => card.month === 1 && !field.includes(card));
assert.strictEqual(Rules.resolveCapture(field, matching).needsChoice, true);
const chosen = Rules.resolveCapture(field, matching, field[1].id);
assert.strictEqual(chosen.captured.length, 2);
assert.strictEqual(chosen.field.length, 1);
const triple = deck.filter(card => card.month === 2).slice(0, 3);
assert.strictEqual(Rules.resolveCapture(triple, deck.find(card => card.month === 2 && !triple.includes(card))).captured.length, 4);

console.log('Hanafuda rules: deck, art, Sake Cup, Yaku, multipliers, Viewing toggles, and capture edges passed.');
