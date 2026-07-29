const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let clock = 1000;
const activity = [];
const source = fs.readFileSync(path.join(__dirname, '..', 'bot.js'), 'utf8');
const sandbox = {
    window: {},
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Utils: { timestamp: () => clock },
    Engine: {
        state: { players: [], thinkingBots: [], typingBots: [] },
        setBotActivity: (id, type, active) => activity.push({ id, type, active })
    },
    App: {}
};
vm.runInNewContext(source, sandbox);

const Bot = sandbox.window.Bot;
const BotConfig = sandbox.window.BotConfig;
assert(BotConfig.humanSlapHeadStartMs >= 1700, 'Humans need reaction and card-finding time before bots can slap');
assert(source.includes('readyAt: now + BotConfig.humanSlapHeadStartMs'), 'Every bot slap schedule must include the human head start');
const noob = { id: 'noob', botDifficulty: 1 };
const baba = { id: 'baba', botDifficulty: 6 };

for (const [difficulty, profile] of Object.entries(BotConfig.profiles)) {
    assert(profile.readingWpm >= 180, `Profile ${difficulty} needs a realistic reading speed`);
    assert(profile.hesitation > 0 && profile.hesitation < 0.5, `Profile ${difficulty} needs bounded hesitation`);
    assert(profile.rhythmVariance > 0, `Profile ${difficulty} needs cadence variance`);
}

Bot.humanState = {};
const noobSamples = [];
const babaSamples = [];
for (let i = 0; i < 80; i++) {
    clock += 3000;
    noobSamples.push(Bot.getDecisionDelay(noob, i % 4 === 0 ? 'magic' : 'turn'));
    babaSamples.push(Bot.getDecisionDelay(baba, i % 4 === 0 ? 'magic' : 'turn'));
}
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
assert(new Set(noobSamples).size > 50, 'Noob cadence is too repetitive');
assert(new Set(babaSamples).size > 50, 'Baba cadence is too repetitive');
assert(average(noobSamples) > average(babaSamples), 'Baba should generally think faster than a noob');
assert(noobSamples.every(delay => delay >= 850 && delay <= 9000), 'Decision delay escaped its safe bounds');
assert.strictEqual(Bot.humanState.noob.decisions, 80, 'Decision history should be stateful');

const shortPlan = Bot.getTypingPlan(baba, 'gg', true);
const longPlan = Bot.getTypingPlan(baba, 'That was a complicated move and I need to explain why the entire table should be worried now.', true);
assert(shortPlan.thoughtMs >= 700, 'Direct replies need a visible reading/composition pause');
assert(longPlan.typingMs > shortPlan.typingMs, 'Long messages should take longer to type');
assert.strictEqual(longPlan.totalMs, longPlan.thoughtMs + longPlan.typingMs);

Bot.activitySources = {};
Bot.setActivity('baba', 'thinking', 'decision', true);
Bot.setActivity('baba', 'thinking', 'chat', true);
Bot.setActivity('baba', 'thinking', 'decision', false);
assert.strictEqual(activity.at(-1).active, true, 'One activity source must not cancel another');
Bot.setActivity('baba', 'thinking', 'chat', false);
assert.strictEqual(activity.at(-1).active, false, 'Activity should clear after every source finishes');

Bot.decisionSchedules = {};
Bot.humanState = {};
clock = 5000;
assert.strictEqual(Bot.waitForDecision(baba, 'turn-1', 'turn', clock), false);
const scheduledReadyAt = Bot.decisionSchedules.baba.readyAt;
assert.strictEqual(Bot.waitForDecision(baba, 'turn-1', 'turn', scheduledReadyAt - 1), false);
assert.strictEqual(Bot.waitForDecision(baba, 'turn-1', 'turn', scheduledReadyAt), true);
assert.strictEqual(Bot.decisionSchedules.baba, undefined, 'Completed schedules must be discarded');

console.log(`Human bot timing: ${noobSamples.length + babaSamples.length} decisions plus typing/activity checks passed.`);
