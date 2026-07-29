(function (root, factory) {
    const rules = typeof module === 'object' && module.exports
        ? require('./rules.js')
        : root.DurakRules;
    const api = factory(rules);
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.DurakBots = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules) {
    'use strict';

    const PROFILES = {
        1: { name: 'Village Rookie', min: 2600, max: 5600, error: 0.28, chat: 0.38 },
        2: { name: 'Street Player', min: 2100, max: 4500, error: 0.16, chat: 0.28 },
        3: { name: 'Tactician', min: 1700, max: 3700, error: 0.08, chat: 0.22 },
        4: { name: 'Grandmaster', min: 1550, max: 3300, error: 0.025, chat: 0.26 },
        5: { name: 'Baba Gupta — The Unfoolable', min: 1350, max: 2900, error: 0.008, chat: 0.52 }
    };

    const LINES = {
        1: {
            attack: ['This one looks attack-ish.', 'I have a plan. It is mostly a card.', 'Here goes nothing with a suit.'],
            defend: ['Covered! Probably legally.', 'My defence has arrived slightly confused.', 'That card looked expensive, so I used it.'],
            take: ['Fine, I wanted a larger hand anyway.', 'These cards are joining my support group.', 'I call this tactical collecting.'],
            throw: ['One more for the road.', 'You are already taking them, so… surprise.', 'Extra cardboard delivery!'],
            pass: ['I am done causing problems for now.', 'That is enough strategy for one turn.']
        },
        2: {
            attack: ['Let us start small and unpleasant.', 'Your defence exam begins now.', 'A polite little attack.'],
            defend: ['Clean cover.', 'Not today.', 'Same suit, higher problem.'],
            take: ['I will take the table and remember this.', 'Bad defence, acceptable recovery.', 'That pile is coming home with me.'],
            throw: ['Matching rank. Enjoy the bundle.', 'The table asked for one more.', 'Special delivery for the defender.'],
            pass: ['Attack complete.', 'I have made my point.']
        },
        3: {
            attack: ['Low card, high inconvenience.', 'Testing your suit structure.', 'Let us see what you protect.'],
            defend: ['Minimum sufficient defence.', 'Covered without wasting the trump.', 'Efficient. Next question.'],
            take: ['Taking preserves the cards that matter.', 'I lose the exchange, not the deal.', 'Sometimes the pile is cheaper than the defence.'],
            throw: ['Rank matched. Pressure extended.', 'Another copy enters the argument.', 'Your hand limit is doing important work.'],
            pass: ['No profitable continuation.', 'The defence may stand.']
        },
        4: {
            attack: ['I am attacking the shape of your hand, not the card.', 'This rank constrains your cleanest defence.', 'Tempo first. Trumps later.'],
            defend: ['Lowest winning cover. Nothing donated.', 'The trump stays reserved.', 'Defence solved at minimum cost.'],
            take: ['The pile is cheaper than exposing my endgame.', 'I accept material to preserve control.', 'A strategic pickup is not surrender.'],
            throw: ['Your pickup converts my dead rank into tempo.', 'Matching rank, maximum discomfort.', 'The throw-in closes an escape route.'],
            pass: ['Further pressure would improve your draw.', 'The defended table can leave.']
        },
        5: {
            attack: [
                'Baba attacks the distribution, not the rectangle.',
                'Your cheapest cover creates a more expensive future.',
                'This rank has already applied for ownership of your hand.',
                'I selected the line where every defence tells me something.'
            ],
            defend: [
                'Covered with the smallest card that preserves the proof.',
                'Trump conservation is not fear. It is accounting.',
                'You attacked a card. Baba defended the next three turns.',
                'The cover is cheap; the information was free.'
            ],
            take: [
                'Baba takes cards only when the alternative takes position.',
                'The pile looks large because your horizon is small.',
                'I accept these cards. Their future owners may differ.',
                'This pickup improves the only endgame that matters.'
            ],
            throw: [
                'You announced pickup; Baba submits the remaining paperwork.',
                'A matching rank is a legally binding inconvenience.',
                'One more card, because your hand still has room for regret.',
                'The attack limit protects you from my enthusiasm.'
            ],
            pass: [
                'The defence survives. The player remains under review.',
                'Baba ends the attack exactly where continuation loses value.',
                'Keep the table. I already kept the tempo.'
            ]
        },
        global: {
            intro: [
                'Six cards each. One trump. One future fool.',
                'Welcome to Durak. Protect your trumps and your reputation.',
                'The talon is finite. The excuses appear renewable.'
            ],
            gameOver: [
                '{durak}, the table has reached a unanimous conclusion.',
                'The talon is gone and the fool has been identified: {durak}.',
                'A respectful silence for {durak} and their remaining cards.'
            ]
        }
    };

    function randomBetween(min, max, random = Math.random) {
        return min + random() * (max - min);
    }

    function ownPlayer(view, botId) {
        return view.players.find(player => player.id === botId);
    }

    function actionActorId(view) {
        if (view.phase === 'defend') return view.defenderId;
        if (view.phase === 'attack' || view.phase === 'throw_in') return view.attackTurnId;
        return null;
    }

    function cardCost(card, trumpSuit) {
        return Rules.rankValue(card) + (card.suit === trumpSuit ? 18 : 0);
    }

    function chooseLowestDefense(cards, trumpSuit) {
        return [...cards].sort((first, second) => cardCost(first, trumpSuit) - cardCost(second, trumpSuit))[0] || null;
    }

    function chooseAttackCard(view, me, legal, difficulty, random = Math.random) {
        const rankCounts = {};
        for (const card of me.hand) rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        const pickup = view.phase === 'throw_in';
        const scored = legal.map(card => {
            let score = cardCost(card, view.trumpSuit);
            if (!pickup) {
                score -= (rankCounts[card.rank] - 1) * (difficulty >= 3 ? 3.2 : 1.2);
                if (card.suit === view.trumpSuit) score += difficulty >= 3 ? 15 : 6;
            } else {
                score = -score;
                if (card.suit === view.trumpSuit) score += difficulty >= 3 ? 24 : 9;
            }
            return { card, score };
        }).sort((first, second) => first.score - second.score);
        if (difficulty <= 1 && scored.length > 1 && random() < 0.35) {
            return scored[Math.floor(random() * scored.length)].card;
        }
        return scored[0]?.card || null;
    }

    function shouldTake(view, me, legalDefenses, difficulty) {
        if (!legalDefenses.length) return true;
        if (difficulty <= 1) return false;
        const cheapest = chooseLowestDefense(legalDefenses, view.trumpSuit);
        const attack = Rules.getUncoveredPairs(view.battle)[0]?.attackCard;
        if (!cheapest || !attack) return true;
        const tableCards = view.battle.reduce((count, pair) => count + 1 + Number(Boolean(pair.defenseCard)), 0);
        const trumpSacrifice = cheapest.suit === view.trumpSuit && attack.suit !== view.trumpSuit;
        if (difficulty >= 4 && view.talonCount > 0 && trumpSacrifice && tableCards <= 2 && me.hand.length <= 4) return true;
        return false;
    }

    function chooseAction(view, botId, random = Math.random) {
        const me = ownPlayer(view, botId);
        if (!me || me.out || actionActorId(view) !== botId) return null;
        const difficulty = Number(me.botDifficulty || 1);
        const profile = PROFILES[difficulty] || PROFILES[1];

        if (view.phase === 'defend') {
            const pair = Rules.getUncoveredPairs(view.battle)[0];
            if (!pair) return null;
            const legal = Rules.getLegalDefenseCards(me.hand, pair.attackCard, view.trumpSuit);
            if (shouldTake(view, me, legal, difficulty)) return { type: 'TAKE_CARDS' };
            let card = chooseLowestDefense(legal, view.trumpSuit);
            if (profile.error > 0 && legal.length > 1 && random() < profile.error) {
                card = legal[Math.floor(random() * legal.length)];
            }
            return card ? { type: 'DEFEND', cardId: card.id, pairId: pair.id } : { type: 'TAKE_CARDS' };
        }

        if (view.phase === 'attack' || view.phase === 'throw_in') {
            const legal = Rules.getLegalAttackCards(me.hand, view.battle, view.attackLimit);
            if (!legal.length) return view.battle.length ? { type: 'PASS_ATTACK' } : null;
            const defender = view.players.find(player => player.id === view.defenderId);
            const remainingCapacity = Math.max(0, view.attackLimit - view.battle.length);
            const pressureIsPoor = view.phase === 'attack'
                && view.battle.length > 0
                && difficulty >= 3
                && (remainingCapacity <= 0 || (defender?.handCount || 0) > me.hand.length + 3);
            const casualPass = view.battle.length > 0 && random() < profile.error * 0.42;
            if (pressureIsPoor || casualPass) return { type: 'PASS_ATTACK' };
            const card = chooseAttackCard(view, me, legal, difficulty, random);
            return card ? { type: 'ATTACK', cardId: card.id } : { type: 'PASS_ATTACK' };
        }
        return null;
    }

    function lineFor(difficulty, category, random = Math.random, context = {}) {
        const bank = LINES[difficulty]?.[category] || LINES[2][category] || [];
        if (!bank.length) return '';
        return bank[Math.floor(random() * bank.length)]
            .replaceAll('{durak}', context.durak || 'the fool');
    }

    function getDecisionDelay(difficulty, random = Math.random, phase = 'attack') {
        const profile = PROFILES[difficulty] || PROFILES[1];
        let delay = randomBetween(profile.min, profile.max, random);
        if (phase === 'defend') delay *= 1.12;
        if (phase === 'throw_in') delay *= 0.88;
        if (random() < 0.18) delay += randomBetween(450, 1300, random);
        return Math.round(Math.max(850, Math.min(6200, delay)));
    }

    class DurakBotController {
        constructor(engine, options = {}) {
            this.engine = engine;
            this.onStateChange = options.onStateChange || (() => {});
            this.random = options.random || Math.random;
            this.now = options.now || (() => Date.now());
            this.interval = null;
            this.schedule = null;
            this.typingTimers = new Set();
            this.lastToken = '';
            this.gameOverCommented = false;
            this.recentLines = new Map();
        }

        start() {
            this.stop();
            this.gameOverCommented = false;
            this.interval = setInterval(() => this.tick(), 240);
        }

        stop() {
            if (this.interval) clearInterval(this.interval);
            this.interval = null;
            for (const timer of this.typingTimers) clearTimeout(timer);
            this.typingTimers.clear();
            this.schedule = null;
        }

        token(view, botId) {
            return [
                view.phase,
                view.roundNumber,
                view.attackTurnId,
                view.defenderId,
                view.battle.map(pair => `${pair.id}:${pair.defenseCard?.id || ''}`).join(','),
                ownPlayer(view, botId)?.handCount,
                view.lastAction?.time
            ].join('|');
        }

        setActivity(botId, type, active) {
            const key = type === 'typing' ? 'typingBots' : 'thinkingBots';
            const current = this.engine.state[key] || [];
            const has = current.includes(botId);
            if (has === active) return;
            this.engine.state[key] = active
                ? [...current, botId]
                : current.filter(id => id !== botId);
            this.onStateChange();
        }

        comment(bot, category) {
            const profile = PROFILES[bot.botDifficulty] || PROFILES[1];
            if (this.random() > profile.chat) return;
            let line = lineFor(bot.botDifficulty, category, this.random);
            const recent = this.recentLines.get(bot.id) || [];
            if (recent.includes(line)) {
                const alternatives = (LINES[bot.botDifficulty]?.[category] || []).filter(candidate => !recent.includes(candidate));
                if (alternatives.length) line = alternatives[Math.floor(this.random() * alternatives.length)];
            }
            if (!line) return;
            this.recentLines.set(bot.id, [...recent.slice(-3), line]);
            const charactersPerSecond = bot.botDifficulty === 5 ? 7.2 : 5.2;
            const typingMs = Math.min(8500, Math.max(1000, Math.round(line.length / charactersPerSecond * 1000)));
            this.setActivity(bot.id, 'typing', true);
            const timer = setTimeout(() => {
                this.typingTimers.delete(timer);
                this.setActivity(bot.id, 'typing', false);
                this.engine.addChat(bot.id, line);
                this.onStateChange();
            }, typingMs);
            this.typingTimers.add(timer);
        }

        tick() {
            const state = this.engine.state;
            if (state.phase === 'lobby') return;
            if (state.phase === 'game_over') {
                if (this.gameOverCommented) return;
                this.gameOverCommented = true;
                const bot = state.players.find(player => player.isBot && !player.out)
                    || state.players.find(player => player.isBot);
                if (bot) {
                    const durak = state.players.find(player => player.id === state.durakId)?.name || 'nobody';
                    const bank = LINES.global.gameOver;
                    const message = bank[Math.floor(this.random() * bank.length)].replaceAll('{durak}', durak);
                    this.engine.addChat(bot.id, message);
                    this.onStateChange();
                }
                return;
            }

            const actorId = actionActorId(state);
            const bot = state.players.find(player => player.id === actorId && player.isBot && !player.out);
            if (!bot) {
                if (this.schedule) this.setActivity(this.schedule.botId, 'thinking', false);
                this.schedule = null;
                return;
            }
            const view = this.engine.getViewState(bot.id);
            const token = this.token(view, bot.id);
            if (!this.schedule || this.schedule.token !== token) {
                if (this.schedule) this.setActivity(this.schedule.botId, 'thinking', false);
                this.schedule = {
                    botId: bot.id,
                    token,
                    readyAt: this.now() + getDecisionDelay(bot.botDifficulty, this.random, state.phase)
                };
                this.setActivity(bot.id, 'thinking', true);
                return;
            }
            if (this.now() < this.schedule.readyAt) return;

            this.setActivity(bot.id, 'thinking', false);
            this.schedule = null;
            const action = chooseAction(view, bot.id, this.random);
            if (!action) return;
            const category = action.type === 'DEFEND'
                ? 'defend'
                : action.type === 'TAKE_CARDS'
                ? 'take'
                : action.type === 'PASS_ATTACK'
                ? 'pass'
                : state.phase === 'throw_in'
                ? 'throw'
                : 'attack';
            const result = this.engine.processAction(action, bot.id);
            if (result?.ok) this.comment(bot, category);
            this.onStateChange();
        }
    }

    return {
        PROFILES,
        LINES,
        chooseAction,
        getDecisionDelay,
        lineFor,
        DurakBotController
    };
});
