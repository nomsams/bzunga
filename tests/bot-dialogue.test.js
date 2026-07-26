const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'bot.js'), 'utf8');
const sandbox = {
    window: {},
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
};
vm.runInNewContext(source, sandbox);

const Bot = sandbox.window.Bot;
const BotConfig = sandbox.window.BotConfig;
const personaTypes = [...new Set(Object.values(BotConfig.profiles).map(profile => profile.type))];

assert.strictEqual(personaTypes.length, 6, 'Expected six distinct bot personalities');

let totalDialogueLines = 0;
const countAndCheckPool = (pool, label, minimum) => {
    assert(Array.isArray(pool), `${label} must be an array`);
    assert(pool.length >= minimum, `${label} needs at least ${minimum} lines`);
    assert.strictEqual(new Set(pool).size, pool.length, `${label} contains duplicate lines`);
    totalDialogueLines += pool.length;
};

for (const persona of personaTypes) {
    const eventBank = BotConfig.chatBank[persona];
    const directBank = BotConfig.directReplies[persona];

    assert(eventBank, `Missing event dialogue for ${persona}`);
    assert(directBank, `Missing direct replies for ${persona}`);
    countAndCheckPool(eventBank.banter, `${persona}.banter`, 10);
    countAndCheckPool(BotConfig.generalReplies[persona], `${persona}.generalReplies`, 12);
    countAndCheckPool(directBank.greeting, `${persona}.greeting`, 4);
    countAndCheckPool(directBank.insult, `${persona}.insult`, 5);
    countAndCheckPool(directBank.laugh, `${persona}.laugh`, 4);
    countAndCheckPool(directBank.fallback, `${persona}.fallback`, 4);

    for (const intent of ['thanks', 'smalltalk', 'pause']) {
        countAndCheckPool(directBank[intent], `${persona}.${intent}`, 3);
    }

    for (const [category, pool] of Object.entries(eventBank)) {
        if (category !== 'banter') countAndCheckPool(pool, `${persona}.event.${category}`, 1);
    }
    for (const [intent, pool] of Object.entries(directBank)) {
        if (!['greeting', 'insult', 'laugh', 'fallback', 'thanks', 'smalltalk', 'pause'].includes(intent)) {
            countAndCheckPool(pool, `${persona}.direct.${intent}`, 1);
        }
    }
}

for (const [index, pattern] of BotConfig.elizaPatterns.entries()) {
    countAndCheckPool(pattern.replies, `elizaPatterns[${index}]`, 1);
}

assert(totalDialogueLines >= 500, `Expected at least 500 dialogue lines, found ${totalDialogueLines}`);

Bot.usedLines = {};
Bot.recentLines = {};
Bot.globalRecentLines = [];
const rotationPool = ['alpha', 'bravo', 'charlie', 'delta'];
const firstCycle = rotationPool.map(() => Bot.getUniqueResponse('rotation-bot', 'test', rotationPool));
assert.strictEqual(new Set(firstCycle).size, rotationPool.length, 'A pool repeated before every line was used');

let previous = firstCycle[firstCycle.length - 1];
for (let i = 0; i < 50; i++) {
    const next = Bot.getUniqueResponse('rotation-bot', 'test', rotationPool);
    assert.notStrictEqual(next, previous, 'A line repeated immediately across a shuffle boundary');
    previous = next;
}

const intentCases = new Map([
    ['thanks mate', 'thanks'],
    ['how are you today', 'smalltalk'],
    ['hold on one sec', 'pause'],
    ['you absolute clown', 'insult'],
    ['that was hilarious', 'laugh'],
    ['you saw my card', 'accusation']
]);
for (const [message, expectedIntent] of intentCases) {
    assert.strictEqual(Bot.inferChatIntent(message.toUpperCase()), expectedIntent);
}

console.log(`Bot dialogue: ${totalDialogueLines} lines validated with anti-repeat rotation.`);
