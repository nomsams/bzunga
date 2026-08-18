(function (root, factory) {
    const rules = root.HanafudaRules || (typeof require === 'function' ? require('./rules.js') : null);
    const historicalBots = root.HistoricalBots || (typeof require === 'function' ? require('../historical-bots.js') : null);
    const api = factory(rules, historicalBots);
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.HanafudaBotBrain = api.HanafudaBotBrain;
    root.HanafudaBotController = api.HanafudaBotController;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules, HistoricalBots) {
    'use strict';
    if (!Rules) throw new Error('HanafudaRules must be loaded before Hanafuda bots.');

    const PROFILES = {
        1: { name: 'Casual', thinkMin: 800, thinkMax: 1800, samples: 0, chatChance: 0.28 },
        2: { name: 'Clever', thinkMin: 1100, thinkMax: 2500, samples: 8, chatChance: 0.36 },
        3: { name: 'Hard', thinkMin: 1450, thinkMax: 3300, samples: 20, chatChance: 0.46 },
        4: { name: 'Expert', thinkMin: 1800, thinkMax: 4200, samples: 44, chatChance: 0.55 },
        5: { name: 'Baba Gupta', thinkMin: 2200, thinkMax: 5000, samples: 80, chatChance: 0.68 }
    };

    const PHRASES = {
        intro: ['Tiny cards, expensive mistakes.', 'Fresh month. Try not to feed me.', 'The flowers look peaceful. I am not.', 'Koi-Koi starts now. Regret follows shortly.'],
        capture: ['Mine. Cheers.', 'Nice card. I will keep it.', 'That pair had my name on it.', 'Yoink. Very traditional.', 'Lovely gift, mate.'],
        yaku: ['Yaku. That escalated nicely.', 'There it is. Pay attention.', 'The flowers just grew teeth.', 'That set looks bloody lovely.'],
        koi: ['Koi-Koi. I want more.', 'Double or nothing, you coward.', 'I am pressing it. Try stopping me.', 'Koi-Koi. The pond is getting nasty.'],
        stop: ['Shobu. Pay up.', 'Enough. I bank the points.', 'Stop. I have seen your luck.', 'That will do nicely.'],
        chat: ['Big talk for someone feeding the field.', 'Your strategy smells like wet cardboard.', 'Nice move. Annoyingly nice.', 'Knock knock. Who is there? Your missing Yaku.', 'Roses are red, this ribbon is blue; I took the good card, bad luck to you.']
    };

    const BABA_PHRASES = {
        intro: ['Baba enters the flower shop. Prices go up.', 'Pretty cards. Ugly afternoon for you.', 'Baba sees blossoms and future complaints.', 'Deal them, mate. Baba brought a rake.'],
        capture: ['Baba takes that. Finders keepers, dickhead.', 'Cheers for the gift, you absolute turnip.', 'Mine now. Your plan lasted six seconds.', 'Baba harvests. You provide fertilizer.'],
        yaku: ['Yaku, prick. The garden has spoken.', 'Look at that set. Bloody gorgeous.', 'Baba built a Yaku from your bad decisions.', 'Points are blooming. Your hopes are compost.'],
        koi: ['Koi-Koi. Baba did not come here for bus fare.', 'Again. Baba wants the whole damn pond.', 'Baba presses. Courage or stupidity—same jacket.', 'Koi-Koi, mate. Start sweating politely.'],
        stop: ['Shobu. Empty your little wallet.', 'Baba banks it. Greed can wait one month.', 'Stop. That is enough public humiliation.', 'Points secured. Complaints rejected.'],
        chat: ['Yo mama matches cards by smell.', 'Knock knock. Who is there? Baba. Your points are gone.', 'Roses are red, ribbons are blue; nice little hand, shame what Baba will do.', 'That move was brave as hell. Still stupid.', 'Fair play, mate. That one had teeth.', 'You play like a pigeon choosing lunch.', 'Lovely confidence. Shame about the cards.']
    };

    const canonicalDeck = () => Rules.createDeck(() => 0.999999);
    const copyField = field => field.map(card => ({ ...card, categories: [...card.categories] }));

    class HanafudaBotBrain {
        static publicContext(bot, state) {
            const opponent = state.players.find(player => player.id !== bot.id);
            return {
                field: copyField(state.field || []),
                ownHand: copyField(bot.hand || []),
                ownCaptured: copyField(bot.captured || []),
                opponentCaptured: copyField(opponent?.captured || []),
                opponentHandCount: opponent?.hand?.length || 0,
                deckCount: state.deck?.length || state.deckCount || 0,
                settings: { ...state.settings },
                ownScore: bot.score || 0,
                opponentScore: opponent?.score || 0,
                roundNumber: state.roundNumber || 1
            };
        }

        static chooseAction(bot, state, random = Math.random) {
            const difficulty = Math.max(1, Math.min(5, Number(bot.botDifficulty) || 1));
            if (state.phase === 'WAIT_HAND_SELECTION') return HanafudaBotBrain.chooseHandCard(bot, state, difficulty, random);
            if (['WAIT_HAND_CAPTURE', 'WAIT_DRAW_CAPTURE'].includes(state.phase)) {
                return HanafudaBotBrain.chooseCapture(bot, state, difficulty, random);
            }
            if (state.phase === 'WAIT_KOI_KOI_CHOICE') return HanafudaBotBrain.chooseKoi(bot, state, difficulty, random);
            return null;
        }

        static chooseHandCard(bot, state, difficulty, random) {
            if (!bot.hand.length) return null;
            if (difficulty === 1) {
                const card = bot.hand[Math.floor(random() * bot.hand.length)];
                return { type: 'PLAY_HAND_CARD', cardId: card.id };
            }
            const context = HanafudaBotBrain.publicContext(bot, state);
            const candidates = bot.hand.map(card => ({
                card,
                score: HanafudaBotBrain.scoreMove(card, context, difficulty, random)
            })).sort((left, right) => right.score - left.score || left.card.id.localeCompare(right.card.id));
            const fuzz = difficulty === 2 ? Math.min(2, candidates.length) : 1;
            const choice = candidates[Math.floor(random() * fuzz)] || candidates[0];
            return { type: 'PLAY_HAND_CARD', cardId: choice.card.id, analysis: choice.score };
        }

        static scoreMove(card, context, difficulty, random) {
            const matches = Rules.matchingFieldCards(context.field, card);
            const captureOptions = matches.length === 2 ? matches : [matches[0]].filter(Boolean);
            const before = Rules.evaluateYaku(context.ownCaptured, context.settings);
            let bestImmediate = -Infinity;
            let bestField = null;
            const options = captureOptions.length ? captureOptions : [null];
            for (const target of options) {
                const result = Rules.resolveCapture(copyField(context.field), card, target?.id);
                const captured = [...context.ownCaptured, ...(result.captured || [])];
                const after = Rules.evaluateYaku(captured, context.settings);
                const yakuGain = (after.points - before.points) * 34 + (Rules.isNewOrUpgraded(before, after) ? 32 : 0);
                const captureValue = (result.captured || []).reduce((sum, item) => sum + Rules.cardPriority(item), 0);
                const score = yakuGain + captureValue * 3.2 + (result.captured?.length || 0) * 2;
                if (score > bestImmediate) { bestImmediate = score; bestField = result.field; }
            }

            if (bestImmediate === -Infinity) { bestImmediate = 0; bestField = [...context.field, card]; }
            const opponentEval = Rules.evaluateYaku(context.opponentCaptured, context.settings);
            const exposedCost = matches.length ? 0 : Rules.cardPriority(card) * (difficulty >= 4 ? 2.3 : 1.45);
            const monthOnField = bestField.filter(item => item.month === card.month).length;
            const stackPressure = monthOnField === 3 ? -18 : monthOnField === 2 ? -6 : 0;
            const ownMonthOptions = context.ownHand.filter(item => item.id !== card.id && item.month === card.month).length;
            const preservePair = ownMonthOptions * (difficulty >= 4 ? 3.8 : 2);
            const opponentThreat = HanafudaBotBrain.yakuThreat(context.opponentCaptured, context.field, context.settings)
                * (difficulty >= 4 ? 1.25 : 0.65);

            let score = bestImmediate - exposedCost + stackPressure - preservePair - opponentThreat;
            if (context.opponentHandCount <= 2) score += bestImmediate * 0.28;
            if (opponentEval.points >= 5) score += Rules.cardPriority(card) * 0.6;
            if (difficulty >= 3) score += HanafudaBotBrain.sampleFuture(card, context, difficulty, random);
            return score;
        }

        static sampleFuture(card, context, difficulty, random) {
            const seen = new Set([
                ...context.field, ...context.ownHand, ...context.ownCaptured, ...context.opponentCaptured
            ].map(item => item.id));
            const unknown = canonicalDeck().filter(item => !seen.has(item.id));
            if (!unknown.length) return 0;
            const samples = PROFILES[difficulty].samples;
            let total = 0;
            for (let index = 0; index < samples; index++) {
                const drawn = unknown[Math.floor(random() * unknown.length)];
                const fieldAfterHand = Rules.resolveCapture(copyField(context.field), card,
                    Rules.matchingFieldCards(context.field, card)[0]?.id).field;
                const drawMatches = Rules.matchingFieldCards(fieldAfterHand, drawn);
                const drawTarget = drawMatches.slice().sort((a, b) => Rules.cardPriority(b) - Rules.cardPriority(a))[0];
                const result = Rules.resolveCapture(fieldAfterHand, drawn, drawTarget?.id);
                total += (result.captured || []).reduce((sum, item) => sum + Rules.cardPriority(item), 0) * 0.55;
                if (!result.captured?.length) total -= Rules.cardPriority(drawn) * 0.18;
            }
            return total / Math.max(1, samples);
        }

        static yakuThreat(captured, field, settings) {
            const evaluation = Rules.evaluateYaku(captured, settings);
            const categories = name => captured.filter(card => card.categories?.includes(name)).length;
            let threat = evaluation.points * 2;
            if (categories('Animal') === 4) threat += 9;
            if (categories('Ribbon') === 4) threat += 8;
            if (categories('Chaff') === 9) threat += 6;
            const ids = new Set(captured.map(card => card.id));
            if (Rules.SPECIAL.poetry.filter(id => ids.has(id)).length === 2) threat += 10;
            if (Rules.SPECIAL.blue.filter(id => ids.has(id)).length === 2) threat += 10;
            return threat + field.filter(card => Rules.cardPriority(card) >= 7).length * 0.4;
        }

        static chooseCapture(bot, state, difficulty, random) {
            const ids = state.pending?.choiceIds || [];
            if (!ids.length) return null;
            if (difficulty === 1) return { type: 'CHOOSE_CAPTURE', cardId: ids[Math.floor(random() * ids.length)] };
            const context = HanafudaBotBrain.publicContext(bot, state);
            const ranked = ids.map(id => {
                const target = state.field.find(card => card.id === id);
                const captured = [...context.ownCaptured, target, state.pending.card].filter(Boolean);
                const before = Rules.evaluateYaku(context.ownCaptured, context.settings);
                const after = Rules.evaluateYaku(captured, context.settings);
                return { id, score: Rules.cardPriority(target) * 3 + (after.points - before.points) * 38 + (Rules.isNewOrUpgraded(before, after) ? 30 : 0) };
            }).sort((a, b) => b.score - a.score);
            return { type: 'CHOOSE_CAPTURE', cardId: ranked[0].id };
        }

        static chooseKoi(bot, state, difficulty, random) {
            const evaluation = state.pending?.evaluation || Rules.evaluateYaku(bot.captured, state.settings);
            if (difficulty === 1) return { type: random() < 0.46 ? 'KOI_KOI' : 'SHOBU' };
            const context = HanafudaBotBrain.publicContext(bot, state);
            const opponentThreat = HanafudaBotBrain.yakuThreat(context.opponentCaptured, context.field, context.settings);
            const turnsLeft = bot.hand.length;
            const behind = context.ownScore < context.opponentScore;
            let continueUtility = turnsLeft * 1.4 + (behind ? 5 : -1) - evaluation.points * 1.8 - opponentThreat * 1.25;
            if (evaluation.points >= 7) continueUtility -= 16;
            if (state.koiKoi[bot.id]) continueUtility -= 5;
            if (difficulty >= 4 && context.opponentHandCount <= 2) continueUtility -= 9;
            if (difficulty === 5 && context.roundNumber === context.settings.rounds && context.ownScore > context.opponentScore) continueUtility -= 18;
            return { type: continueUtility > (difficulty === 2 ? random() * 8 - 3 : 0) ? 'KOI_KOI' : 'SHOBU', utility: continueUtility };
        }
    }

    class HanafudaBotController {
        constructor(engine, options = {}) {
            this.engine = engine;
            this.random = options.random || Math.random;
            this.interval = null;
            this.schedules = new Map();
            this.disconnectedSchedule = null;
            this.pendingChats = new Map();
            this.recent = new Map();
        }

        start() { if (!this.interval) this.interval = setInterval(() => this.tick(), 220); }
        stop() {
            if (this.interval) clearInterval(this.interval);
            this.interval = null;
            for (const timers of this.pendingChats.values()) { clearTimeout(timers.start); clearTimeout(timers.send); }
            this.pendingChats.clear();
        }

        tick() {
            const state = this.engine.state;
            const bot = this.engine.activePlayer();
            const actionable = ['WAIT_HAND_SELECTION', 'WAIT_HAND_CAPTURE', 'WAIT_DRAW_CAPTURE', 'WAIT_KOI_KOI_CHOICE'];
            if (bot && bot.connected === false && !bot.isBot && actionable.includes(state.phase)) {
                const awayKey = `${bot.id}:${state.phase}:${state.lastAction?.nonce || state.roundNumber}:${state.pending?.card?.id || ''}`;
                if (!this.disconnectedSchedule || this.disconnectedSchedule.key !== awayKey) {
                    this.disconnectedSchedule = { key: awayKey, readyAt: Date.now() + 2600 };
                    return;
                }
                if (Date.now() >= this.disconnectedSchedule.readyAt) {
                    this.disconnectedSchedule = null;
                    this.engine.skipDisconnectedTurn();
                }
                return;
            }
            this.disconnectedSchedule = null;
            if (!bot?.isBot || !actionable.includes(state.phase)) return;
            const key = `${state.phase}:${state.lastAction?.nonce || state.roundNumber}:${bot.hand.length}:${state.pending?.card?.id || ''}`;
            const existing = this.schedules.get(bot.id);
            if (!existing || existing.key !== key) {
                const profile = PROFILES[bot.botDifficulty] || PROFILES[1];
                const choicePhase = state.phase !== 'WAIT_HAND_SELECTION';
                const multiplier = choicePhase ? 0.58 : bot.hand.length <= 3 ? 1.15 : 1;
                const delay = (profile.thinkMin + this.random() * (profile.thinkMax - profile.thinkMin)) * multiplier;
                this.schedules.set(bot.id, { key, readyAt: Date.now() + delay });
                this.engine.setBotActivity(bot.id, 'thinking', true);
                return;
            }
            if (Date.now() < existing.readyAt) return;
            this.schedules.delete(bot.id);
            this.engine.setBotActivity(bot.id, 'thinking', false);
            const action = HanafudaBotBrain.chooseAction(bot, state, this.random);
            if (action) this.engine.processAction(action, bot.id);
        }

        handleEvent(event, state) {
            if (!event) return;
            const actor = this.engine.getPlayer(event.playerId);
            if (actor?.isBot) {
                if (event.type === 'round_started') this.queueChat(actor, 'intro');
                if (event.type === 'yaku') this.queueChat(actor, 'yaku');
            }
            if (event.type === 'capture_choice' && actor?.isBot) this.queueChat(actor, 'capture');
            if (event.type === 'chat' && !event.isBot) {
                const bot = state.players.find(player => player.isBot && player.botDifficulty === 5) || state.players.find(player => player.isBot);
                if (bot) this.queueChat(bot, 'chat', true);
            }
        }

        queueChat(bot, category, force = false) {
            if (!bot?.isBot || this.pendingChats.has(bot.id)) return;
            const profile = PROFILES[bot.botDifficulty] || PROFILES[1];
            if (!force && this.random() > profile.chatChance) return;
            const historical = HistoricalBots?.linesFor(bot.historicalPersona, category) || [];
            const source = historical.length ? historical : ((bot.botDifficulty === 5 ? BABA_PHRASES : PHRASES)[category] || PHRASES.chat);
            const recent = this.recent.get(bot.id) || [];
            const available = source.filter(line => !recent.includes(line));
            const line = (available.length ? available : source)[Math.floor(this.random() * (available.length || source.length))];
            recent.push(line); if (recent.length > 4) recent.shift(); this.recent.set(bot.id, recent);
            const timers = {};
            timers.start = setTimeout(() => {
                this.engine.setBotActivity(bot.id, 'typing', true);
                timers.send = setTimeout(() => {
                    this.engine.setBotActivity(bot.id, 'typing', false);
                    this.pendingChats.delete(bot.id);
                    this.engine.addBotChat(bot.id, line);
                }, Math.max(650, Math.min(3600, line.length * 42)));
            }, 350 + this.random() * 650);
            this.pendingChats.set(bot.id, timers);
        }
    }

    return { PROFILES, PHRASES, BABA_PHRASES, HanafudaBotBrain, HanafudaBotController };
});
