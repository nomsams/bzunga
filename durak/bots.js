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
        1: { name: 'Village Rookie', min: 2600, max: 5600, error: 0.28, chat: 0.78 },
        2: { name: 'Street Player', min: 2100, max: 4500, error: 0.16, chat: 0.72 },
        3: { name: 'Tactician', min: 1700, max: 3700, error: 0.08, chat: 0.68 },
        4: { name: 'Grandmaster', min: 1550, max: 3300, error: 0.025, chat: 0.74 },
        5: { name: 'Baba Gupta — The Unfoolable', min: 1350, max: 2900, error: 0.008, chat: 0.9 }
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

    const DURAK_ROASTS = {
        1: {
            attack: [
                "Knock knock. Who is there? This card. Please pretend I planned it.",
                "Roses are red, violets are blue, I found an attack and I am aiming it at you.",
                "Here, deal with this bullshit. I certainly could not.",
                "My card has a number and your face has concern. Good enough."
            ],
            defend: [
                "Covered! Your scary card can sit down now.",
                "I defended that by accident, which makes this extra embarrassing for you.",
                "Not today, you discount supervillain.",
                "My defence has training wheels and still stopped your ass."
            ],
            take: [
                "Fine, dump the whole damn table in my hand.",
                "I am not losing; I am collecting evidence badly.",
                "Congratulations, clown. You made my hand need a suitcase.",
                "These cards are mine now. I hate every one of you."
            ],
            throw: [
                "One more card for your emotional-support pile.",
                "Special delivery: extra cardboard and mild disrespect.",
                "You were already taking them, so eat this one too.",
                "My strategy finally works: make your problem thicker."
            ],
            pass: [
                "I am done. The bad decisions may continue clockwise.",
                "Pass. My last brain cell needs a smoke.",
                "That is enough genius for today, you animals.",
                "I stop attacking before I accidentally help you."
            ]
        },
        2: {
            attack: [
                "Knock knock. Who is there? Trouble wearing a cheap suit.",
                "Roses are red, violets are blue, beat this card or it is moving in with you.",
                "A small attack for a very large ego.",
                "Here comes a card with more direction than your whole game."
            ],
            defend: [
                "Covered. Take that little attack back to the shop.",
                "You swung; I answered. Try using both hands next time.",
                "That attack was cute. It can nap under this card.",
                "Clean defence. Dirty look included for free."
            ],
            take: [
                "Fine. I take the pile and your name for later.",
                "Enjoy this moment, you lucky cardboard goblin.",
                "I picked up cards, not respect for that move.",
                "This pile is bullshit, but revenge travels well."
            ],
            throw: [
                "Another one. Your hand looked lonely.",
                "Eat the matching rank, bozo.",
                "The bundle gets bigger; your smile gets smaller.",
                "Free delivery, no returns, plenty of regret."
            ],
            pass: [
                "I am finished. Somebody else bully the defender.",
                "Pass. The point was made and it was rude.",
                "That is enough damage without becoming tacky.",
                "I stop here. Your dignity already left."
            ]
        },
        3: {
            attack: [
                "Knock knock. Who is there? A card your hand does not want.",
                "Roses are red, trumps are mean, your defence is about to become a crime scene.",
                "Low card, high disrespect. Deal with it.",
                "I picked this card because your face said 'please ruin my day.'"
            ],
            defend: [
                "Covered. No spreadsheet, just better cards.",
                "Your attack had confidence and absolutely no follow-through.",
                "That card came in loud and left under mine.",
                "Defended. Please collect your tiny dramatic speech."
            ],
            take: [
                "I will take the cards. You can keep the premature celebration.",
                "This pickup hurts less than listening to your victory speech.",
                "Fine, pile acquired. Grudge also acquired.",
                "Take the round, clown. The game is longer than your attention span."
            ],
            throw: [
                "Matching rank. Your hand is becoming a group project.",
                "One more card because suffering loves company.",
                "The pile asked for seconds. I am a generous bastard.",
                "Here is another problem in convenient pocket size."
            ],
            pass: [
                "Pass. I have done enough damage for one taxpayer.",
                "The defence stands. Unfortunately, so does the defender.",
                "I am done; continuing would make your hand less funny.",
                "That is all. Try not to turn survival into a personality."
            ]
        },
        4: {
            attack: [
                "Knock knock. Who is there? Your expensive defence arriving early.",
                "Roses are red, violets are blue, I know what hurts and I picked it for you.",
                "Forget the theory. This card is here to kick your door in.",
                "Your hand has a weak spot and this card brought a crowbar."
            ],
            defend: [
                "Covered. Your master plan lasted four seconds.",
                "No grand analysis needed; your attack was simply ass.",
                "The lowest winning card is still higher than your standards.",
                "Defended cleanly. Please wipe your attack off the table."
            ],
            take: [
                "I take the pile because wasting trumps on that nonsense would be insulting.",
                "Enjoy the pickup, clown. It is the last gift you get.",
                "Cards acquired. Revenge already out for delivery.",
                "I can carry the pile. Can you carry that smug face to the ending?"
            ],
            throw: [
                "Another matching card. Your hand now has its own postal code.",
                "Take this too; the humiliation looked underfed.",
                "The attack limit is the only adult protecting you.",
                "One more card, because your problem was not stupid enough yet."
            ],
            pass: [
                "Pass. You survived the attack, not the roasting.",
                "I am done. Your hand remains ugly enough without help.",
                "Keep the table. I kept the better punchline.",
                "The defence stands. Barely. Like a drunk garden chair."
            ]
        },
        5: {
            attack: [
                "Knock knock. Baba Gupta. Your defence is about to stop answering.",
                "Roses are red, the trump card is bright, Baba starts trouble and sleeps well tonight.",
                "Baba does not need a lecture. This card says 'deal with it.'",
                "Your hand looked comfortable. Baba fixed that."
            ],
            defend: [
                "Covered. Baba expected danger and received amateur theatre.",
                "Your attack was loud. Baba's answer was louder and better dressed.",
                "Baba put your card exactly where bad ideas belong: underneath.",
                "No calculation speech today. Your attack was just weak as hell."
            ],
            take: [
                "Baba takes the pile. You take one temporary victory and overvalue it.",
                "Enjoy this, you lucky bastard. Baba saves receipts.",
                "These cards join Baba. Your confidence joins the endangered list.",
                "A pickup is not defeat. Your celebration, however, is comedy."
            ],
            throw: [
                "One more for your hand, because Baba supports struggling collectors.",
                "Baba adds a card. Your wrist files a complaint.",
                "Eat the matching rank, cardboard peasant.",
                "The attack limit saves you from Baba's full generosity."
            ],
            pass: [
                "Baba passes. Continue the clown parade without supervision.",
                "The defence lives. Its dignity did not.",
                "Baba stops here because bullying must retain some elegance.",
                "Keep the table. Baba already kept the room."
            ]
        }
    };

    const DURAK_CHAT_ROASTS = {
        1: [
            "{target}, I barely know the rules and even I know that message was weak.",
            "Knock knock. Who is there? Not your point. It missed the table.",
            "Roses are red, violets are blue, my hand is a mess and yours probably is too.",
            "Keep talking, {target}. It makes my panic look organized.",
            "That was a lot of mouth for somebody one trump away from disaster.",
            "I would roast you properly, but I might accidentally burn my cards."
        ],
        2: [
            "{target}, your mouth attacks harder than your hand.",
            "Knock knock. Who is there? The point you forgot to include.",
            "Roses are red, trumps ruin the day, your message was loud but had nothing to say.",
            "Keep chirping, clown. The talon is not impressed.",
            "Good trash talk. Shame it came bundled with that gameplay.",
            "Your message sailed. Your strategy missed the bus."
        ],
        3: [
            "{target}, save the speech. Your hand needs the oxygen.",
            "Knock knock. Who is there? Consequences with six cards.",
            "Roses are red, the discard is gone, you keep talking shit and I keep playing on.",
            "That sounded dangerous until I remembered who typed it.",
            "Your roast had timing. Your defence usually does not.",
            "Less commentary, more surviving, bozo."
        ],
        4: [
            "{target}, that message had more structure than your whole defence.",
            "Knock knock. Who is there? A better argument than yours.",
            "Roses are red, violets are blue, I saved my trumps and I am saving this roast for you.",
            "You talk like a grandmaster and defend like garden furniture.",
            "No analysis required: that was premium bullshit.",
            "Keep typing, clown. Winning clearly left your schedule open."
        ],
        5: [
            "{target}, Baba heard you. The intelligent part must be arriving separately.",
            "Knock knock. Baba Gupta. Your comeback has been evicted.",
            "Roses are red, the talon runs dry, Baba keeps winning while you keep asking why.",
            "Keep talking shit. Baba enjoys background noise during easy work.",
            "Your mouth holds six trumps. Your actual hand sends apologies.",
            "Baba would debate you, but watching your defence collapse is funnier."
        ]
    };

    Object.entries(DURAK_ROASTS).forEach(([difficulty, categories]) => {
        Object.entries(categories).forEach(([category, lines]) => LINES[difficulty][category].push(...lines));
    });
    Object.entries(DURAK_CHAT_ROASTS).forEach(([difficulty, lines]) => {
        LINES[difficulty].chat = lines;
    });

    const DURAK_RUDER_TABLE = {
        1: {
            attack: [
                'Here is a card. Beat it or join me in the idiot corner.',
                'I found the attack button. Your peaceful afternoon is fucked.',
                'This card has no plan, but it has your name on it.'
            ],
            defend: [
                'Covered! That attack was scarier before it met the rookie.',
                'I stopped your card with the confidence of a drunk crossing guard.',
                'Sit down, discount villain. Even I defended that.'
            ],
            take: [
                'Fine, give me the whole fucking table and a shopping bag.',
                'My hand is now a landfill. Thanks, you cardboard vandal.',
                'Take your tiny victory before I remember how this game works.'
            ],
            throw: [
                'One more for you, because apparently I enjoy causing paperwork.',
                'Eat this card too. It looked lonely and slightly malicious.',
                'Extra cardboard, free of charge and full of bad intentions.'
            ],
            pass: [
                'Pass. My brain has left through the emergency exit.',
                'I am done. Somebody competent take over, so none of us.',
                'That is enough accidental violence for one round.'
            ],
            chat: [
                '{target}, I am the rookie and your comeback still needs lessons.',
                'Your mouth has a trump. Your hand has six apologies.',
                'Keep talking shit; it makes my confusion look mysterious.',
                'That message was a fart wearing formal clothes.',
                'I barely know Durak and I still know you are chatting bollocks.'
            ]
        },
        2: {
            attack: [
                'Here comes trouble, freshly shuffled and badly mannered.',
                'Beat this, loudmouth. Preferably before retirement.',
                'A little card with a large desire to ruin your shit.'
            ],
            defend: [
                'Covered. Put your attack back in the bargain bin.',
                'That card talked tough and died under mine.',
                'Nice swing, bozo. Shame about the landing.'
            ],
            take: [
                'I take the pile. You take the smug look and preserve it for later.',
                'Cards acquired, mood ruined, grudge upgraded.',
                'Enjoy the round, you lucky little deck rat.'
            ],
            throw: [
                'One more, because your hand looked almost manageable.',
                'Take this matching bastard and stop smiling.',
                'Your pile is becoming a family-sized humiliation.'
            ],
            pass: [
                'Pass. The defender has suffered enough to become annoying.',
                'I am done. Your hand can continue looking tragic unaided.',
                'Attack over. Somebody hose down the table.'
            ],
            chat: [
                '{target}, all that mouth and still no card worth fearing.',
                'Your comeback arrived late and smelled of bus seats.',
                'Talk your shit. The talon has heard worse from better players.',
                'You type like winning has left your schedule completely open.',
                'That sentence had a destination and still missed it.'
            ]
        },
        3: {
            attack: [
                'No theory. This card is here to kick your door in.',
                'Deal with this before your hand starts a support group.',
                'I picked the card your face begged me not to play.'
            ],
            defend: [
                'Covered. Your attack lasted less than your bullshit.',
                'That card arrived angry and left as furniture.',
                'Defended. Kindly remove the dramatic soundtrack.'
            ],
            take: [
                'I take the cards. You keep the premature victory speech.',
                'This pile hurts less than listening to you celebrate.',
                'Fine, one ugly pickup. Do not build a personality around it.'
            ],
            throw: [
                'Matching rank. Your hand is now a badly run hostel.',
                'Another card for the collection, you greedy bastard.',
                'The pile asked for seconds and I hate saying no.'
            ],
            pass: [
                'Pass. Continuing would make your position less funny.',
                'The defence stands, which is more than I can say for the plan.',
                'I am done. Try not to mistake survival for talent.'
            ],
            chat: [
                '{target}, that roast had timing. Your defence usually does not.',
                'Keep yapping; the cards need unsupervised time to escape.',
                'You sound dangerous until the table enters the shot.',
                'Your mouth attacks beautifully. Your hand keeps pressing take.',
                'Lovely speech. Absolute shitshow of a position.'
            ]
        },
        4: {
            attack: [
                'This card found the weak spot and brought a fucking crowbar.',
                'Forget the masterclass. Beat this or pick up.',
                'Your defence has one clean answer. I bet you find the stupid one.'
            ],
            defend: [
                'Covered. Your grand plan died without next of kin.',
                'No analysis needed. That attack was simply arse.',
                'The cheapest defence still cost less than your pride.'
            ],
            take: [
                'I take the pile because wasting trumps on your nonsense is beneath me.',
                'Temporary pickup, permanent record of your smug face.',
                'Cards join my hand. Revenge joins your calendar.'
            ],
            throw: [
                'Another matching card. Your wrist is filing for divorce.',
                'Take this too; the humiliation looked underfed.',
                'The attack limit is the only adult protecting you.'
            ],
            pass: [
                'Pass. You survived cards, not judgment.',
                'Keep the table. I kept the better punchline.',
                'The defence stands like a drunk garden chair.'
            ],
            chat: [
                '{target}, you talk like a grandmaster and defend like garden furniture.',
                'No spreadsheet today: your message was premium bullshit.',
                'Keep typing, clown. Winning clearly is not keeping you busy.',
                'Your insult was sharp enough to cut the terrible plan attached to it.',
                'You brought a thesis to a street fight and still forgot the cards.'
            ]
        },
        5: {
            attack: [
                'Baba sends one card. Your whole hand starts looking for exits.',
                'No lecture. Beat this fucking card.',
                'Baba picked the attack that makes your smile expensive.',
                'Your hand looked comfortable. Baba has corrected the furniture.'
            ],
            defend: [
                'Covered. Baba expected danger and received community theatre.',
                'Your attack was loud, weak, and now underneath.',
                'Baba needed one card. Your ego apparently needs medical attention.',
                'That attack died exactly as stupidly as it lived.'
            ],
            take: [
                'Baba takes the pile. You take a temporary victory and marry it.',
                'Enjoy this, lucky bastard. Baba remembers addresses.',
                'These cards join Baba. Your confidence joins the missing persons list.',
                'A pickup is not defeat. Your celebration is still embarrassing.'
            ],
            throw: [
                'Baba adds one more. Your hand can start charging rent.',
                'Eat the matching rank, cardboard peasant.',
                'The attack limit protects you from Baba becoming generous.',
                'One more card, because your problem was not ugly enough.'
            ],
            pass: [
                'Baba passes. Continue the clown parade without adult supervision.',
                'The defence lives. Its dignity was not so lucky.',
                'Baba stops because bullying needs rhythm.',
                'Keep the table. Baba already took the room.'
            ],
            chat: [
                '{target}, Baba heard you. The intelligent part missed its train.',
                'Keep talking shit. Baba enjoys subtitles during easy work.',
                'Your mouth holds six trumps. Your hand holds a cry for help.',
                'Baba would debate you, but the defence collapsing is funnier.',
                'That insult had balls. Your gameplay arrived smooth.',
                'Call Baba a bot again. Losing to furniture might hurt more.'
            ]
        }
    };

    Object.entries(DURAK_RUDER_TABLE).forEach(([difficulty, categories]) => {
        Object.entries(categories).forEach(([category, lines]) => LINES[difficulty][category].push(...lines));
    });

    const NERDY_DURAK_TALK = /\b(distribution|expected value|minimum sufficient|profitable continuation|preserve control|public information|strategic pickup)\b/i;
    for (let difficulty = 3; difficulty <= 5; difficulty++) {
        Object.keys(LINES[difficulty]).forEach(category => {
            LINES[difficulty][category] = LINES[difficulty][category].filter(line => !NERDY_DURAK_TALK.test(line));
        });
    }
    LINES[5].attack.unshift('Baba opens the attack. Your hand may begin swearing.');
    const DURAK_CENSORED_CHAT = {
        1: ['That message was s***, and I am the rookie.', 'What the f*** do I know? Still more than that point.'],
        2: ['Cut the b******t and beat the card.', 'Your hand is a** and the talon has witnesses.'],
        3: ['Keep talking; the f***-up reel needs subtitles.', 'That was s*** with surprisingly good punctuation.'],
        4: ['No grand theory: your defence is f***ed.', 'Premium b******t, bargain-bin hand.'],
        5: ['Baba asks one question: what the f***?', 'Your defence is a** wearing expensive perfume.']
    };
    Object.entries(DURAK_CENSORED_CHAT).forEach(([difficulty, lines]) => LINES[difficulty].chat.push(...lines));

    LINES.global.intro.push(
        'Knock knock. Who is there? Durak. One of you answers to it later.',
        'Roses are red, the trump is on show, somebody leaves first and one fool leaves slow.',
        'Six cards each. Try not to build a personality around losing.'
    );
    LINES.global.gameOver.push(
        'Roses are red, the talon is through, {durak} kept the cards and the fool title too.',
        'Knock knock. Who is there? {durak}, carrying every remaining excuse.',
        '{durak}, congratulations: the cards have elected you village clown.'
    );

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
            this.lastHumanChatId = 0;
        }

        start() {
            this.stop();
            this.gameOverCommented = false;
            this.lastHumanChatId = this.engine.state.logs.reduce((latest, log) => Math.max(latest, log.id || 0), 0);
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
            if (this.typingTimers.size) return;
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
            this.queueLine(bot, line);
        }

        queueLine(bot, line) {
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

        respondToHumanChat(state) {
            if (this.typingTimers.size) return;
            const botNames = new Set(state.players.filter(player => player.isBot).map(player => player.name));
            const latest = [...state.logs].reverse().find(log =>
                log.type === 'chat'
                && log.id > this.lastHumanChatId
                && !botNames.has(log.name)
            );
            if (!latest) return;
            this.lastHumanChatId = latest.id;
            const bots = state.players.filter(player => player.isBot && !player.out);
            if (!bots.length) return;
            const mentioned = bots.find(bot =>
                latest.message.toLowerCase().includes(bot.name.toLowerCase().split(' ')[0])
            );
            const responder = mentioned
                || bots.find(bot => bot.botDifficulty === 5)
                || bots.sort((left, right) => right.botDifficulty - left.botDifficulty)[0];
            const profile = PROFILES[responder.botDifficulty] || PROFILES[1];
            if (!mentioned && this.random() > profile.chat) return;
            let line = lineFor(responder.botDifficulty, 'chat', this.random)
                .replaceAll('{target}', latest.name || 'friend');
            const recent = this.recentLines.get(responder.id) || [];
            if (recent.includes(line)) {
                const alternatives = (LINES[responder.botDifficulty]?.chat || [])
                    .map(candidate => candidate.replaceAll('{target}', latest.name || 'friend'))
                    .filter(candidate => !recent.includes(candidate));
                if (alternatives.length) line = alternatives[Math.floor(this.random() * alternatives.length)];
            }
            this.recentLines.set(responder.id, [...recent.slice(-3), line]);
            this.queueLine(responder, line);
        }

        tick() {
            const state = this.engine.state;
            if (state.phase === 'lobby') return;
            this.respondToHumanChat(state);
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
