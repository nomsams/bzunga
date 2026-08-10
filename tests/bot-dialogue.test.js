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
    clearInterval,
    Engine: {
        state: { gameMode: 'classic' },
        botMemory: {},
        getCardById: () => null
    }
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
    countAndCheckPool(eventBank.banter, `${persona}.banter`, 35);
    countAndCheckPool(BotConfig.generalReplies[persona], `${persona}.generalReplies`, 12);
    countAndCheckPool(directBank.greeting, `${persona}.greeting`, 4);
    countAndCheckPool(directBank.insult, `${persona}.insult`, 5);
    countAndCheckPool(directBank.laugh, `${persona}.laugh`, 4);
    countAndCheckPool(directBank.fallback, `${persona}.fallback`, 4);
    assert(eventBank.banter.some(line => /knock knock/i.test(line)), `${persona} needs a knock-knock roast`);
    assert(eventBank.banter.some(line => /roses|violets/i.test(line)), `${persona} needs a rhyme roast`);
    assert(eventBank.banter.filter(line => /\*{2,}/.test(line)).length >= 5, `${persona} needs censored outbursts`);
    assert(directBank.insult.length >= 40, `${persona} needs a deep direct-diss rotation`);
    const roughTableTalk = [...eventBank.banter, ...BotConfig.generalReplies[persona], ...directBank.insult];
    assert(
        roughTableTalk.filter(line => /fuck|shit|ass|arse|bastard|bozo|clown|muppet|idiot|donkey|garbage|toilet|fart|dumb|stupid|bollocks|rat|goblin|villain|wet sock|trash|rubbish|disaster|criminal|bellend|wanker|dickhead|gobshite|fuckwit/i.test(line)).length >= 80,
        `${persona} needs a substantial rough table-talk rotation`
    );
    assert(
        roughTableTalk.filter(line => /dad joke|why did|what do you call|twenty-five letters|knock knock/i.test(line)).length >= 5,
        `${persona} needs a substantial joke rotation`
    );
    const fullPersonaDialogue = [
        ...BotConfig.generalReplies[persona],
        ...Object.values(eventBank).flat(),
        ...Object.values(directBank).flat()
    ];
    assert(
        fullPersonaDialogue.filter(line => /fair play|respect|well played|nice one|bloody good|that was class|earned|clean win|good game/i.test(line)).length >= 18,
        `${persona} needs occasional earned compliments among the insults`
    );
    assert(
        fullPersonaDialogue.filter(line => /\bmate\b|old friend|buy.*pint|drinks on|pub bill|friendship/i.test(line)).length >= 18,
        `${persona} needs rough old-friends table banter`
    );

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

assert(totalDialogueLines >= 4500, `Expected at least 4500 dialogue lines, found ${totalDialogueLines}`);
assert(
    Object.values(BotConfig.profiles).every(profile => profile.extroversion >= 0.8),
    'Every Bazunga bot should speak up regularly'
);
for (const persona of ['pro', 'expert', 'baba']) {
    const advancedDialogue = [
        ...BotConfig.generalReplies[persona],
        ...Object.values(BotConfig.chatBank[persona]).flat(),
        ...Object.values(BotConfig.directReplies[persona]).flat()
    ];
    assert(
        !advancedDialogue.some(line => /\b(expected value|probability|statistic\w*|confidence interval|behavioral model|decision tree|hypothesis|sample size|variance|forecast|public information|strategic relevance|optimi\w*|information cost|threat score|card economy|tempo|distribution|calculat\w*|measurable|tracking cards|spreadsheet|algorithm\w*)\b/i.test(line)),
        `${persona} should sound like a ruthless table opponent, not a lecture`
    );
}

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

const shortSamples = Array.from({ length: 80 }, () =>
    Bot.getUniqueResponse('short-bot', 'banter', BotConfig.chatBank.expert.banter)
);
assert(shortSamples.every(line => line.length <= 68), 'Bazunga table talk should favor short, punchy messages');
assert(Bot.compactResponse('This is a deliberately oversized table message that keeps wandering long after everybody stopped caring about it.').length <= 76);

const discardBot = {
    id: 'discard-expert',
    botDifficulty: 4,
    hand: [{ id: 'known-ten', ownerId: 'discard-expert', loc: 'hand' }],
    penaltyCards: []
};
sandbox.Engine.botMemory[discardBot.id] = {
    'known-ten': { id: 'known-ten', numVal: 10, time: 1 }
};
assert.strictEqual(
    Bot.shouldTakeDiscard(discardBot, { id: 'discard-five', value: '5', isRed: false }, () => 0.5),
    true,
    'An expert may take a clearly profitable discard'
);
assert.strictEqual(
    Bot.shouldTakeDiscard(discardBot, { id: 'discard-eight', value: '8', isRed: false }, () => 0),
    false,
    'Experts must ignore marginal face-up improvements'
);
assert.strictEqual(
    Bot.shouldTakeDiscard(discardBot, { id: 'discard-five', value: '5', isRed: false }, () => 0.9),
    false,
    'Even good ordinary discards must not be taken automatically every time'
);
assert.strictEqual(
    Bot.shouldTakeDiscard(discardBot, { id: 'black-king', value: 'K', isRed: false }, () => 0.9),
    true,
    'The exceptional minus-one black King should remain an obvious tactical take'
);

const intentCases = new Map([
    ['thanks mate', 'thanks'],
    ['how are you today', 'smalltalk'],
    ['hold on one sec', 'pause'],
    ['you absolute clown', 'insult'],
    ['you complete bozo', 'insult'],
    ['that move was bullshit', 'insult'],
    ['that was hilarious', 'laugh'],
    ['you saw my card', 'accusation']
]);
for (const [message, expectedIntent] of intentCases) {
    assert.strictEqual(Bot.inferChatIntent(message.toUpperCase()), expectedIntent);
}

console.log(`Bot dialogue: ${totalDialogueLines} lines validated with anti-repeat rotation.`);
