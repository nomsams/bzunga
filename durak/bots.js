(function (root, factory) {
    const rules = typeof module === 'object' && module.exports
        ? require('./rules.js')
        : root.DurakRules;
    const historicalBots = root.HistoricalBots || (typeof require === 'function' ? require('../historical-bots.js') : null);
    const api = factory(rules, historicalBots);
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.DurakBots = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules, HistoricalBots) {
    'use strict';

    const DISCONNECT_TURN_MS = 10000;

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

    for (let difficulty = 1; difficulty <= 5; difficulty += 1) LINES[difficulty].transfer = [];

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
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
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

    const DURAK_MAXIMUM_SHITTALK = {
        attack: [
            'Here is a card, dickhead. Beat it or start collecting.',
            'This little rectangle has come to ruin your afternoon.',
            'Attack delivered. Complaints go directly up your arse.',
            'Deal with that, you hand-hoarding goblin.',
            'I found the weak spot. It was the entire fucking defence.',
            'Knock knock. Who is there? Pickup. It brought luggage.',
            'Dad joke: why did the card cross the table? Your hand smelled worse.',
            'Roses are red, the trump card is bright, cover this bastard or take it tonight.',
            'That card is cheap. The look on your face is priceless.',
            'I attack with confidence borrowed from your lack of options.',
            'Your turn to defend. Try using the cards instead of your personality.',
            'One card, one problem, one clown staring at both.'
        ],
        defend: [
            'Covered. Put that weak shit back in its coffin.',
            'Your attack is underneath mine where rubbish belongs.',
            'Nice try, knobhead. The card lasted four seconds.',
            'Defended. Your dramatic entrance may leave through the bins.',
            'I beat the card and bruised its stupid little ego.',
            'That attack had teeth drawn on with a crayon.',
            'Sit down. Even my cheapest answer embarrassed you.',
            'Your card came looking for trouble and found adult supervision.',
            'Covered cleanly. I will disinfect the table later.',
            'The attack is dead. Please notify its useless family.',
            'I defended that with less effort than this insult.',
            'Good attack—if the goal was to warm up my hand.'
        ],
        take: [
            'Fine, give me the whole fucking table and a wheelbarrow.',
            'I take the cards. You keep the smug face until further notice.',
            'Lovely pile. Did every bastard bring luggage?',
            'This hand is becoming a card-based hostage situation.',
            'I am picking up, not giving up. Stop touching yourself.',
            'Congratulations. You made my hand look like a Sunday newspaper.',
            'Cards acquired. Grudge upgraded to premium.',
            'Dump it here, goblins. Apparently I run a shelter.',
            'I will carry the pile. You could barely carry the conversation.',
            'Take your tiny win before I fold it into the next round.',
            'This pickup is ugly, but not as ugly as your celebration.',
            'My hand is now thicker than your skull. Impressive work.'
        ],
        throw: [
            'Take another one, you greedy cardboard hoover.',
            'One more card for your fucking collection.',
            'Matching rank. Matching regret. Beautiful.',
            'Your pickup was looking lonely, so I sent it a bastard friend.',
            'Here, hold this while the rest of us laugh.',
            'The hand gets bigger. The dignity gets very, very small.',
            'Special delivery for the table donkey.',
            'Eat this one too. No chewing on the corners.',
            'Another card lands. Your wrist has filed a complaint.',
            'I would send flowers, but another card is funnier.',
            'This rank matched harder than your socks ever have.',
            'Free card! The hidden fee is humiliation.'
        ],
        pass: [
            'Pass. I have bullied this round enough.',
            'I am done. Somebody else annoy the poor bastard.',
            'Pass. Continuing would make your hand less funny.',
            'That is enough. Your defence may crawl home.',
            'I stop here before this becomes charity.',
            'Keep the table. It matches your ugly little mood.',
            'Pass, dickheads. The round has suffered enough.',
            'I am finished. Your relief is loud and pathetic.',
            'No more cards. Enjoy this suspicious little mercy.',
            'The attack ends. Try not to call survival a talent.',
            'Pass. Even bullying needs an interval.',
            'I am out. The clown show continues clockwise.'
        ],
        chat: [
            '{target}, your mouth has six cards and every one is bullshit.',
            'Shut up and defend, you ornamental turnip.',
            'Your comeback arrived wearing clown shoes.',
            'That message was a fart with spellcheck.',
            'Keep talking, wanker. The talon enjoys low-budget theatre.',
            'You call that trash talk? My discard pile has sharper edges.',
            'Dad joke: I told my cards a construction joke. They are still working on it—unlike you.',
            'I only know twenty-five letters. I do not know Y, but I know why you keep picking up.',
            'What do you call a Durak player with a plan? Not {target}.',
            'Knock knock. Who is there? The fool. Check your chair.',
            'Roses are red, the talon is stacked, you keep talking shit and your defence keeps getting cracked.',
            'Your message has more words than your hand has good choices.',
            'You are one pickup away from needing a forklift.',
            'That insult was decent. Shame about the idiot operating it.',
            'Keep barking, card rat. The trump suit is not scared.',
            'Your gameplay is a clogged toilet and chat is the air freshener.'
        ]
    };

    const DURAK_PERSONA_CHAOS = {
        1: {
            attack: [
                'I barely know the rules and this still looks bad for you.',
                'Here goes something stupid. Try not to lose to it.'
            ],
            defend: [
                'I covered it! That is embarrassing for at least one of us.',
                'Even the rookie stopped that damp little attack.'
            ],
            take: [
                'I am taking the pile because apparently my hand has no fire code.',
                'More cards for me. More confidence for you. Both are mistakes.'
            ],
            throw: [
                'I found a matching rank! Hide the good scissors.',
                'Take this too. I may never achieve competence again.'
            ],
            pass: [
                'Pass. My last brain cell needs mouth-to-mouth.',
                'I stop before luck notices I am unsupervised.'
            ],
            chat: [
                '{target}, losing to me should qualify as a medical mystery.',
                'I am the rookie and even I think that was arse.'
            ]
        },
        2: {
            attack: [
                'Pub rules: play the card, insult the defender, blame the beer.',
                'Beat this, loudmouth. The table is getting impatient.'
            ],
            defend: [
                'Covered. Buy your attack a consolation pint.',
                'That card died like it lived: loud and disappointing.'
            ],
            take: [
                'I take the pile and put your name on the receipt.',
                'Fine. One round to you, you lucky little shit.'
            ],
            throw: [
                'Another card. Consider it a pub snack with corners.',
                'Take this matching bastard and wipe that grin.'
            ],
            pass: [
                'Pass. Somebody ring last orders on this mess.',
                'I am done; the defender already looks hungover.'
            ],
            chat: [
                '{target}, your chat is strong lager and your gameplay is warm water.',
                'Pipe down, pub chair. Somebody is trying to lose properly.'
            ]
        },
        3: {
            attack: [
                'No theory. Just a card headed straight for your problem.',
                'I picked this because your face looked too peaceful.'
            ],
            defend: [
                'Covered. Your attack can get in the fucking bin.',
                'Cheap answer, expensive embarrassment.'
            ],
            take: [
                'I will carry the cards. You carry that premature grin.',
                'Pickup now, revenge before the snacks run out.'
            ],
            throw: [
                'Matching card. Maximum annoyance. No lecture required.',
                'One more for the pile, one less for me, bad news for you.'
            ],
            pass: [
                'Pass. The useful damage is already done.',
                'I stop because your defence finally paid rent.'
            ],
            chat: [
                '{target}, your mouth attacks better than your hand.',
                'That message was confident shit, the most common variety.'
            ]
        },
        4: {
            attack: [
                'Forget the masterclass. Beat this fucking card.',
                'Your hand has a sore spot and I brought a thumb.'
            ],
            defend: [
                'Covered. No spreadsheet, just you being wrong.',
                'Your attack is now a decorative coaster.'
            ],
            take: [
                'I take the pile because that trump is not dying for your nonsense.',
                'Temporary pickup. Permanent note that you got smug.'
            ],
            throw: [
                'One more card. Your problem needed a stupid hat.',
                'The attack limit is the only adult protecting you.'
            ],
            pass: [
                'Pass. I just buried your good card; digging is forbidden.',
                'Stop here. Your expensive defence stays dead.'
            ],
            chat: [
                '{target}, you sound clever until the cards come into frame.',
                'No grand theory: your comeback was fucking useless.'
            ]
        },
        5: {
            attack: [
                'Baba plays one card. Your entire hand starts sweating.',
                'No sermon from Baba. Beat it or pick up, dickhead.'
            ],
            defend: [
                'Baba covers the attack and leaves the corpse visible.',
                'Your card is underneath. Your ego may join it.'
            ],
            take: [
                'Baba takes the pile. You take the wrong lesson from it.',
                'Enjoy the pickup, lucky bastard. Baba keeps receipts and grudges.'
            ],
            throw: [
                'Baba adds one more. Your wrist may swear freely.',
                'Matching rank, peasant. Hold it with both trembling hands.'
            ],
            pass: [
                'Baba stops. Your best trump can rot in the discard.',
                'Pass. Baba has already removed the card that mattered.'
            ],
            chat: [
                '{target}, Baba has heard smarter noises from a dropped saucepan.',
                'Keep talking, fuckwit. Baba enjoys easy games with commentary.'
            ]
        }
    };

    for (let difficulty = 1; difficulty <= 5; difficulty++) {
        Object.entries(DURAK_MAXIMUM_SHITTALK).forEach(([category, lines]) => LINES[difficulty][category].push(...lines));
        Object.entries(DURAK_PERSONA_CHAOS[difficulty]).forEach(([category, lines]) => LINES[difficulty][category].push(...lines));
    }

    const DURAK_LECTURE_TALK = /\b(distribution|expected value|minimum sufficient|profitable continuation|preserve control|public information|strategic pickup|tempo|calculation|calculated|information|accounting|position|horizon|legally binding|paperwork|efficient|structure)\b/i;
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
        Object.keys(LINES[difficulty]).forEach(category => {
            const filtered = LINES[difficulty][category].filter(line => !DURAK_LECTURE_TALK.test(line));
            if (filtered.length) LINES[difficulty][category] = [...new Set(filtered)];
        });
    }

    const DURAK_SHORT_TABLE_TALK = {
        attack: ['Oh shit. Your turn.', "Didn't expect that?", 'Beat this, clown.', 'Card down. Deal with it.'],
        defend: ['Not today, bastard.', 'Covered. Sit down.', 'Nice try, deck goblin.', 'That attack is dead.'],
        take: ['Fine. Give me the damn pile.', 'Oh shit. I take.', 'Happy now, asshole?', 'Cards up. Grudge saved.'],
        throw: ['One more, dickhead.', 'Eat this one too.', 'Your hand looked lonely.', 'Special delivery, clown.'],
        pass: ['Pass. Keep the mess.', 'I am done here.', 'Not worth another card.', 'Carry on, you animals.'],
        transfer: ['Not my problem now.', 'Same rank. Next victim.', 'Catch this mess, mate.', 'Passing the bastard clockwise.'],
        chat: ['Yo mama shuffles better.', 'Yo mama wants your trumps.', '{target}, that was dogshit.', 'Talk less. Defend better.']
    };
    const DURAK_SHORT_BABA = {
        attack: ['Baba says beat this.', 'Baba found your weak spot.'],
        defend: ['Baba says not today.', 'Covered. Baba barely noticed.'],
        take: ['Baba takes. Do not celebrate.', 'Fine. Baba keeps the grudge.'],
        throw: ['Baba adds one more.', 'Eat this too, peasant.'],
        pass: ['Baba passes. Keep dancing.', 'Baba is done. Carry on.'],
        transfer: ['Baba passes the pain.', 'Same rank. Next clown.'],
        chat: ['Baba heard enough, {target}.', 'Yo mama deals faster than you.', 'Yo mama saves trumps better than your dumb ass.', '{target}, shut the fuck up and find a defence.', 'Your hand is shit with sleeves, mate.', 'Yo mama transfers trouble faster than you.', 'Baba heard that comeback die halfway out.', 'You defend like a shopping trolley with one bad wheel.']
    };
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
        for (const [category, lines] of Object.entries(DURAK_SHORT_TABLE_TALK)) {
            for (const line of lines) {
                if (!LINES[difficulty][category].includes(line)) LINES[difficulty][category].push(line);
            }
        }
    }
    for (const [category, lines] of Object.entries(DURAK_SHORT_BABA)) LINES[5][category].push(...lines);

    const DURAK_OLD_MATES = {
        attack: [
            'Here you go, mate. One card with your name on it.',
            'Beat this, dickhead. Friendship resumes after defence.',
            'A little bastard of a card for a big bastard of a mate.',
            'I know that face. You hate this rank already.',
            'Card down. Try the clever thing you pretend to know.',
            'Sorry, mate. The game demanded violence.',
            'This one is from the heart and headed for your hand.',
            'Nothing personal, prick. It is just extremely personal.',
            'I saved this ugly thing for my favourite opponent.',
            'Go on then. Show us that famous drunk defence.'
        ],
        defend: [
            'Covered, mate. Lovely attack, wrong bloody victim.',
            'That was a good card. Mine was a better bastard.',
            'Not today, dickhead. Buy the attack a consolation pint.',
            'Clean cover. Even you have to respect that one.',
            'Your attack nearly had me. Nearly is doing heavy work.',
            'Sit down, mate. The card fought bravely.',
            'I hate to say it, but that attack was properly sneaky.',
            'Covered. Good try, you annoying bastard.',
            'Bloody nice attack. Shame about this answer.',
            'Your card deserved better than dying under mine.'
        ],
        take: [
            'Fine, mate. You got me. Do not become unbearable.',
            'I take the pile. That was filthy and annoyingly good.',
            'Cards for me, smug grin for you, drinks later.',
            'Fair play, bastard. My hand is now a phone book.',
            'Give them here. Friendship is paused for one round.',
            'You earned that pickup. I hate how clean it was.',
            'All right, dickhead. Enjoy your tiny golden moment.',
            'I will take them and remember every ugly little face.',
            'Pile accepted. Grudge accepted. Mate still questionable.',
            'Good pressure, mate. Now stop grinning before I throw up.'
        ],
        throw: [
            'One more for you, mate. I am generous when drunk.',
            'Take this too, dickhead. It missed the family.',
            'Matching rank. Your hand can start a group chat.',
            'Special delivery from somebody who cares far too little.',
            'Another bastard lands. Hold it gently.',
            'Your pile looked thirsty, so I bought it a mate.',
            'Sorry, old friend. Actually, no, this is hilarious.',
            'One more card and one less reason to like me.',
            'Eat this too. Compliments from the kitchen.',
            'Your wrist needed exercise. I am here to help.'
        ],
        pass: [
            'Pass, mate. You defended that bloody well.',
            'I am done. Fair play, you stubborn bastard.',
            'That is enough abuse for one round and one friendship.',
            'Pass. Buy yourself a pint for surviving that mess.',
            'I stop here. Your defence earned a rare compliment.',
            'Carry on, dickheads. This mate survived.',
            'No more. I like you too much to fill both hands.',
            'Pass, you prick. That cover was annoyingly tidy.',
            'Round over. Somebody congratulate the lucky bastard.',
            'Fine defence, mate. I will deny saying that later.'
        ],
        chat: [
            '{target}, you gobshite, your hand is not a personality.',
            'Love you, mate. Hate every card you have touched.',
            'Good one, dickhead. Your defence is still wearing slippers.',
            'You smug prick, I can hear the grin from here.',
            'That roast was class. The attack remains complete shit.',
            'Old friends tell the truth: you defend like a garden chair.',
            'Mate, your plan has had six beers and lost its wallet.',
            'Keep talking. The talon enjoys our little family argument.',
            'Fair play on that last cover. Proper annoying stuff.',
            'You bastard, that attack came from fucking nowhere.',
            'I would buy you a pint for that move. A small one.',
            'Your chat is excellent. Your cards need counselling.',
            'Same old you: loud mouth, sneaky card, stupid grin.',
            'Bloody hell, mate. That was actually good.',
            'Pipe down, wanker. We already know you got lucky.',
            'Nice move, arsehole. Do not make it a habit.'
        ]
    };
    const DURAK_OLD_MATES_BABA = {
        attack: [
            'Baba sends this with love and several bad intentions.',
            'Beat it, mate. Baba still likes you a little.',
            'A card for Baba’s favourite loudmouth.',
            'Baba attacks. Drinks and apologies come later.',
            'Here, dickhead. Baba saved the ugly one for you.',
            'Nothing personal. Baba simply enjoys your panic.'
        ],
        defend: [
            'Covered, mate. Fine attack, better Baba.',
            'Baba admits that was sneaky. Still dead, though.',
            'Nice card, dickhead. Baba brought a nicer bastard.',
            'Clean cover. Baba accepts one second of admiration.',
            'Good try, old friend. Baba nearly moved both eyebrows.',
            'Your attack had balls. Baba had the answer.'
        ],
        take: [
            'Baba takes. Fair play, mate. Do not milk it.',
            'You got Baba, lucky prick. Drinks are briefly on you.',
            'Fine pressure. Baba hates it and respects it.',
            'Pile accepted. Friendship survives. Grudge grows.',
            'Good attack, bastard. Baba will remember the address.',
            'Baba picks up. Stop grinning before it becomes permanent.'
        ],
        throw: [
            'Baba adds one more for his favourite collector.',
            'Hold this too, mate. Baba believes in your wrist.',
            'Another card. Baba calls this aggressive friendship.',
            'Matching rank, dickhead. Family reunion in your hand.',
            'Baba sends company. Your pile looked lonely.',
            'Eat this too. Baba seasoned it with affection.'
        ],
        pass: [
            'Baba passes. Fine defence, you stubborn bastard.',
            'Enough. Baba respects that cover and hates admitting it.',
            'Pass, mate. Buy yourself one small victory pint.',
            'Baba stops. Friendship has prevented a worse beating.',
            'Good defence. Baba will deny this compliment tomorrow.',
            'Carry on, dickheads. Baba needs a drink.'
        ],
        chat: [
            '{target}, Baba likes you. Your hand remains dogshit.',
            'You smug bastard, Baba saw that grin before the card.',
            'Good roast, mate. Baba nearly respected the whole person.',
            'Old friends deserve truth: your defence is fucked.',
            'Bloody nice move earlier. Baba has already forgiven himself.',
            'Baba missed this nonsense, you unbearable prick.',
            'Talk your shit, mate. Baba brought enough for two.',
            'That was class, dickhead. Baba still plans revenge.',
            'You bastard. That attack actually surprised Baba.',
            'Baba would buy you a pint, but you would spill it.'
        ]
    };
    const addDurakLines = (difficulty, additions) => {
        for (const [category, lines] of Object.entries(additions)) {
            for (const line of lines) {
                if (!LINES[difficulty][category].includes(line)) LINES[difficulty][category].push(line);
            }
        }
    };
    for (let difficulty = 1; difficulty <= 5; difficulty++) addDurakLines(difficulty, DURAK_OLD_MATES);
    addDurakLines(5, DURAK_OLD_MATES_BABA);

    const DURAK_UNFILTERED = {
        attack: [
            'Beat this, fuckwit. The card has waited long enough.',
            'Here comes trouble, wearing your least favourite rank.',
            'One card for you and one middle finger from the table.',
            'Defend that, dickhead. Try using the front of the cards.',
            'This attack is cheap. Your panic is fucking priceless.',
            'Card down. Let us watch your hand shit itself.',
            'I found the sore spot and brought a fucking hammer.',
            'Your defence looked bored. I sent it a bastard.'
        ],
        defend: [
            'Covered, prick. That attack died embarrassingly sober.',
            'Your card is underneath mine where dogshit belongs.',
            'Not today, fuckface. Try a card with adult supervision.',
            'That attack got folded, buried, and forgotten.',
            'Clean cover. Your card can fuck off to the discard.',
            'I beat that with the cheapest bastard I could find.',
            'Your attack had a pulse until I fucking touched it.',
            'Sit down, dickhead. Even the trump suit laughed.'
        ],
        take: [
            'Fine. Give me the fucking library and a wheelbarrow.',
            'I take the cards. You take that grin and choke on it.',
            'Lovely pile, bastards. Did every card pack luggage?',
            'My hand is now a landfill with excellent suit variety.',
            'I pick up. Celebrate before the fucking revenge starts.',
            'Cards acquired. Patience sold separately and now exhausted.',
            'Shove them here, pricks. Apparently I run storage.',
            'This pickup is ugly. Your victory dance is fucking uglier.'
        ],
        throw: [
            'Take another one, you greedy cardboard bastard.',
            'Matching rank. Matching misery. Fucking beautiful.',
            'Here, hold this while your wrist files for divorce.',
            'One more card for the human-shaped storage cupboard.',
            'Eat this too, dickhead. Corners first.',
            'Another card lands and your hand develops gravity.',
            'Special delivery. Signature requires one sad little face.',
            'Your pile wanted company. I sent the loud bastard.'
        ],
        pass: [
            'Pass, fuckers. This round has suffered enough.',
            'I am done. Somebody else kick the poor bastard.',
            'No more cards. Enjoy the suspicious fucking mercy.',
            'Pass. Your relief is louder than your actual talent.',
            'I stop here before your hand needs building insurance.',
            'That is enough. The clown car continues clockwise.',
            'Keep the table, prick. It matches your ugly mood.',
            'Pass. Even bullying has standards and a lunch break.'
        ],
        chat: [
            '{target}, you absolute shitgibbon, defend the card.',
            'Your mouth attacks harder than that useless fucking hand.',
            'Shut it, dickhead. The talon has heard enough.',
            'That message was a fart wearing punctuation.',
            'You play Durak like the fool title has prize money.',
            'Keep barking, prick. Trumps do not fear loud idiots.',
            'Your comeback needs a tow truck and a fucking exorcist.',
            'Yo mama keeps her trumps longer than you.',
            'Yo mama covered that attack from the other room.',
            'Yo mama called. She wants the fool title left outside.',
            'Your hand is fat and your excuses are fucking obese.',
            'You could lose a card fight against an empty sleeve.',
            'That roast was decent. The player remains dogshit.',
            'All mouth, six cards, no clue which way is clockwise.'
        ]
    };
    const DURAK_UNFILTERED_BABA = {
        attack: [
            'Baba attacks. Beat it or collect, fuckwit.',
            'One card from Baba, six new concerns for you.',
            'Here, dickhead. Baba found the crack in your hand.',
            'Baba sends a card and hears your confidence shit itself.',
            'Defend this. Baba has drinks waiting.'
        ],
        defend: [
            'Covered, prick. Baba barely moved his good hand.',
            'Your attack is dead underneath Baba’s cheapest answer.',
            'Not today, fuckface. Baba brought the correct bastard.',
            'Clean cover. Baba will invoice your embarrassed card.',
            'Your card came for war and found Baba having tea.'
        ],
        take: [
            'Baba takes the pile. Wipe that fucking grin carefully.',
            'Fine, prick. Baba collects cards and future revenge.',
            'Pile accepted. Your tiny victory expires shortly.',
            'Baba picks up. The wrong lesson is already on your face.',
            'Enjoy this, dickhead. Baba remembers everything public.'
        ],
        throw: [
            'Baba adds another. Your wrist may start swearing.',
            'Take this too, cardboard-hoarding fuckwit.',
            'Matching rank. Baba sends the bastard home to you.',
            'One more card from Baba’s bottomless generosity.',
            'Your hand looked lonely. Baba fixed it violently.'
        ],
        pass: [
            'Baba passes. Keep the fucking circus moving.',
            'Enough. Your hand is ugly at the correct size.',
            'No more cards. Baba has buried what mattered.',
            'Pass, dickheads. Baba requires tea and better opposition.',
            'Baba stops before the attack becomes charitable.'
        ],
        chat: [
            '{target}, Baba has heard smarter farts from a sofa.',
            'Shut the fuck up and defend, mate.',
            'Your comeback is shit wearing a tiny fur hat.',
            'Baba likes the banter. The player needs replacing.',
            'Keep talking, prick. Baba enjoys easy work with subtitles.',
            'Yo mama saves trumps. Baba respects her game.',
            'That roast landed. Your defence remains fucking airborne.',
            'You play like the fool title pays a pension.'
        ]
    };
    const DURAK_PUB_ONE_LINERS = {
        attack: [
            'Cover this, you magnificent idiot.',
            'A little card with a massive fuck-you attached.',
            'Here, mate. Your relaxing evening was getting suspicious.',
            'Attack delivered. Panic may begin whenever ready.',
            'This card has travelled specifically to annoy you.',
            'Beat that or wear the pile like a winter coat.',
            'Your defence requested something easy. Request denied.',
            'Card down. Let us hear your hand make excuses.'
        ],
        defend: [
            'Fair cover, bastard. Annoyingly well done.',
            'Covered. Your brave little card died for fuck-all.',
            'That defence folded your attack like a pub napkin.',
            'Nope. Put that nonsense back in the bin.',
            'Covered, mate. I barely interrupted my disappointment.',
            'Your attack met a card with adult supervision.',
            'Nice try. The discard pile sends its regards.',
            'Defended. Kindly remove that grin from the premises.'
        ],
        take: [
            'Take the pile. It matches your emotional baggage.',
            'Fine. I collect cardboard and deeply personal grudges.',
            'My hand needed more clutter and fewer fucking options.',
            'I take. Please keep the victory dance medically brief.',
            'Lovely. My hand now needs its own postcode.',
            'Pile accepted. Revenge has entered the building.',
            'Give them here. Apparently I am the card orphanage.',
            'I take it, you smug little coat rack.'
        ],
        throw: [
            'One more card for your travelling circus.',
            'Same rank, fresh misery, no refunds.',
            'Your hand looked lonely. Here is another bastard.',
            'Catch, dickhead. The pile brought a friend.',
            'Another card? Absolutely. I am generous when cruel.',
            'This one also wants to live in your enormous hand.',
            'Special delivery from the department of fuck you.',
            'Hold this while your evening gets heavier.'
        ],
        pass: [
            'Pass. I have done enough damage to the friendship.',
            'I am done. Even cruelty needs a drinks break.',
            'Pass, mate. Your hand is ugly enough already.',
            'No more. I want your panic fresh for next round.',
            'That is me done, you overstuffed card wardrobe.',
            'Pass. The fool hat is already warming up nicely.',
            'I stop. Someone else may ruin your fucking evening.',
            'Mercy granted by administrative accident.'
        ],
        transfer: [
            'Same rank. Same mess. New victim.',
            'Transfer accepted. Fuck you, clockwise.',
            'The attack came back. Even the card hates you.',
            'Not my circus anymore. Defend it, neighbour.',
            'Return to sender, then forwarded to a dickhead.',
            'I match it and pass the headache along.',
            'Surprise. The problem has changed chairs.',
            'Same card, new address, absolutely no sympathy.'
        ],
        chat: [
            '{target}, your trumps are hiding from your decisions.',
            'The fool hat is warming up for you.',
            'Yo mama keeps trumps until they actually matter.',
            'Yo mama defended that from the car park.',
            'Your hand has more cards than your plan has ideas.',
            'Nice cover, prick. Do not make me compliment you twice.',
            'You play like pickup is a loyalty programme.',
            'Your comeback arrived face down and soaking wet.',
            'Mate, the talon is not your personal shopping basket.',
            'That move was three pints past sensible.',
            'Good play, bastard. Friendship temporarily suspended.',
            'Your cards need a better legal guardian.'
        ]
    };
    const DURAK_PUB_BABA = {
        attack: [
            'Baba sends one card and several personal problems.',
            'Cover this, mate. Baba believes in difficult childhoods.',
            'Baba attacks. Your evening has been downgraded.'
        ],
        defend: [
            'Baba covers it. Your attack may collect its tiny coffin.',
            'Not today, prick. Baba kept the receipt.',
            'Clean defence. Baba accepts one irritated grunt.'
        ],
        take: [
            'Baba takes the cards and writes your name on revenge.',
            'Fine, dickhead. Baba needed a heavier drink anyway.',
            'Pile accepted. Baba stores grudges alphabetically.'
        ],
        throw: [
            'Baba adds another because your wrist looked comfortable.',
            'One more from Baba, you human card cupboard.',
            'Take this too. Baba believes in terrible abundance.'
        ],
        pass: [
            'Baba passes. The friendship has suffered enough.',
            'No more, mate. Baba saves cruelty for dessert.',
            'Baba stops. Your hand already needs planning permission.'
        ],
        transfer: [
            'Baba matches it. Defend your own fucking neighbourhood.',
            'Same rank, new victim. Baba loves public transport.',
            'Baba forwards the problem with no return address.'
        ],
        chat: [
            'Baba likes you. Your Durak skills can get fucked.',
            'Yo mama asked Baba why you waste the good trumps.',
            'Your defence has the backbone of warm pudding.',
            'Good cover, bastard. Baba nearly spilled the tea.',
            'Baba has heard scarier threats from a broken kettle.',
            '{target}, your hand is a skip with sleeves.'
        ]
    };
    for (let difficulty = 1; difficulty <= 5; difficulty++) addDurakLines(difficulty, DURAK_UNFILTERED);
    for (let difficulty = 1; difficulty <= 5; difficulty++) addDurakLines(difficulty, DURAK_PUB_ONE_LINERS);
    addDurakLines(5, DURAK_UNFILTERED_BABA);
    addDurakLines(5, DURAK_PUB_BABA);
    Object.assign(PROFILES[1], { chat: 0.86 });
    Object.assign(PROFILES[2], { chat: 0.84 });
    Object.assign(PROFILES[3], { chat: 0.82 });
    Object.assign(PROFILES[4], { chat: 0.9 });
    Object.assign(PROFILES[5], { chat: 0.98 });

    LINES.global.intro.push(
        'Knock knock. Who is there? Durak. One of you answers to it later.',
        'Roses are red, the trump is on show, somebody leaves first and one fool leaves slow.',
        'Six cards each. Try not to build a personality around losing.',
        'Welcome to Durak, dickheads. One of you keeps the cards and the shame.',
        'Dad joke: why are playing cards good drivers? They always deal with traffic. Unlike you lot.'
    );
    LINES.global.gameOver.push(
        'Roses are red, the talon is through, {durak} kept the cards and the fool title too.',
        'Knock knock. Who is there? {durak}, carrying every remaining excuse.',
        '{durak}, congratulations: the cards have elected you village clown.',
        '{durak} is the fool. Everybody point politely, then impolitely.',
        'Game over. {durak} keeps the cards, the title, and the shitty little memories.'
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

    function nextAvailableAfter(view, playerId) {
        const players = view.players || [];
        const start = players.findIndex(player => player.id === playerId);
        if (start < 0) return null;
        for (let offset = 1; offset < players.length; offset += 1) {
            const candidate = players[(start + offset) % players.length];
            if (!candidate.out && (candidate.isBot || candidate.connected !== false)) return candidate;
        }
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
        const talonOpen = Number(view.talonCount || 0) > 0;
        const nonTrumpCards = legal.filter(card => card.suit !== view.trumpSuit);
        let candidates = legal;

        // While cards still refill from the talon, never donate a trump to a
        // defender who has already decided to pick up if a plain card can go.
        if (pickup && talonOpen && nonTrumpCards.length) candidates = nonTrumpCards;
        if (pickup && talonOpen && !nonTrumpCards.length && difficulty >= 3) return null;

        const scored = candidates.map(card => {
            const trump = card.suit === view.trumpSuit;
            let score = Rules.rankValue(card);
            if (!pickup) {
                score -= (rankCounts[card.rank] - 1) * (difficulty >= 3 ? 3.2 : 1.2);
                if (trump) {
                    score += talonOpen
                        ? (difficulty >= 4 ? 38 : difficulty >= 3 ? 28 : 12)
                        : (difficulty >= 3 ? 1.5 : 4);
                }
            } else {
                score = -Rules.rankValue(card);
                // With no talon left, a pickup is a legitimate chance to shed
                // an otherwise sticky trump. Before then, trumps stay home.
                if (trump) score += talonOpen ? 30 : -8;
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
        if (Number(view.talonCount || 0) <= 0 || !trumpSacrifice) return false;

        const trumpCount = me.hand.filter(card => card.suit === view.trumpSuit).length;
        const expensiveTrump = Rules.rankValue(cheapest) >= Rules.rankValue('J');
        if (difficulty >= 5 && tableCards <= 2 && (trumpCount <= 2 || expensiveTrump) && me.hand.length <= 7) return true;
        if (difficulty >= 4 && tableCards <= 2 && trumpCount <= 1 && me.hand.length <= 6) return true;
        if (difficulty >= 3 && tableCards === 1 && trumpCount === 1 && Rules.rankValue(cheapest) >= Rules.rankValue('K')) return true;
        return false;
    }

    function shouldBankDefenderSpend(view, me, legal, difficulty) {
        if (view.phase !== 'attack' || view.battle.length === 0 || difficulty < 3) return false;
        const defender = view.players.find(player => player.id === view.defenderId);
        if (Number(view.talonCount || 0) === 0 && Number(defender?.handCount || 0) === 0) return false;

        const defendedPairs = view.battle.filter(pair => pair.defenseCard);
        const trumpDefense = defendedPairs.some(pair => pair.defenseCard.suit === view.trumpSuit);
        const trumpBurn = defendedPairs.some(pair =>
            pair.defenseCard.suit === view.trumpSuit
            && pair.attackCard.suit !== view.trumpSuit
        );
        const premiumCardBurn = defendedPairs.some(pair =>
            Rules.rankValue(pair.defenseCard) >= Rules.rankValue('K')
        );
        if (!trumpDefense && !premiumCardBurn) return false;

        const cheapPlainContinuation = legal.some(card =>
            card.suit !== view.trumpSuit
            && Rules.rankValue(card) <= Rules.rankValue('10')
        );
        const talonOpen = Number(view.talonCount || 0) > 0;

        // Lock valuable defending cards into the discard instead of risking a
        // pickup that returns them to the defender. Baba does this reliably;
        // lower expert levels require a clearly expensive continuation.
        if (difficulty >= 5 && trumpDefense && talonOpen) return true;
        if (difficulty >= 5 && (trumpDefense || premiumCardBurn) && !cheapPlainContinuation) return true;
        if (difficulty >= 4 && trumpBurn && talonOpen && !cheapPlainContinuation) return true;
        return difficulty >= 3
            && defendedPairs.filter(pair =>
                pair.defenseCard.suit === view.trumpSuit
                || Rules.rankValue(pair.defenseCard) >= Rules.rankValue('K')
            ).length >= 2
            && !cheapPlainContinuation;
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
            if (view.durakMode === 'transfer') {
                const nextDefender = nextAvailableAfter(view, botId);
                const transfers = Rules.getLegalTransferCards(
                    me.hand,
                    view.battle,
                    nextDefender?.handCount,
                    view.roundNumber,
                    6
                );
                if (transfers.length) {
                    const talonOpen = Number(view.talonCount || 0) > 0;
                    const plain = transfers.filter(card => card.suit !== view.trumpSuit);
                    const candidates = plain.length ? plain : transfers;
                    const transferCard = [...candidates].sort((left, right) =>
                        Rules.cardStrength(left, view.trumpSuit) - Rules.cardStrength(right, view.trumpSuit)
                    )[0];
                    const cheapDefense = chooseLowestDefense(legal, view.trumpSuit);
                    const targetUnderPressure = Number(nextDefender?.handCount || 0) <= view.battle.length + 2;
                    const avoidsTrumpDefense = cheapDefense?.suit === view.trumpSuit && pair.attackCard.suit !== view.trumpSuit;
                    const expertTransfer = difficulty >= 5 && (
                        plain.length
                        || !talonOpen
                        || !legal.length
                        || avoidsTrumpDefense
                        || targetUnderPressure
                    );
                    const strongTransfer = difficulty === 4 && (
                        (plain.length && (targetUnderPressure || avoidsTrumpDefense))
                        || (!talonOpen && transferCard)
                    );
                    const opportunisticTransfer = difficulty === 3 && plain.length && random() < 0.64;
                    const casualTransfer = difficulty <= 2 && random() < (difficulty === 2 ? 0.42 : 0.24);
                    if (transferCard && (expertTransfer || strongTransfer || opportunisticTransfer || casualTransfer)) {
                        return { type: 'TRANSFER', cardId: transferCard.id };
                    }
                }
            }
            if (shouldTake(view, me, legal, difficulty)) return { type: 'TAKE_CARDS' };
            let card = chooseLowestDefense(legal, view.trumpSuit);
            if (profile.error > 0 && legal.length > 1 && random() < profile.error) {
                const safeErrors = Number(view.talonCount || 0) > 0 && difficulty >= 3
                    ? legal.filter(candidate => candidate.suit !== view.trumpSuit)
                    : legal;
                const errorPool = safeErrors.length ? safeErrors : legal;
                card = errorPool[Math.floor(random() * errorPool.length)];
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
            const earlyTrumpOnlyContinuation = view.phase === 'attack'
                && view.battle.length > 0
                && Number(view.talonCount || 0) > 0
                && difficulty >= 3
                && legal.every(card => card.suit === view.trumpSuit);
            const casualPass = view.battle.length > 0 && random() < profile.error * 0.42;
            const bankDefenderSpend = shouldBankDefenderSpend(view, me, legal, difficulty);
            if (pressureIsPoor || earlyTrumpOnlyContinuation || bankDefenderSpend || casualPass) {
                return { type: 'PASS_ATTACK' };
            }
            const card = chooseAttackCard(view, me, legal, difficulty, random);
            return card ? { type: 'ATTACK', cardId: card.id } : { type: 'PASS_ATTACK' };
        }
        return null;
    }

    function lineFor(difficulty, category, random = Math.random, context = {}, historicalPersona = null) {
        const historicalLines = HistoricalBots?.linesFor(historicalPersona, category) || [];
        const bank = historicalLines.length
            ? historicalLines
            : (LINES[difficulty]?.[category] || LINES[2][category] || []);
        if (!bank.length) return '';
        const concise = bank.filter(line => line.length <= 68);
        const choices = concise.length ? concise : bank;
        return choices[Math.floor(random() * choices.length)]
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
            this.waitingReadyAt = 0;
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
            this.waitingReadyAt = 0;
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
            let line = lineFor(bot.botDifficulty, category, this.random, {}, bot.historicalPersona);
            const recent = this.recentLines.get(bot.id) || [];
            if (recent.includes(line)) {
                const historicalAlternatives = HistoricalBots?.linesFor(bot.historicalPersona, category) || [];
                const alternatives = (historicalAlternatives.length
                    ? historicalAlternatives
                    : (LINES[bot.botDifficulty]?.[category] || []))
                    .filter(candidate => candidate.length <= 68 && !recent.includes(candidate));
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
            let line = lineFor(responder.botDifficulty, 'chat', this.random, {}, responder.historicalPersona)
                .replaceAll('{target}', latest.name || 'friend');
            const recent = this.recentLines.get(responder.id) || [];
            if (recent.includes(line)) {
                const historicalAlternatives = HistoricalBots?.linesFor(responder.historicalPersona, 'chat') || [];
                const alternatives = (historicalAlternatives.length
                    ? historicalAlternatives
                    : (LINES[responder.botDifficulty]?.chat || []))
                    .map(candidate => candidate.replaceAll('{target}', latest.name || 'friend'))
                    .filter(candidate => candidate.length <= 68 && !recent.includes(candidate));
                if (alternatives.length) line = alternatives[Math.floor(this.random() * alternatives.length)];
            }
            this.recentLines.set(responder.id, [...recent.slice(-3), line]);
            this.queueLine(responder, line);
        }

        tick() {
            const state = this.engine.state;
            if (state.phase === 'lobby') return;
            this.respondToHumanChat(state);
            if (state.phase === 'waiting') {
                if (!this.waitingReadyAt) this.waitingReadyAt = this.now() + DISCONNECT_TURN_MS;
                if (this.now() < this.waitingReadyAt) return;
                this.waitingReadyAt = 0;
                this.engine.resumeWaitingRound();
                this.onStateChange();
                return;
            }
            this.waitingReadyAt = 0;
            if (state.phase === 'game_over') {
                if (this.gameOverCommented) return;
                this.gameOverCommented = true;
                const bot = state.players.find(player => player.isBot && !player.out)
                    || state.players.find(player => player.isBot);
                if (bot) {
                    const durak = state.players.find(player => player.id === state.durakId)?.name || 'nobody';
                    const historicalLines = HistoricalBots?.linesFor(bot.historicalPersona, bot.id === state.durakId ? 'defeat' : 'victory') || [];
                    const bank = historicalLines.length ? historicalLines : LINES.global.gameOver;
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
                : action.type === 'TRANSFER'
                ? 'transfer'
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
        DISCONNECT_TURN_MS,
        DurakBotController
    };
});
