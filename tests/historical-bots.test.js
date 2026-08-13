const assert = require('assert');
const fs = require('fs');
const path = require('path');
const HistoricalBots = require('../historical-bots.js');

const root = path.join(__dirname, '..');
const expected = [
    ['beorge-gush', 'Beorge Gush', 'George W. Bush', 2],
    ['guammar-maddafi', 'Guammar Maddafi', 'Muammar Gaddafi', 3],
    ['zao-medong', 'Zao Medong', 'Mao Zedong', 4],
    ['joris-bohnson', 'Joris Bohnson', 'Boris Johnson', 2],
    ['yoris-beltsin', 'Yoris Beltsin', 'Boris Yeltsin', 3],
    ['rheodore-toosevelt', 'Rheodore Toosevelt', 'Theodore Roosevelt', 4]
];

assert.strictEqual(HistoricalBots.list().length, expected.length, 'All six requested historical personas must exist');
for (const [id, displayName, realName, difficulty] of expected) {
    const persona = HistoricalBots.getPersona(id);
    assert(persona, `Missing persona ${id}`);
    assert.strictEqual(persona.displayName, displayName, `${id} must use the requested swapped-initial spelling`);
    assert.strictEqual(persona.realName, realName, `${id} must record the correctly spelled historical name`);
    assert.strictEqual(persona.difficulty, difficulty, `${id} must have a stable strategy level`);
    assert(persona.quotations.length >= 20, `${displayName} needs an exceptionally deep quotation rotation`);
    assert.strictEqual(new Set(persona.quotations.map(item => item.text)).size, persona.quotations.length, `${displayName} has duplicate quotations`);
    for (const item of persona.quotations) {
        assert(item.text.length <= 68, `${displayName} quotation is too long for mobile chat: ${item.text}`);
        assert(item.context.length >= 8, `${displayName} quotation needs historical context`);
        assert(/^https:\/\//.test(item.source), `${displayName} quotation needs an HTTPS source`);
        assert(!/\b(fuck|shit|bitch|bastard|asshole|wanker|prick|dickhead)\b/i.test(item.text), `${displayName} must not be given unsourced profanity`);
    }

    const parsed = HistoricalBots.parseSelection(`historical:${id}`);
    assert.strictEqual(parsed.personaId, id);
    assert.strictEqual(parsed.difficulty, difficulty);
    assert(HistoricalBots.linesFor(id, 'chat').length >= 5, `${displayName} must answer general chat without generic fallback lines`);
}

assert.strictEqual(HistoricalBots.parseSelection('4').difficulty, 4);
assert.strictEqual(HistoricalBots.parseSelection('not-a-bot', 2).difficulty, 2);
assert.deepStrictEqual(HistoricalBots.linesFor('unknown', 'chat'), []);

for (const page of ['index.html', 'president/index.html', 'durak/index.html']) {
    const source = fs.readFileSync(path.join(root, page), 'utf8');
    assert(source.includes('historical-bots.js'), `${page} must load the shared historical registry`);
    for (const [id, displayName] of expected) {
        assert(source.includes(`value="historical:${id}"`), `${page} must offer ${displayName} in its lobby`);
        assert(source.includes(displayName), `${page} must display ${displayName} with correct spelling`);
    }
}

const offline = fs.readFileSync(path.join(root, 'offline.js'), 'utf8');
assert(offline.includes("'./historical-bots.js'"), 'Historical personas must be available to offline bot games');

for (const file of ['bot.js', 'president/bots.js', 'durak/bots.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert(source.includes('HistoricalBots'), `${file} must route persona dialogue through the historical registry`);
    assert(source.includes('linesFor'), `${file} must select contextual historical lines`);
}

for (const file of ['index.html', 'president/app.js', 'durak/app.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert(source.includes('historicalPersona'), `${file} must persist the selected historical persona`);
    assert(source.includes('There is only one'), `${file} must prevent duplicate historical personas`);
}

for (const file of ['president/engine.js', 'durak/engine.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert(source.includes('historicalPersona'), `${file} must carry persona identity through game state`);
}

console.log('Historical bots: names, sources, clean quotations, selection, persistence, and all-game dialogue routing passed.');
