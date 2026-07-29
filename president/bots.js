(function (root, factory) {
    const rules = root.PresidentRules || (typeof require === 'function' ? require('./rules.js') : null);
    const api = factory(rules);
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.PresidentBotBrain = api.PresidentBotBrain;
    root.PresidentBotController = api.PresidentBotController;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules) {
    'use strict';

    if (!Rules) throw new Error('PresidentRules must be loaded before President bots.');

    const PROFILES = {
        1: { name: 'Casual', thinkMin: 900, thinkMax: 2200, passChance: 0.13, chatChance: 0.12 },
        2: { name: 'Clever', thinkMin: 1200, thinkMax: 3000, passChance: 0.08, chatChance: 0.16 },
        3: { name: 'Hard', thinkMin: 1600, thinkMax: 3800, passChance: 0.04, chatChance: 0.19 },
        4: { name: 'Expert', thinkMin: 2100, thinkMax: 5100, passChance: 0.02, chatChance: 0.24 },
        5: { name: 'Baba Gupta', thinkMin: 2600, thinkMax: 6200, passChance: 0.01, chatChance: 0.34 }
    };

    const PHRASES = {
        intro: [
            'New cabinet, same inevitable scandals.',
            'I brought policy, patience, and four deeply suspicious cards.',
            'Welcome to the peaceful transfer of absolutely no power.',
            'Let us determine who gets the big chair and who carries it.',
            'The campaign is over. The card counting begins.',
            'I promise a clean game and several dirty combinations.',
            'Democracy ends where my sorted hand begins.',
            'Everybody looks presidential until the passes start.'
        ],
        play: [
            '{count} of them. I call that a coalition.',
            'Please direct all complaints to the pile.',
            'That was not aggression. It was legislative efficiency.',
            'A modest proposal with excellent table support.',
            'The pile requested leadership. I answered.',
            'Higher rank, larger group, fewer excuses.',
            'This administration believes in decisive cardboard.',
            'I have submitted my motion to the table.'
        ],
        bigPlay: [
            'A whole voting bloc just landed.',
            'Count them carefully. Denial will not lower the number.',
            'That is not a combo; that is a parliamentary majority.',
            'The table has been nationalized.',
            'I brought enough copies for the entire committee.',
            'Quantity has a quality all its own.'
        ],
        pass: [
            'I abstain, dramatically.',
            'Strategic retreat. Please misinterpret it.',
            'I pass. The opposition may embarrass itself now.',
            'No vote from me on this pile.',
            'I could play. I simply prefer watching this collapse.',
            'My cards have invoked executive privilege.',
            'I am temporarily unavailable for accountability.'
        ],
        ace: [
            'Ace on the table. Meeting adjourned.',
            'The pile has been dissolved by executive order.',
            'Fresh pile. Same dangerous leadership.',
            'That Ace just cleared the entire agenda.',
            'Motion carried. Evidence destroyed.',
            'An Ace: because subtlety was taking too long.'
        ],
        lowHand: [
            'One of you is running out of cards and I dislike the polling.',
            'The endgame has entered the room without knocking.',
            'Someone is nearly free. That sounds preventable.',
            'The card counts are becoming politically sensitive.',
            'I can hear the finish line filing paperwork.'
        ],
        victory: [
            'Address me correctly: President.',
            'The people have spoken, mainly through my excellent hand management.',
            'I accept this presidency with humility and absolutely no humility.',
            'The chair fits. The result was never in doubt.',
            'My first act as President is to remember all of this.',
            'Power transferred peacefully into my hands.'
        ],
        defeat: [
            'This result is under formal review by nobody.',
            'I demand a recount of the cards I personally played.',
            'Temporary demotion. Permanent grudge.',
            'The administration has fallen. The commentary continues.',
            'I have learned nothing and will return stronger.',
            'History will misremember this in my favor.'
        ],
        chat: [
            'I heard you, {target}. The cards remain unconvinced.',
            'Strong message. Weak legislative support.',
            'Your statement has been entered into the record and mocked.',
            'That is an opinion with no cards behind it.',
            'Keep typing. It reduces the time available for thinking.',
            'I respect the confidence, if not the evidence.',
            'The table acknowledges your complaint and moves on.'
        ]
    };

    const BABA_PHRASES = {
        intro: [
            'I am Baba Gupta. I have already formed a government inside your probability distribution.',
            'The title is President. The method is Gupta.',
            'I do not chase power. Power checks my seating assignment.',
            'Your hands are private. Your card counts are public. That is enough.',
            'I require no secret cards—only your visible panic.'
        ],
        play: [
            'I spent a low-cost coalition and preserved the cabinet.',
            'The rank rose exactly as the public information predicted.',
            'This play has three purposes. You will notice the third too late.',
            'I am not reading your hand. I am reading your shortage of options.',
            'Card economy, tempo, control. Gupta policy.'
        ],
        bigPlay: [
            'A supermajority. Debate is now decorative.',
            'Six cards can still represent one rank. Please update your constitution.',
            'The coalition expanded. Your survival did not.',
            'That is what disciplined wild-card deployment looks like.'
        ],
        pass: [
            'A pass is only weakness when performed without a future.',
            'I decline this pile and purchase the next one cheaply.',
            'You see surrender. I see retained control.',
            'Tempo donated. Power conserved.'
        ],
        ace: [
            'Ace. The old pile has been removed from history.',
            'Executive dissolution, Gupta edition.',
            'Your sequence ended at the exact point I budgeted for it.',
            'Fresh pile. My initiative.'
        ],
        lowHand: [
            'The smallest hand is now the central national-security concern.',
            'Someone approaches zero. I have adjusted the blockade.',
            'Your card count is shrinking faster than your options.',
            'Endgame protocol active. Sentiment disabled.'
        ],
        victory: [
            'President Gupta. The title has caught up with the reality.',
            'Result: optimal. Opposition: sorted.',
            'I inherited no throne. I calculated one.',
            'The transfer of power was mathematically compulsory.'
        ],
        defeat: [
            'An outlier occurred. I will not grant it a personality.',
            'You won a sample. I remain the model.',
            'The chair is temporarily leased. Read the small print.',
            'Interesting. I have added your anomaly to the next-round forecast.'
        ],
        chat: [
            '{target}, confidence is not a substitute for hand structure.',
            'I processed your message. Its strategic value rounded to zero.',
            'The chat is public. Your fear was already observable.',
            'Continue speaking. Every character reveals your tempo.',
            'You are negotiating with the pile. The pile has retained me.'
        ]
    };

    const interpolate = (line, context = {}) => line.replace(/\{(\w+)\}/g, (match, key) => {
        const value = context[key];
        return value === undefined || value === null ? match : String(value);
    });

    class PresidentBotBrain {
        static getPublicContext(bot, state) {
            const players = state.players.map(player => ({
                id: player.id,
                name: player.name,
                handCount: player.hand.length,
                passed: Boolean(player.passed),
                finished: state.finishOrder.includes(player.id)
            }));
            const publicRankCounts = {};
            for (const play of state.history || []) {
                for (const card of play.cards || []) {
                    publicRankCounts[card.rank] = (publicRankCounts[card.rank] || 0) + 1;
                }
            }
            return {
                players,
                publicRankCounts,
                trick: state.trick,
                finishOrder: [...state.finishOrder],
                roundNumber: state.roundNumber
            };
        }

        static chooseExchangeCards(bot, count) {
            const hand = Rules.sortHand(bot.hand);
            const protectedTwos = hand.filter(card => card.rank === '2');
            const protectedAces = hand.filter(card => card.rank === 'A');
            const ordinary = hand.filter(card => card.rank !== '2' && card.rank !== 'A');
            const ordered = [...ordinary, ...protectedAces, ...protectedTwos];
            return ordered.slice(0, count).map(card => card.id);
        }

        static chooseAction(bot, state, random = Math.random) {
            const legalPlays = Rules.getLegalPlays(bot.hand, state.trick);
            if (legalPlays.length === 0) return { type: 'PASS' };
            const difficulty = Math.max(1, Math.min(5, Number(bot.botDifficulty) || 1));
            const profile = PROFILES[difficulty];
            const context = PresidentBotBrain.getPublicContext(bot, state);
            const trickOpen = Boolean(state.trick?.rank);

            if (difficulty === 1) {
                if (trickOpen && random() < profile.passChance) return { type: 'PASS' };
                const candidate = legalPlays[Math.floor(random() * legalPlays.length)];
                return { type: 'PLAY_CARDS', cardIds: candidate.cards.map(card => card.id), candidate };
            }

            const otherCounts = context.players
                .filter(player => player.id !== bot.id && !player.finished)
                .map(player => player.handCount);
            const lowestOpponentCount = otherCounts.length ? Math.min(...otherCounts) : 99;
            const nextPlayer = PresidentBotBrain.getNextPublicPlayer(bot.id, context.players);
            const threat = Math.min(lowestOpponentCount, nextPlayer?.handCount ?? 99);

            const scored = legalPlays.map(candidate => ({
                candidate,
                score: PresidentBotBrain.scoreCandidate(candidate, bot, state, context, difficulty, threat)
            })).sort((left, right) => left.score - right.score);

            const best = scored[0];
            const expensiveWildPlay = best.candidate.combo.wildCount > 0 && bot.hand.length > 5;
            const highControlPlay = best.candidate.combo.rankPower >= Rules.RANK_POWER.K && bot.hand.length > 7;
            const mayPass = trickOpen && threat > 2 && (
                (difficulty === 2 && (expensiveWildPlay || highControlPlay) && random() < 0.42)
                || (difficulty >= 3 && expensiveWildPlay && random() < 0.28)
            );
            if (mayPass || (trickOpen && random() < profile.passChance)) return { type: 'PASS' };

            return {
                type: 'PLAY_CARDS',
                cardIds: best.candidate.cards.map(card => card.id),
                candidate: best.candidate
            };
        }

        static scoreCandidate(candidate, bot, state, context, difficulty, threat) {
            const combo = candidate.combo;
            const trickOpen = Boolean(state.trick?.rank);
            const remaining = bot.hand.length - candidate.cards.length;
            if (remaining === 0) return -100000;

            let score = combo.rankPower * 5;
            score += combo.wildCount * (difficulty >= 4 ? 48 : 34);
            score += Math.max(0, combo.count - (state.trick.count || 1)) * (trickOpen ? 2 : -8);

            if (!trickOpen) {
                score -= combo.count * (difficulty >= 3 ? 12 : 7);
                const sameRankRemaining = bot.hand.filter(card => card.rank === combo.rank).length - combo.naturalCount;
                score += sameRankRemaining * 4;
            }

            if (remaining <= 4) {
                score -= candidate.cards.length * 18;
                if (combo.clearsTrick) score -= 25;
            }
            if (threat <= 2) {
                score -= combo.rankPower * 3;
                score -= combo.count * 7;
                if (combo.clearsTrick) score -= 40;
            }

            if (difficulty >= 4) {
                const publiclyPlayed = context.publicRankCounts[combo.rank] || 0;
                const ownUnplayed = bot.hand.filter(card => card.rank === combo.rank).length;
                const unseenCopies = Math.max(0, 4 - publiclyPlayed - ownUnplayed);
                score += unseenCopies * 2.5;
                if (remaining === 1 && bot.hand.find(card => !candidate.cards.includes(card))?.rank === '2') score += 500;
            }

            if (difficulty === 5) {
                const controlCardsLeft = bot.hand.filter(card =>
                    !candidate.cards.includes(card) && (card.rank === 'A' || card.rank === '2')
                ).length;
                score -= controlCardsLeft * 3;
                if (combo.wildCount && combo.rankPower < Rules.RANK_POWER.J) score += 20;
                if (combo.rankPower === Rules.RANK_POWER.A && threat > 3 && remaining > 6) score += 18;
                if (combo.count >= 3) score -= 8;
            }
            return score;
        }

        static getNextPublicPlayer(botId, players) {
            const index = players.findIndex(player => player.id === botId);
            if (index < 0) return null;
            for (let offset = 1; offset <= players.length; offset++) {
                const player = players[(index + offset) % players.length];
                if (!player.finished && !player.passed) return player;
            }
            return null;
        }
    }

    class PresidentBotController {
        constructor(engine, options = {}) {
            this.engine = engine;
            this.random = options.random || Math.random;
            this.interval = null;
            this.schedules = new Map();
            this.pendingChats = new Map();
            this.recentLines = new Map();
            this.globalRecent = [];
            this.lastThreatNonce = null;
        }

        start() {
            if (this.interval) return;
            this.interval = setInterval(() => this.tick(), 260);
        }

        stop() {
            if (this.interval) clearInterval(this.interval);
            this.interval = null;
            for (const timer of this.pendingChats.values()) {
                clearTimeout(timer.startTimer);
                clearTimeout(timer.sendTimer);
            }
            this.pendingChats.clear();
            for (const player of this.engine.state.players.filter(item => item.isBot)) {
                this.engine.setBotActivity(player.id, 'thinking', false);
                this.engine.setBotActivity(player.id, 'typing', false);
            }
        }

        tick() {
            const state = this.engine.state;
            if (state.phase === 'exchange') {
                const task = state.exchange?.tasks.find(item => item.id === state.exchange.activeTaskId);
                const giver = task ? this.engine.getPlayer(task.giverId) : null;
                if (task && giver?.isBot) {
                    this.scheduleDecision(giver, `exchange:${task.id}`, 'exchange', () => {
                        const ids = PresidentBotBrain.chooseExchangeCards(giver, task.count);
                        this.engine.submitExchange(giver.id, ids);
                    });
                }
                return;
            }
            if (state.phase !== 'play') return;
            const bot = this.engine.activePlayer();
            if (!bot?.isBot) return;
            const actionKey = `turn:${state.roundNumber}:${state.trick.id}:${bot.id}:${bot.hand.length}:${state.lastAction?.nonce || 'start'}`;
            this.scheduleDecision(bot, actionKey, 'play', () => {
                const action = PresidentBotBrain.chooseAction(bot, this.engine.state, this.random);
                this.engine.processAction(action, bot.id);
            });
        }

        scheduleDecision(bot, key, kind, callback) {
            const existing = this.schedules.get(bot.id);
            if (!existing || existing.key !== key) {
                if (existing) this.engine.setBotActivity(bot.id, 'thinking', false);
                const profile = PROFILES[bot.botDifficulty] || PROFILES[1];
                const complexity = kind === 'exchange' ? 0.75 : this.getTurnComplexity(bot);
                const delay = (profile.thinkMin + this.random() * (profile.thinkMax - profile.thinkMin)) * complexity;
                this.schedules.set(bot.id, { key, readyAt: Date.now() + delay, callback });
                this.engine.setBotActivity(bot.id, 'thinking', true);
                return;
            }
            if (Date.now() < existing.readyAt) return;
            this.schedules.delete(bot.id);
            this.engine.setBotActivity(bot.id, 'thinking', false);
            existing.callback();
        }

        getTurnComplexity(bot) {
            const legalCount = Rules.getLegalPlays(bot.hand, this.engine.state.trick).length;
            if (legalCount === 0) return 0.65;
            if (bot.hand.length <= 4) return 1.2;
            return 0.9 + Math.min(0.4, legalCount / 70);
        }

        handleEvent(event, state) {
            if (!event) return;
            if (event.type === 'round_started') {
                const speaker = state.players.find(player => player.isBot && player.botDifficulty === 5)
                    || state.players.find(player => player.isBot && player.botDifficulty >= 4)
                    || state.players.find(player => player.isBot);
                if (speaker) this.queueChat(speaker, 'intro', {}, true);
                return;
            }
            if (event.type === 'chat' && !event.isBot) {
                this.listenToChat(event);
                return;
            }
            if (event.type === 'play') {
                const actor = this.engine.getPlayer(event.playerId);
                if (actor?.isBot) {
                    const category = event.combo?.clearsTrick
                        ? 'ace'
                        : event.combo?.count >= 3
                        ? 'bigPlay'
                        : 'play';
                    this.queueChat(actor, category, { count: event.combo?.count, rank: event.combo?.rank });
                }
                const remainingCounts = state.players
                    .filter(player => !state.finishOrder.includes(player.id))
                    .map(player => player.hand.length);
                if (remainingCounts.length && Math.min(...remainingCounts) <= 2 && this.lastThreatNonce !== state.lastAction?.nonce) {
                    this.lastThreatNonce = state.lastAction?.nonce;
                    const commentator = state.players.find(player => player.isBot && player.botDifficulty === 5)
                        || state.players.find(player => player.isBot && player.botDifficulty >= 3);
                    if (commentator && commentator.id !== actor?.id) this.queueChat(commentator, 'lowHand');
                }
                if (event.gameOver) this.handleGameOver();
                return;
            }
            if (event.type === 'pass') {
                const actor = this.engine.getPlayer(event.playerId);
                if (actor?.isBot) this.queueChat(actor, 'pass');
            }
        }

        handleGameOver() {
            const state = this.engine.state;
            const president = this.engine.getPlayer(state.result?.presidentId);
            const bot = president?.isBot
                ? president
                : state.players.find(player => player.isBot && player.botDifficulty === 5)
                || state.players.find(player => player.isBot);
            if (bot) this.queueChat(bot, bot.id === president?.id ? 'victory' : 'defeat', {}, true);
        }

        listenToChat(event) {
            const bots = this.engine.state.players.filter(player => player.isBot);
            if (!bots.length) return;
            const lowerMessage = event.message.toLowerCase();
            const mentioned = bots.find(bot => lowerMessage.includes(bot.name.toLowerCase().split(' ')[0]));
            const responder = mentioned
                || bots.find(bot => bot.botDifficulty === 5)
                || bots.find(bot => bot.botDifficulty >= 4)
                || bots[Math.floor(this.random() * bots.length)];
            const chance = mentioned ? 1 : (PROFILES[responder.botDifficulty]?.chatChance || 0.12);
            if (this.random() <= chance) this.queueChat(responder, 'chat', { target: event.name }, Boolean(mentioned));
        }

        queueChat(bot, category, context = {}, force = false) {
            if (!bot?.isBot || this.pendingChats.has(bot.id)) return;
            const profile = PROFILES[bot.botDifficulty] || PROFILES[1];
            if (!force && this.random() > profile.chatChance) return;
            const collection = bot.botDifficulty === 5 ? BABA_PHRASES : PHRASES;
            const choices = collection[category] || PHRASES[category] || PHRASES.play;
            const line = interpolate(this.pickFreshLine(bot.id, choices), context);
            const startupDelay = 450 + this.random() * 900;
            const typingDuration = Math.min(7200, Math.max(900, 420 + (line.length / (3.7 + this.random() * 1.3)) * 1000));
            const timers = {};
            timers.startTimer = setTimeout(() => {
                this.engine.setBotActivity(bot.id, 'typing', true);
                timers.sendTimer = setTimeout(() => {
                    this.engine.setBotActivity(bot.id, 'typing', false);
                    this.pendingChats.delete(bot.id);
                    this.engine.addBotChat(bot.id, line);
                }, typingDuration);
            }, startupDelay);
            this.pendingChats.set(bot.id, timers);
        }

        pickFreshLine(botId, choices) {
            const recent = this.recentLines.get(botId) || [];
            let available = choices.filter(line => !recent.includes(line) && !this.globalRecent.slice(-10).includes(line));
            if (!available.length) available = choices.filter(line => line !== recent[recent.length - 1]);
            if (!available.length) available = choices;
            const line = available[Math.floor(this.random() * available.length)];
            recent.push(line);
            if (recent.length > 8) recent.shift();
            this.recentLines.set(botId, recent);
            this.globalRecent.push(line);
            if (this.globalRecent.length > 24) this.globalRecent.shift();
            return line;
        }
    }

    return {
        PROFILES,
        PHRASES,
        BABA_PHRASES,
        PresidentBotBrain,
        PresidentBotController
    };
});
