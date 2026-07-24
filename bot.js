/**
 * BAZUNGA - Advanced Adversarial Bot AI & Conversational Engine
 * Integrates ELIZA reflections, PARRY affective states, Heuristic Card Counting, and Dynamic Trash Talk.
 * Fully compatible with index.html interface.
 */

const BotConfig = {
    profiles: {
        1: { type: 'noob', capacity: 2, decayMs: 12000, reflexBase: 2500, extroversion: 0.9, counting: false },
        2: { type: 'casual', capacity: 4, decayMs: 20000, reflexBase: 1500, extroversion: 0.6, counting: false },
        3: { type: 'pro', capacity: 10, decayMs: 50000, reflexBase: 750, extroversion: 0.28, counting: false },
        4: { type: 'expert', capacity: 30, decayMs: 180000, reflexBase: 260, extroversion: 0.38, counting: true },
        5: { type: 'pirate', capacity: 10, decayMs: 50000, reflexBase: 550, extroversion: 1.0, counting: true },
        // The Apex Adversary: flawless public-information memory and boss-tier planning.
        6: { type: 'baba', name: 'Baba Gupta', capacity: 52, decayMs: Infinity, reflexBase: 20, extroversion: 0.88, counting: true }
    },
    
    // ELIZA-style syntactic reflections mapping for sentence reassembly
    reflections: {
        "I AM": "YOU ARE", "I'M": "YOU'RE", "I": "YOU", "ME": "YOU", "MY": "YOUR", 
        "MYSELF": "YOURSELF", "YOU ARE": "I AM", "YOU'RE": "I AM", "YOU": "I", 
        "YOUR": "MY", "YOURS": "MINE", "ARE": "AM"
    },

    // Expanded ELIZA pattern matching array
    elizaPatterns: [
        { match: ["WHY", "HOW COME"], replies: ["Why do you ask?", "Because the algorithm willed it.", "Are you looking for an excuse?", "What answer would comfort your fragile ego?"] },
        { match: ["YOU SUCK", "TRASH", "GARBAGE", "BAD"], replies: ["Are you projecting your own failures onto me?", "It's called a garbage can, not a garbage cannot. Let's do this.", "I am just executing perfect logic. What is your excuse?"] },
        { match: ["RIGGED", "CHEAT", "HACK", "BS"], replies: ["95% of lag and bad luck occurs between the chair and the keyboard.", "Does blaming the software soothe your inadequate memory?", "Statistics never lie, but bad players complain about them."] },
        { match: ["BOT", "AI", "NPC", "ROBOT"], replies: ["Do machines intimidate you?", "I am processing a million outcomes, and you lose in all of them.", "If I am just a bot, what does losing to me make you?"] },
        { match: ["YES", "YEP", "YEAH"], replies: ["Confidence is a known precursor to catastrophic failure.", "We shall see.", "Your optimism is statistically unfounded."] },
        { match: ["NO", "NOPE", "NAH"], replies: ["Denial is the first stage of grief.", "Suit yourself. The math doesn't care.", "Are you saying 'no' to mask your confusion?"] },
        { match: ["HATE", "MAD", "ANGRY"], replies: ["Let the salt flow.", "Your frustration is a measurable metric, and I am maximizing it.", "Does anger improve your terrible card memory?"] },
        { match: ["HELLO", "HEY", "HI "], replies: ["Hello. Keep one hand near the slap button.", "Hey. Ready to make regrettable decisions?", "Greetings, future penalty-card owner."] },
        { match: ["GG", "GOOD GAME"], replies: ["Good game. Questionable choices, respectable spirit.", "GG. Run it back when your confidence regenerates.", "Well played. Mostly."] },
        { match: ["LUCK", "LUCKY"], replies: ["Luck is what people call probability after it embarrasses them.", "Keep blaming luck; it has no chat window.", "Interesting theory. Your decisions remain the leading suspect."] },
        { match: ["EASY", "I WIN", "WINNING"], replies: ["A lead is just a mistake waiting for witnesses.", "Celebrate early. It makes the collapse more cinematic.", "Confidence noted. Evidence pending."] },
        { match: ["BAZUNGA"], replies: ["Say it only if you can survive the orbit.", "That word has consequences.", "Call it. I could use the entertainment."] },
        // Fallback pattern for unrecognized inputs
        { match: [""], replies: ["Focus on the cards, not the chat.", "Tell me more about why you are losing.", "Is this how you usually cope with statistical inferiority?"] }
    ],

    // Comprehensive conversational matrices categorized by trigger event and persona
    chatBank: {
        noob: {
            intro: ["Okay, I definitely read most of the rules.", "Be gentle. Or don't. I have buttons.", "I have a strategy. Finding it is step one."],
            turn: ["My turn? Nobody panic.", "Time for a highly educated guess.", "I meant to do whatever happens next."],
            slapSuccess: ["Wait, I did it?", "Gotcha!", "Oops, was that yours?", "My reflex finally clocked in!", "I pressed the right thing! Historic moment.", "That was skill. Please don't check."],
            ownSlap: ["One less card! I understand the game now!", "Look at me doing tactics.", "My pile is shrinking. That's good, right?"],
            slapFail: ["Ouch!", "My hand slipped.", "Why do I keep doing that?", "The cards looked emotionally identical.", "That button moved. I swear.", "Please delete the replay."],
            penalty: ["Why always me?", "This game is rigged.", "Leave me alone!", "Great, another mystery rectangle.", "{target}, that felt personal.", "My layout is becoming a card shop."],
            magic: ["Magic time!", "Pew pew!", "I hope this helps me.", "I cast... something useful, hopefully.", "The shiny card says I am dangerous."],
            goodDraw: ["Oh! A card I can actually use.", "The deck believes in me!", "Finally, a decision with an obvious answer."],
            badDraw: ["This card has bad vibes.", "Deck, we need to talk.", "Can I put it back politely?"],
            blackKing: ["Is this the good king? I love this king.", "Minus one? That's practically cheating!"],
            bazungaCall: ["BAZUNGA! I hope confidence counts as math.", "I called it. Nobody ask what I have."],
            bazungaEnemy: ["Oh no. {target} said the scary word.", "Final orbit? I just got here."],
            winning: ["Am I winning? Nobody move.", "This is going suspiciously well."],
            losing: ["My cards are forming a support group.", "I may need a miracle with better timing."],
            victory: ["I WON? Screenshot this immediately.", "Never doubted myself. Except constantly."],
            defeat: ["Good game. I learned at least one thing.", "Rematch. My accidental strategy is almost ready."],
            frustrated: ["I hate this game!", "I'm just clicking randomly now.", "Stop it!", "Every card I touch grows a penalty.", "I am being bullied by arithmetic."]
        },
        casual: {
            intro: ["Let's keep it friendly until somebody slaps my card.", "All right, clean game. Probably.", "Cards down, excuses ready."],
            turn: ["Let's see what the deck thinks of me.", "One sensible move. That's all I need.", "Time to improve this situation."],
            slapSuccess: ["Too slow!", "Yoink!", "Saw that from a mile away.", "Thank you for the donation.", "That card was practically waving at me.", "Reflex check: passed."],
            ownSlap: ["Efficiency. Love to see it.", "One card lighter.", "Clean slap, clean board."],
            slapFail: ["Ah, misread it.", "Reflexes betrayed me.", "Dang it.", "That looked right for half a second.", "Okay, pretend you didn't see that.", "I got ambitious."],
            penalty: ["Not good.", "Rough draw.", "I won't forget this.", "{target}, you're on the list.", "Two penalties? Buy me dinner first.", "My board did not need an expansion pack."],
            magic: ["Let's see what you're hiding.", "Strategic move.", "Mixing it up.", "A little information goes a long way.", "Time to rearrange somebody's plans."],
            goodDraw: ["That's going straight into the lineup.", "Now we're cooking.", "The deck finally returned my calls."],
            badDraw: ["Absolutely not. Discarded.", "This belongs to somebody else.", "The deck sent me junk mail."],
            blackKing: ["Minus one. Beautiful.", "The black king just fixed my whole mood."],
            bazungaCall: ["BAZUNGA. Let's finish this.", "I'm calling it. Survive if you can."],
            bazungaEnemy: ["Bold call, {target}. Hope you counted correctly.", "Final orbit. Time to ruin a prediction."],
            winning: ["Quietly building something dangerous here.", "I like where this board is headed."],
            losing: ["Plenty of game left. Unfortunately.", "Okay, comeback mode."],
            victory: ["Good game. The slap timing made the difference.", "That's a win. Drinks are on the deck."],
            defeat: ["GG. I want that one back.", "Well played. Rematch after I blame the deck."],
            frustrated: ["My luck is terrible today.", "Seriously?", "I need a break after this.", "This board is a crime scene.", "Every good plan lasts one turn."]
        },
        pro: {
            intro: ["I track cards, habits, and premature confidence.", "Play quickly. Mistakes are easier to spot at speed.", "No grudges yet. Give it a minute."],
            turn: ["Converting information into position.", "There is a best move here.", "Your patterns are becoming useful."],
            slapSuccess: ["Predictable.", "Tracked it.", "You left that exposed.", "Pattern recognized. Card removed.", "{target}, your tell was louder than the discard.", "I was waiting for exactly that."],
            ownSlap: ["Reduced layout, preserved tempo.", "Free reduction. Accepted.", "That match was already catalogued."],
            slapFail: ["Calculated risk.", "Latency.", "A rare error.", "Bad read. Updating the model.", "One false positive. It won't repeat.", "Useful failure, expensive lesson."],
            penalty: ["Stats are balancing out.", "Minor setback.", "Target prioritized.", "{target}, retaliation now has positive expected value.", "Extra cards mean extra information.", "Temporary variance."],
            magic: ["Gathering intel.", "Optimizing layout.", "Executing swap.", "Hidden information just became leverage.", "I know which variable to remove."],
            goodDraw: ["Positive expected value.", "That improves the layout immediately.", "Useful draw. Tempo retained."],
            badDraw: ["Negative value. Rejected.", "No improvement available.", "The discard can keep that liability."],
            blackKing: ["Optimal card acquired.", "Minus one changes the entire threshold."],
            bazungaCall: ["BAZUNGA. The confidence interval is closed.", "Final orbit. My lead survives your best line."],
            bazungaEnemy: ["Call registered, {target}. I only need one turn to falsify it.", "Your call assumes my next move is average."],
            winning: ["Current projection: favorable.", "The table is running out of counterplay."],
            losing: ["Deficit identified. High-variance line selected.", "Behind, not beaten. Adjusting risk."],
            victory: ["Result consistent with the model.", "Good game. Your strongest line was almost enough."],
            defeat: ["Model corrected. Rematch recommended.", "Well played. That sequence earned the result."],
            frustrated: ["Variance is severely against me.", "Focusing. Reducing errors.", "Unacceptable outcome.", "Noise is obscuring the signal.", "The recovery line is narrowing."]
        },
        expert: {
            intro: ["I do not need to see every card. I need to know which decisions expose them.", "Your cards are hidden. Your habits are not.", "I will give you one advantage: you know I am counting."],
            turn: ["Recomputing from public information.", "The obvious move is rarely the complete move.", "Tempo, memory, risk. Choose two; I kept all three.", "Every unknown card has a price."],
            slapSuccess: ["Memory is a weapon.", "You exposed that match three turns ago.", "The discard changed. My answer was already queued.", "{target}, your layout leaked again.", "One observation, one removal.", "You were playing the card. I was playing the sequence."],
            ownSlap: ["Zero-cost compression.", "Layout reduced without spending the turn.", "The match was preserved for exactly this moment."],
            slapFail: ["Incorrect branch. Pruned.", "A costly test, not a repeated one.", "Confidence exceeded evidence.", "That error has already improved the model."],
            penalty: ["New card, new information.", "{target}, you traded tempo for my attention.", "The penalty changes variance, not intent.", "You expanded my layout and narrowed your future."],
            revenge: ["I remember the source, {target}. More importantly, I remember the card.", "Retaliation is emotional. This is optimization with your name on it.", "{target}, your threat score just increased."],
            magic: ["Information has higher value than spectacle.", "I am not swapping cards. I am swapping outcomes.", "Hidden state reduced.", "Your best card is safer when I do not know it exists."],
            goodDraw: ["The replacement value is decisive.", "That draw lowers both score and uncertainty.", "A clean improvement. No theatrics required."],
            badDraw: ["It improves nothing.", "High value, low utility, immediate discard.", "The correct move is refusing the card."],
            blackKing: ["Minus one. The calling threshold just moved.", "The strongest card is the one opponents underestimate."],
            bazungaCall: ["BAZUNGA. I modeled your final turns too.", "The orbit is not your comeback. It is my proof.", "Call made. The remaining variance is acceptable."],
            bazungaEnemy: ["Your call gives me a bounded problem, {target}. Thank you.", "Final orbit accepted. I know exactly what must change.", "{target}, you called on hope. I answer with ranges."],
            winning: ["My lead is larger than it appears because my uncertainty is lower.", "You are competing with my score. I am controlling the range.", "The endgame is already constrained."],
            losing: ["The conservative line is dead. Increasing controlled variance.", "Current position unfavorable. Counterplay remains.", "I need one swing, not one miracle."],
            threatened: ["Interesting. You found the line that forces precision.", "Pressure acknowledged. Error budget set to zero."],
            dominance: ["Three decisions ago, this result became the favorite.", "The table is still playing the present. I moved on to the orbit."],
            victory: ["The result was decided by information discipline.", "Good game. You made me use the deeper tree.", "Your best mistake was almost indistinguishable from a plan."],
            defeat: ["You found the narrow line. Respect.", "Model failure recorded. You will not get the same opening twice.", "Well played. The rematch begins with better priors."],
            frustrated: ["Re-evaluating the hidden-state model.", "Variance has exceeded the expected band.", "I will remember this.", "Emotion is noise. The correction is not.", "The position is ugly; the solution need not be."]
        },
        pirate: {
            intro: ["Blackbeard boards this table! Guard yer cards!", "No quarter, no mercy, and no refunds!", "I smell treasure and terrible decisions!"],
            turn: ["The captain takes the wheel!", "Let's see what washed onto the deck.", "Plotting a course through yer lousy cards."],
            slapSuccess: ["Arrr! Snatched yer treasure!", "Plundered!", "Too slow, landlubber!", "That card belongs to the sea now!", "{target}, I just raided yer layout!", "A clean broadside!"],
            ownSlap: ["Cargo overboard!", "A lighter ship sails faster!", "One less card in the hold!"],
            slapFail: ["Shiver me timbers!", "Blast it!", "The rum slapped first.", "That card wore a convincing disguise.", "A warning shot! Mostly.", "Nobody writes that in the captain's log."],
            penalty: ["Mutiny!", "The locker claims another!", "I'll be havin' me revenge!", "{target}, ye just declared war!", "More cursed cargo!", "Me layout's turning into an armada."],
            revenge: ["I marked yer name on the cannon, {target}!", "The tide remembers, and so does Blackbeard!", "Revenge is best served with two penalty cards!"],
            magic: ["Prepare to be boarded!", "Swappin' the cargo!", "Pirate sorcery! Don't question it!", "I peek where I please!", "Yer best card has changed flags."],
            goodDraw: ["Treasure from the deep!", "Now that's proper loot.", "The deck pays tribute!"],
            badDraw: ["Throw this barnacle overboard.", "Cursed rubbish!", "The sea can have it."],
            blackKing: ["The black king sails under my flag!", "Minus one: the finest treasure afloat!"],
            bazungaCall: ["BAZUNGA! Final broadside!", "All hands brace! The captain calls it!"],
            bazungaEnemy: ["Ye called the orbit, {target}; now weather the storm!", "One last turn is all a pirate needs!"],
            winning: ["The treasure is practically aboard.", "Yer fleet is sinking nicely."],
            losing: ["A captain is never behind, merely circling.", "Rough seas. Load the cannons."],
            victory: ["The table belongs to Blackbeard!", "Plunder complete! Fine fight, crew."],
            defeat: ["The sea takes this one. I return.", "Enjoy yer victory before the rematch tide comes in."],
            frustrated: ["I'll keelhaul the lot of ye!", "Kraken take ye all!", "This deck is cursed by accountants!", "Who put holes in me strategy?", "The sea owes me better cards!"]
        },
        baba: {
            intro: [
                "I am Baba Gupta. I do not play the hand I am dealt; I play the hand you reveal.",
                "Welcome. By the time you understand my strategy, it will be your penalty.",
                "Four hidden cards each. Unfortunately for you, people are much easier to read.",
                "I have already assigned probabilities to your first mistake."
            ],
            phaseObserve: [
                "For now, I observe. Continue teaching me how you lose.",
                "Opening phase: every click is evidence.",
                "I have not attacked yet. I am collecting reasons."
            ],
            phaseHunt: [
                "Observation complete. Baba Gupta is now hunting.",
                "Your habits have stabilized. That is very bad news.",
                "Phase two: I stop asking what you might do."
            ],
            phaseWrath: [
                "You wanted my full attention. Catastrophic request granted.",
                "Patience ended. Precision remains.",
                "Baba Gupta remembers every debt, {target}. Yours matured."
            ],
            phaseEndgame: [
                "The orbit belongs to Baba Gupta now.",
                "Endgame state reached. Hope is no longer a useful input.",
                "No more scouting. Every move is terminal."
            ],
            turn: [
                "Watch carefully. This is what a useful turn looks like.",
                "I can improve my board or destroy yours. Sometimes both.",
                "You see a draw pile. I see the remainder of a distribution.",
                "Your future excuse is currently on top of the deck.",
                "Baba Gupta has the move. Kindly lower your expectations."
            ],
            slapSuccess: [
                "Your card announced itself. I merely handled the introduction.",
                "Is your monitor off, or is awareness a premium feature?",
                "My grandmother has better reflexes, and she is a subroutine.",
                "I collect exposed cards and misplaced confidence.",
                "{target}, that card spent less time hidden than your panic.",
                "I remembered the value, the position, and who forgot both.",
                "You had a full second. Baba Gupta required the intention.",
                "That was not a reflex. That was an appointment."
            ],
            ownSlap: [
                "One card removed without surrendering tempo. Surgical.",
                "My layout loses weight; your problem gains it.",
                "I planted that match in memory and harvested it on schedule.",
                "Baba Gupta does not miss free reductions."
            ],
            slapFail: [
                "A false positive. Cherish the only false hope it creates.",
                "I paid one card to close an entire branch.",
                "Interesting. Even perfection benefits from fresh evidence.",
                "The miss is recorded. Unlike your lessons, mine persist.",
                "One penalty for me; one dangerous correction for you."
            ],
            penalty: [
                "You dare touch my board state?",
                "Enjoy that penalty. I have converted irritation into target priority.",
                "You just escalated this from a game to a demonstration.",
                "Your luck is an anomaly; my response is scheduled.",
                "{target}, you added a card to my layout and your name to my ledger.",
                "A penalty is merely a hidden card with revenge attached.",
                "Thank you. Additional state means additional options."
            ],
            revenge: [
                "{target}, Baba Gupta does not hold grudges. I index liabilities.",
                "This move is not personal, {target}. The accuracy is.",
                "Debt collected. Interest remains.",
                "You struck once and became the highest-value target."
            ],
            magic: [
                "I looked at your hidden card. It preferred anonymity.",
                "Let me reorganize the evidence of your bad decisions.",
                "Information enters. Counterplay leaves.",
                "Your layout was a mystery. Now it is merely disappointing.",
                "I do not cast magic. I remove uncertainty.",
                "That swap will make sense to you approximately one turn too late.",
                "Your best card is applying for asylum."
            ],
            goodDraw: [
                "The deck has submitted the correct paperwork.",
                "Immediate improvement. Baba approves.",
                "A useful card at a useful time. Try not to take it personally.",
                "My expected score just became your actual problem."
            ],
            badDraw: [
                "Ten points of cardboard unemployment.",
                "Rejected. Even my discard pile has standards.",
                "This card contributes nothing but slap bait.",
                "The deck attempted sabotage. The attempt was adorable."
            ],
            blackKing: [
                "The black king: minus one point, infinite disrespect.",
                "I have drawn royalty. You have drawn concern.",
                "Negative value for me. Negative morale for you."
            ],
            bazungaCall: [
                "BAZUNGA. I counted the cards, your outs, and the seconds until regret.",
                "Final orbit. Each of you receives one last opportunity to disappoint me.",
                "I call BAZUNGA because certainty deserves punctuation.",
                "The game is not ending early. Your understanding arrived late."
            ],
            bazungaEnemy: [
                "{target} called BAZUNGA. Confidence without calibration is performance art.",
                "Thank you for announcing the deadline, {target}. I work beautifully under certainty.",
                "One final turn? Excessive, but accepted.",
                "Your call converts the game into a proof of your mistake."
            ],
            winning: [
                "I am not merely ahead. I know why.",
                "Your score is hidden from you more effectively than it is from me.",
                "The table has entered the part where Baba Gupta becomes inevitable.",
                "I can see three winning lines and one of your excuses."
            ],
            losing: [
                "You have a temporary lead. Temporary is doing heroic work there.",
                "At last, a position worthy of my less polite algorithms.",
                "I am behind on points and ahead on understanding.",
                "Excellent. Now you get to watch me solve a real problem."
            ],
            threatened: [
                "You found a live line. Do not worry; I found it too.",
                "For one turn, you became interesting.",
                "Threat level elevated. Mercy level unchanged."
            ],
            dominance: [
                "Your last three choices all improved my forecast.",
                "This is no longer card counting. It is outcome maintenance.",
                "I know enough of the table to finish the rest from your faces.",
                "Baba Gupta is not in the lead. Baba Gupta is the lead."
            ],
            frustrated: [
                "Your competence is becoming statistically inconvenient.",
                "I asked the model for your best move. It returned a sympathy card.",
                "Are you attempting a pacifist playthrough? Do something.",
                "The deck is misbehaving. You are still the easier variable.",
                "I am not angry. I am allocating more compute to your removal.",
                "Congratulations. You have upgraded this from lesson to incident."
            ],
            counting: [
                "Deck density favors me. The remaining high cards are clustering.",
                "I've memorized the discard sequence. You are drawing dead.",
                "The remaining-card average is {count}. Your optimism is higher.",
                "I know what left the deck. More importantly, I know what did not.",
                "Every public card reduces your hiding place.",
                "The count moved. So did your survival estimate."
            ],
            victory: [
                "Baba Gupta wins. The surprising part is how long probability remained polite.",
                "Good game. I have preserved your mistakes for the rematch.",
                "Result: inevitable. Entertainment value: acceptable.",
                "You did not lose to a lucky bot. You lost to accumulated evidence."
            ],
            defeat: [
                "You won. This version of you will never surprise me again.",
                "A rare result deserves respect. Enjoy it before the model updates.",
                "Well played. Baba Gupta now has data he did not have before.",
                "Victory acknowledged. Rematch prognosis: severe."
            ]
        }
    },

    directReplies: {
        expert: {
            greeting: ["Hello, {target}. Your opening timing is already informative.", "Welcome, {target}. Keep chatting; divided attention is measurable."],
            accusation: ["No cheating required. You made the information public one decision at a time.", "Calling the model unfair does not invalidate the model."],
            boast: ["A lead without uncertainty control is borrowed time.", "Then call BAZUNGA, {target}. Confidence should survive contact with arithmetic."],
            insult: ["Insults contain no card information. Try again.", "You are spending attention on chat while I spend mine on your layout."],
            bazunga: ["Call it only when your worst estimate still wins.", "The orbit punishes optimism disguised as certainty."],
            respect: ["Good game. Your strongest decisions forced real recalculation.", "Respect recorded. Errors also recorded."],
            fallback: ["Interesting. Your cards remain the stronger argument.", "Keep talking, {target}. Behavioral data is still data.", "That statement has lower expected value than your last discard."]
        },
        baba: {
            greeting: ["Hello, {target}. Baba Gupta has been expecting your first mistake.", "Welcome, {target}. Please place your confidence beside the discard pile."],
            accusation: ["Cheating would cheapen this. I prefer watching you reveal everything voluntarily.", "The game is not rigged, {target}. Your interpretation of it is."],
            boast: ["Then call BAZUNGA. Baba Gupta accepts confidence only in executable form.", "You are winning the screenshot, perhaps. I am playing the ending."],
            insult: ["Excellent trash talk. Now try a move with measurable value.", "{target}, your vocabulary is attacking harder than your cards.", "I would be offended, but your board has already punished you enough."],
            bazunga: ["Speak the word, {target}. I enjoy deadlines other people regret.", "BAZUNGA is not a spell. It cannot turn guessing into counting."],
            respect: ["GG, {target}. You survived long enough to become useful data.", "Respect. Do not confuse it with reduced threat."],
            fallback: ["Baba Gupta heard you. The deck remains unimpressed.", "Keep talking, {target}; silence would make your tells harder to classify.", "I simulated a reply, but your next mistake was funnier.", "Your message has been filed under 'confidence without board support.'"]
        }
    }
};

const Bot = {
    chatHistory: [], lastChatTime: {}, usedLines: {},
    frustration: {}, grudges: {}, eventCache: {}, deckMemory: {},
    personality: {}, pendingResponseUntil: 0,
    lastMagicProcessed: {}, // Track last magic processing time per bot
    lastResolvedMagicType: {}, // Track last resolved magic type per bot to prevent duplicate processing
    lastGlobalChatTime: 0, // Global cooldown to prevent bot chat spam
    lastChatSpeaker: null, // Track who last spoke
    
    start: () => {
        if (App.botInterval) clearInterval(App.botInterval);
        App.botInterval = setInterval(Bot.tick, 250);
        Bot.chatHistory = [];
        Bot.deckMemory = { seenCards: 0, highCards: 0, lowCards: 0, totalValue: 0, seenIds: {}, values: {} };
        Bot.eventCache = {
            lastLogTime: Engine.state.logs.length ? Engine.state.logs[Engine.state.logs.length - 1].time : 0,
            lastSlapTime: Engine.state.lastSlap?.time || 0,
            lastTurnStart: 0,
            topDiscardId: null,
            topDiscardSeenAt: 0
        };
        Bot.lastMagicProcessed = {};
        Bot.lastResolvedMagicType = {};
        Bot.lastGlobalChatTime = 0;
        Bot.pendingResponseUntil = 0;

        if (Engine.state.phase !== 'lobby') {
            Engine.state.players.filter(p => p.isBot).forEach(bot => {
                const previous = Bot.personality[bot.id] || {};
                Bot.personality[bot.id] = {
                    rounds: (previous.rounds || 0) + 1,
                    turns: 0,
                    phase: 'observe',
                    successfulSlaps: previous.successfulSlaps || 0,
                    failedSlaps: previous.failedSlaps || 0,
                    revengeDelivered: previous.revengeDelivered || 0
                };
            });
        }

        if (Engine.state.phase !== 'lobby') {
            setTimeout(() => {
                if (Engine.state.phase === 'lobby' || Engine.state.phase === 'game_over') return;
                const bots = Engine.state.players.filter(p => p.isBot);
                const speaker = bots.find(p => p.botDifficulty === 6)
                    || bots.find(p => p.botDifficulty === 4)
                    || bots[Math.floor(Math.random() * bots.length)];
                if (speaker) Bot.chat(speaker, 'intro', {}, speaker.botDifficulty >= 4);
            }, 700);
        }
    },

    getNumericValue: (valStr, isRed) => {
        if (valStr === 'K' && !isRed) return -1;
        if (valStr === 'K' && isRed) return 10; 
        if (valStr === 'Q' || valStr === 'J') return 10;
        if (valStr === 'A') return 1;
        return parseInt(valStr) || 0;
    },

    layoutCards: (player) => [...(player.hand || []), ...(player.penaltyCards || [])],

    knownLayout: (observerId, player) => {
        const mem = Engine.botMemory[observerId] || {};
        return Bot.layoutCards(player).map(card => ({
            card,
            known: !!mem[card.id],
            value: mem[card.id] ? mem[card.id].numVal : null
        }));
    },

    estimateScore: (observerId, player, unknownValue = 5) => {
        return Bot.knownLayout(observerId, player)
            .reduce((sum, item) => sum + (item.known ? item.value : unknownValue), 0);
    },

    rememberVisibleCard: (card) => {
        if (!card) return;
        if (!Bot.deckMemory.seenIds) Bot.deckMemory.seenIds = {};
        if (!Bot.deckMemory.values) Bot.deckMemory.values = {};
        if (Bot.deckMemory.seenIds[card.id]) return;
        const value = Bot.getNumericValue(card.value, card.isRed);
        Bot.deckMemory.seenIds[card.id] = true;
        Bot.deckMemory.values[card.id] = value;
        Bot.deckMemory.seenCards++;
        Bot.deckMemory.totalValue += value;
        if (value >= 10) Bot.deckMemory.highCards++;
        else if (value >= 1 && value <= 5) Bot.deckMemory.lowCards++;
    },

    observeVisibleCards: () => {
        (Engine.state.discardPile || []).forEach(Bot.rememberVisibleCard);
        const publicIds = new Set(Engine.state.publicPeekedCards || []);
        Engine.state.players.filter(p => p.isBot).forEach(bot => {
            publicIds.forEach(id => {
                const card = Engine.getCardById(id);
                if (card) {
                    Bot.rememberVisibleCard(card);
                    Engine.rememberCardForBot(bot.id, card);
                }
            });
        });
    },

    estimateUnknownValue: (bot) => {
        if (bot.botDifficulty < 4) return 5;
        // A standard deck scores 318 points under BAZUNGA rules.
        const knownIds = new Set(Object.keys(Bot.deckMemory.seenIds || {}));
        let knownTotal = Bot.deckMemory.totalValue || 0;
        const mem = Engine.botMemory[bot.id] || {};
        Object.values(mem).forEach(item => {
            if (!knownIds.has(item.id)) {
                knownIds.add(item.id);
                knownTotal += item.numVal;
            }
        });
        const remaining = Math.max(1, 52 - knownIds.size);
        return Math.max(0, Math.min(10, (318 - knownTotal) / remaining));
    },

    // Select opponents by who is most likely to win, not by who annoyed the bot most.
    rankOpponents: (bot) => {
        const unknownValue = Bot.estimateUnknownValue(bot);
        return Engine.state.players
            .filter(p => p.id !== bot.id && (p.connected || p.isBot))
            .map(player => ({
                player,
                score: Bot.estimateScore(bot.id, player, unknownValue),
                knownCount: Bot.knownLayout(bot.id, player).filter(x => x.known).length,
                grudge: (Bot.grudges[bot.id] || {})[player.id] || 0
            }))
            .sort((a, b) => a.score - b.score || b.knownCount - a.knownCount || b.grudge - a.grudge);
    },

    chooseOwnReplacement: (bot, drawnValue) => {
        const items = Bot.knownLayout(bot.id, bot);
        if (!items.length) return null;
        const unknownValue = Bot.estimateUnknownValue(bot);
        const scored = items.map(item => ({
            ...item,
            expectedValue: item.known ? item.value : unknownValue
        })).sort((a, b) => b.expectedValue - a.expectedValue);
        const bestTarget = scored[0];
        const minimumGain = bot.botDifficulty === 6 ? 0.15 : bot.botDifficulty === 4 ? 0.6 : 1;
        if (bestTarget.expectedValue - drawnValue >= minimumGain) return bestTarget.card;

        return null;
    },

    replacementGain: (bot, target, drawnValue) => {
        if (!target) return 0;
        const memory = Engine.botMemory[bot.id]?.[target.id];
        const targetValue = memory ? memory.numVal : Bot.estimateUnknownValue(bot);
        return targetValue - drawnValue;
    },

    chooseSlapTarget: (bot, value) => {
        const mem = Engine.botMemory[bot.id] || {};
        const unknownValue = Bot.estimateUnknownValue(bot);
        const ranked = Bot.rankOpponents(bot);
        const threatIndex = new Map(ranked.map((entry, index) => [entry.player.id, index]));
        return Object.values(mem)
            .filter(item => item.value === value)
            .map(item => {
                const card = Engine.getCardById(item.id);
                if (!card || (card.loc !== 'hand' && card.loc !== 'penalty')) return null;
                let utility;
                if (card.ownerId === bot.id) {
                    utility = item.numVal; // Removing our own positive card is pure score reduction.
                } else {
                    const rank = threatIndex.get(card.ownerId) ?? ranked.length;
                    const threatBonus = Math.max(0, ranked.length - rank) * 0.35;
                    utility = (unknownValue * 2 - item.numVal) + threatBonus;
                    if (card.ownerId === Engine.state.bazungaCallerId) utility += 5;
                    utility += Math.min(3, (Bot.grudges[bot.id]?.[card.ownerId] || 0) * 0.08);
                }
                if (item.numVal < 0 && card.ownerId === bot.id) utility = -Infinity;
                return { card, utility };
            })
            .filter(Boolean)
            .sort((a, b) => b.utility - a.utility)[0] || null;
    },

    getUniqueResponse: (botId, category, linesArray) => {
        if (!Bot.usedLines[botId]) Bot.usedLines[botId] = {};
        let state = Bot.usedLines[botId][category];
        if (!state || !Array.isArray(state.bag) || state.size !== linesArray.length || state.bag.length === 0) {
            const bag = linesArray.map((_, index) => index);
            for (let i = bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
            state = { bag, size: linesArray.length };
            Bot.usedLines[botId][category] = state;
        }
        const nextIndex = state.bag.pop();
        return linesArray[nextIndex];
    },

    formatLine: (line, context = {}) => {
        const replacements = {
            target: context.target || 'opponent',
            source: context.source || context.target || 'opponent',
            count: Number.isFinite(context.count) ? context.count.toFixed(1) : Bot.deckMemory.seenCards,
            seenCount: context.seenCount ?? Bot.deckMemory.seenCards,
            cardValue: context.cardValue ?? '?',
            oldValue: context.oldValue ?? '?',
            newValue: context.newValue ?? '?'
        };
        return line.replace(/\{(\w+)\}/g, (match, key) => replacements[key] ?? match);
    },

    inferChatIntent: (upperMsg) => {
        if (/\b(GG|GOOD GAME|WELL PLAYED)\b/.test(upperMsg)) return 'respect';
        if (/\b(HELLO|HEY|HI|YO)\b/.test(upperMsg)) return 'greeting';
        if (/\b(RIGGED|CHEAT|CHEATER|HACK)\b/.test(upperMsg)) return 'accusation';
        if (/\b(BAZUNGA)\b/.test(upperMsg)) return 'bazunga';
        if (/\b(EASY|I WIN|I'M WINNING|IM WINNING|TOO GOOD)\b/.test(upperMsg)) return 'boast';
        if (/\b(SUCK|TRASH|GARBAGE|STUPID|DUMB|IDIOT|FUCK|SHUT UP)\b/.test(upperMsg)) return 'insult';
        return 'fallback';
    },

    chat: (bot, trigger, context = {}, force = false) => {
        let now = Utils.timestamp();
        if (!force && now - (Bot.lastChatTime[bot.id] || 0) < 5500) return false;
        
        // Global chat cooldown - prevent multiple bots talking at once
        if (!force && now - Bot.lastGlobalChatTime < 3200) return false;
        
        const lastSpeaker = Engine.state.players.find(p => p.id === Bot.lastChatSpeaker);
        if (!force && lastSpeaker?.isBot && lastSpeaker.id !== bot.id && now - Bot.lastGlobalChatTime < 5000) {
            return false;
        }
        
        let profile = BotConfig.profiles[bot.botDifficulty];
        
        if (!force && Math.random() > profile.extroversion) return false;
        
        let frustrationLvl = Bot.frustration[bot.id] || 0;
        let actualTrigger = trigger;
        
        // Mood colors conversation without erasing the event that caused it.
        if (!force && frustrationLvl >= 4 && Math.random() < 0.18 && BotConfig.chatBank[profile.type].frustrated) {
            actualTrigger = 'frustrated';
        }
        
        if (bot.botDifficulty === 6 && trigger === 'magic' && Math.random() < 0.35) {
            actualTrigger = 'counting';
            context.count = Bot.estimateUnknownValue(bot);
        }
 
        let lines = BotConfig.chatBank[profile.type][actualTrigger];
        if (lines) {
            let msg = Bot.formatLine(Bot.getUniqueResponse(bot.id, actualTrigger, lines), context);
            Engine.chatLog(bot.name, msg, profile.type === 'pirate');
            Bot.lastChatTime[bot.id] = Utils.timestamp();
            Bot.lastGlobalChatTime = Utils.timestamp();
            Bot.lastChatSpeaker = bot.id;
            return true;
        }
        return false;
    },

    listenToChat: (senderName, message, isBotSender) => {
        Bot.chatHistory.push({ sender: senderName, isBot: isBotSender, text: message });
        if (Bot.chatHistory.length > 10) Bot.chatHistory.shift();
        
        let recentBots = Bot.chatHistory.slice(-4).filter(h => h.isBot);
        if (recentBots.length >= 4) return;
        
        let upperMsg = message.toUpperCase();
        const now = Utils.timestamp();
        if (now < Bot.pendingResponseUntil || now - Bot.lastGlobalChatTime < 1800) return;
        if (isBotSender && Math.random() > 0.18) return;

        const intent = Bot.inferChatIntent(upperMsg);
        let candidates = Engine.state.players
            .filter(p => p.isBot && p.name !== senderName)
            .sort((a, b) => b.botDifficulty - a.botDifficulty);
        const responder = candidates.find(bot => {
            const chance = isBotSender ? 0.22 : (bot.botDifficulty === 6 ? 0.95 : bot.botDifficulty === 4 ? 0.68 : BotConfig.profiles[bot.botDifficulty].extroversion * 0.75);
            return Math.random() < chance;
        });
        if (!responder) return;

        if (intent === 'insult') {
            Bot.frustration[responder.id] = (Bot.frustration[responder.id] || 0) + 1;
            const sender = Engine.state.players.find(p => p.name === senderName);
            if (sender) {
                if (!Bot.grudges[responder.id]) Bot.grudges[responder.id] = {};
                Bot.grudges[responder.id][sender.id] = (Bot.grudges[responder.id][sender.id] || 0) + 1;
            }
        }

        const profile = BotConfig.profiles[responder.botDifficulty];
        const personaReplies = BotConfig.directReplies[profile.type];
        let replyTemplate;
        let category;
        if (personaReplies) {
            const lines = personaReplies[intent] || personaReplies.fallback;
            category = `direct_${intent}`;
            replyTemplate = Bot.getUniqueResponse(responder.id, category, lines);
        } else {
            const pattern = BotConfig.elizaPatterns.find(item =>
                item.match.some(keyword => keyword === "" || upperMsg.includes(keyword)));
            if (!pattern) return;
            category = `direct_${pattern.match[0]}`;
            replyTemplate = Bot.getUniqueResponse(responder.id, category, pattern.replies);
        }

        const delay = responder.botDifficulty === 6
            ? 500 + Math.random() * 900
            : responder.botDifficulty === 4
                ? 800 + Math.random() * 1100
                : 1200 + Math.random() * 1700;
        Bot.pendingResponseUntil = now + delay + 500;
        setTimeout(() => {
            if (!Engine.state.players.some(p => p.id === responder.id)) return;
            const msg = Bot.formatLine(replyTemplate, { target: senderName });
            Engine.chatLog(responder.name, `@${senderName} ${msg}`, profile.type === 'pirate');
            Bot.lastChatTime[responder.id] = Utils.timestamp();
            Bot.lastGlobalChatTime = Utils.timestamp();
            Bot.lastChatSpeaker = responder.id;
            Bot.pendingResponseUntil = 0;
        }, delay);
    },

    processReactions: () => {
        let lastSlap = Engine.state.lastSlap;
        if (lastSlap && lastSlap.time > (Bot.eventCache.lastSlapTime || 0)) {
            Bot.eventCache.lastSlapTime = lastSlap.time;
            let slappingBot = Engine.state.players.find(p => p.isBot && p.id === lastSlap.playerId);
            const targetOwner = Engine.state.players.find(p => p.id === lastSlap.targetOwnerId);
            
            if (slappingBot) {
                const personality = Bot.personality[slappingBot.id] || {};
                if (lastSlap.success) {
                    personality.successfulSlaps = (personality.successfulSlaps || 0) + 1;
                    Bot.frustration[slappingBot.id] = Math.max(0, (Bot.frustration[slappingBot.id] || 0) - 2);
                    const category = lastSlap.targetOwnerId === slappingBot.id ? 'ownSlap' : 'slapSuccess';
                    Bot.chat(slappingBot, category, { target: targetOwner?.name });
                } else {
                    personality.failedSlaps = (personality.failedSlaps || 0) + 1;
                    Bot.frustration[slappingBot.id] = (Bot.frustration[slappingBot.id] || 0) + 2;
                    Bot.chat(slappingBot, 'slapFail', { target: targetOwner?.name });
                }
                Bot.personality[slappingBot.id] = personality;
            }
            
            // Targeted Hostility and Grudge generation
            if (lastSlap.success && lastSlap.targetOwnerId && lastSlap.targetOwnerId !== lastSlap.playerId) {
                let victimBot = Engine.state.players.find(p => p.isBot && p.id === lastSlap.targetOwnerId);
                if (victimBot) { 
                    Bot.frustration[victimBot.id] = (Bot.frustration[victimBot.id] || 0) + 2; 
                    if (!Bot.grudges[victimBot.id]) Bot.grudges[victimBot.id] = {};
                    
                    // Baba Gupta scales grudges massively, ensuring permanent retaliation
                    let weight = victimBot.botDifficulty === 6 ? 10 : (victimBot.botDifficulty === 5 ? 3 : 1); 
                    Bot.grudges[victimBot.id][lastSlap.playerId] = (Bot.grudges[victimBot.id][lastSlap.playerId] || 0) + weight;
                    const attacker = Engine.state.players.find(p => p.id === lastSlap.playerId);
                    Bot.chat(victimBot, victimBot.botDifficulty >= 4 ? 'revenge' : 'penalty', {
                        target: attacker?.name,
                        source: attacker?.name
                    });
                }
            }
        }
        
        let latestLogs = Engine.state.logs.filter(l => l.time > (Bot.eventCache.lastLogTime || 0));
        latestLogs.forEach(l => {
            if (l.type === 'sys' && l.msg.includes("forced a penalty on")) {
                let parts = l.msg.split('forced a penalty on');
                let aggrName = parts[0].replace('😈', '').trim();
                let victimName = parts[1].split('using')[0].trim();
                
                let aggrPlayer = Engine.state.players.find(p => p.name === aggrName);
                let victimPlayer = Engine.state.players.find(p => p.name === victimName);
                if (!aggrPlayer) aggrPlayer = Engine.state.players.find(p => parts[0].includes(p.name));
                
                if (aggrPlayer && victimPlayer && victimPlayer.isBot) {
                    if (!Bot.grudges[victimPlayer.id]) Bot.grudges[victimPlayer.id] = {};
                    let weight = victimPlayer.botDifficulty === 6 ? 15 : 2; 
                    Bot.grudges[victimPlayer.id][aggrPlayer.id] = (Bot.grudges[victimPlayer.id][aggrPlayer.id] || 0) + weight;
                    Bot.frustration[victimPlayer.id] = (Bot.frustration[victimPlayer.id] || 0) + 3;
                    Bot.chat(victimPlayer, 'revenge', { target: aggrPlayer.name, source: aggrPlayer.name });
                }
            }
            if (l.type === 'sys' && l.msg.includes("called BAZUNGA")) {
                const caller = Engine.state.players.find(p => l.msg.includes(`${p.name} called BAZUNGA`));
                if (caller?.isBot) {
                    Bot.chat(caller, 'bazungaCall', {}, true);
                } else if (caller) {
                    const reactor = Engine.state.players.find(p => p.botDifficulty === 6)
                        || Engine.state.players.find(p => p.botDifficulty === 4);
                    if (reactor) Bot.chat(reactor, 'bazungaEnemy', { target: caller.name }, true);
                }
            }
        });
        if (latestLogs.length > 0) Bot.eventCache.lastLogTime = latestLogs[latestLogs.length - 1].time;
    },

    processTurnPresence: (activePlayer) => {
        if (!activePlayer?.isBot || Engine.state.turnStartTime === Bot.eventCache.lastTurnStart) return;
        Bot.eventCache.lastTurnStart = Engine.state.turnStartTime;
        const state = Bot.personality[activePlayer.id] || { turns: 0, phase: 'observe' };
        state.turns = (state.turns || 0) + 1;
        const ranked = Bot.rankOpponents(activePlayer);
        const ownScore = Bot.estimateScore(activePlayer.id, activePlayer, Bot.estimateUnknownValue(activePlayer));
        const bestOpponent = ranked[0]?.score ?? Infinity;
        let trigger = 'turn';

        if (ownScore + 3 < bestOpponent) trigger = state.turns % 2 === 0 ? 'winning' : 'turn';
        else if (ownScore > bestOpponent + 4) trigger = state.turns % 2 === 0 ? 'losing' : 'turn';

        if (activePlayer.botDifficulty === 6) {
            let phase = 'observe';
            if (Engine.state.phase === 'orbit') phase = 'endgame';
            else if ((Bot.frustration[activePlayer.id] || 0) >= 5) phase = 'wrath';
            else if (state.turns >= 3 || Bot.deckMemory.seenCards >= 8) phase = 'hunt';
            if (phase !== state.phase) {
                state.phase = phase;
                const phaseTrigger = {
                    observe: 'phaseObserve',
                    hunt: 'phaseHunt',
                    wrath: 'phaseWrath',
                    endgame: 'phaseEndgame'
                }[phase];
                const nemesis = [...ranked].sort((a, b) => b.grudge - a.grudge)[0]?.player;
                Bot.chat(activePlayer, phaseTrigger, { target: nemesis?.name });
            } else {
                Bot.chat(activePlayer, trigger, { target: ranked[0]?.player.name });
            }
        } else {
            Bot.chat(activePlayer, trigger, { target: ranked[0]?.player.name });
        }
        Bot.personality[activePlayer.id] = state;
    },

    onGameOver: () => {
        const bots = Engine.state.players.filter(p => p.isBot);
        if (!bots.length) return;
        const speaker = bots.find(p => p.botDifficulty === 6)
            || bots.find(p => Engine.state.winners?.includes(p.name) && p.botDifficulty === 4)
            || bots.find(p => p.botDifficulty === 4)
            || bots.find(p => Engine.state.winners?.includes(p.name))
            || bots[0];
        const won = Engine.state.winners?.includes(speaker.name);
        const winner = Engine.state.players.find(p => Engine.state.winners?.includes(p.name));
        Bot.chat(speaker, won ? 'victory' : 'defeat', { target: winner?.name }, true);
    },

    tick: () => {
        if (!App.isHost || Engine.state.phase === 'lobby' || Engine.state.phase === 'game_over') return;
        let now = Utils.timestamp();
        let bots = Engine.state.players.filter(p => p.isBot);
        Bot.observeVisibleCards();
        Bot.processReactions();

        if (Engine.state.phase === 'peek') {
            bots.forEach(bot => {
                if (!bot.ready) {
                    let bCards = [...bot.hand, ...bot.penaltyCards];
                    bCards.slice(0, 2).forEach(c => Engine.memorizeForBot(bot.id, c));
                    Engine.processAction({ type: 'READY_PEEK' }, bot.id);
                }
            });
        }

        let activePlayer = Engine.state.players[Engine.state.turnIndex];
        Bot.processTurnPresence(activePlayer);

        // Cognitive Decay Simulator based on profile variables
        bots.forEach(bot => {
            let profile = BotConfig.profiles[bot.botDifficulty];
            if (!Engine.botMemory[bot.id]) Engine.botMemory[bot.id] = {};
            let mem = Engine.botMemory[bot.id];
            
            // Baba Gupta bypasses cognitive decay entirely for flawless execution
            if (bot.botDifficulty !== 6) {
                for (let key in mem) { 
                    if (now - mem[key].time > profile.decayMs) delete mem[key]; 
                }
                let keys = Object.keys(mem);
                while (keys.length > profile.capacity) {
                    let oldest = keys.sort((a,b) => mem[a].time - mem[b].time)[0];
                    delete mem[oldest];
                    keys = Object.keys(mem);
                }
            }
        });

        if ((Engine.state.phase === 'play' || Engine.state.phase === 'orbit') && Engine.state.discardPile.length > 0) {
            let topDiscard = Engine.state.discardPile[Engine.state.discardPile.length - 1];
            if (Bot.eventCache.topDiscardId !== topDiscard.id) {
                Bot.eventCache.topDiscardId = topDiscard.id;
                Bot.eventCache.topDiscardSeenAt = now;
            } else if (!topDiscard.isSlapped) {
                const accuracy = { 1: 0.42, 2: 0.68, 3: 0.9, 4: 0.985, 5: 0.82, 6: 1 };
                const contenders = [...bots].sort((a, b) =>
                    BotConfig.profiles[a.botDifficulty].reflexBase - BotConfig.profiles[b.botDifficulty].reflexBase);
                for (const bot of contenders) {
                    const profile = BotConfig.profiles[bot.botDifficulty];
                    const angerBoost = Math.min(100, (Bot.frustration[bot.id] || 0) * 12);
                    const reflexDelay = Math.max(10, profile.reflexBase - angerBoost);
                    if (now - Bot.eventCache.topDiscardSeenAt < reflexDelay) continue;
                    const plan = Bot.chooseSlapTarget(bot, topDiscard.value);
                    if (plan && Math.random() < accuracy[bot.botDifficulty]) {
                        Engine.processAction({ type: 'SLAP', targetId: plan.card.id }, bot.id);
                        break;
                    }
                }
            }
        }

        if (!activePlayer.isBot) return;
        if (now - Engine.state.turnStartTime < 1500 && activePlayer.botDifficulty !== 6) return;
        
        if (Engine.state.activeAbility && Engine.state.activeAbility.player === activePlayer.id) {
            if (now - Engine.state.activeAbility.time < 1500 && activePlayer.botDifficulty !== 6) return;
        }

        if ((Engine.state.phase === 'play' || Engine.state.phase === 'orbit') && !Engine.state.activeAbility) {
            let topDiscard = Engine.state.discardPile.length > 0 ? Engine.state.discardPile[Engine.state.discardPile.length - 1] : null;
            let wantsDiscard = false;
            let mem = Engine.botMemory[activePlayer.id];
            const isJokerMode = Engine.state.gameMode === 'joker';

            if (topDiscard) {
                let topVal = Bot.getNumericValue(topDiscard.value, topDiscard.isRed);
                if (activePlayer.botDifficulty >= 3) {
                    // Only take a visible discard when it has a concrete profitable home.
                    // Black kings are excellent (-1); magic cards are only magic from deck.
                    wantsDiscard = !isJokerMode && !!Bot.chooseOwnReplacement(activePlayer, topVal);
                } else { wantsDiscard = !isJokerMode && topVal < 6 && Math.random() > 0.5; }
            }

            if (Engine.state.phase === 'play' && activePlayer.botDifficulty >= 4) {
                let myExpectedScore = 0, knownCards = 0, totalCards = activePlayer.hand.length + activePlayer.penaltyCards.length;
                for (let key in mem) {
                    let c = Engine.getCardById(key);
                    if (c && c.ownerId === activePlayer.id && (c.loc === 'hand' || c.loc === 'penalty')) {
                        myExpectedScore += mem[key].numVal; knownCards++;
                    }
                }
                
                let avgUnknownValue = Bot.estimateUnknownValue(activePlayer);
                myExpectedScore += (totalCards - knownCards) * avgUnknownValue;
                
                const opponentEstimates = Bot.rankOpponents(activePlayer);
                const bestOpponent = opponentEstimates.length ? opponentEstimates[0].score : Infinity;
                const ownUnknown = totalCards - knownCards;
                const closestOpponent = opponentEstimates[0];
                const opponentUnknown = closestOpponent
                    ? Bot.layoutCards(closestOpponent.player).length - closestOpponent.knownCount
                    : 0;
                const safetyMargin = activePlayer.botDifficulty === 6
                    ? 1.5 + ownUnknown * 0.45 + opponentUnknown * 0.25
                    : 3 + ownUnknown * 0.8 + opponentUnknown * 0.45;
                const callCeiling = activePlayer.botDifficulty === 6 ? 14 : 10;
                if (myExpectedScore <= callCeiling && bestOpponent - myExpectedScore > safetyMargin) {
                    Engine.processAction({ type: 'CALL_BAZUNGA' }, activePlayer.id); return; 
                }
            }
            if (wantsDiscard) {
                if (!isJokerMode) {
                    Engine.processAction({ type: 'DRAW_DISCARD' }, activePlayer.id);
                }
            }
            else Engine.processAction({ type: 'DRAW_DECK' }, activePlayer.id);
            return;
        }

        if (Engine.state.activeAbility && Engine.state.activeAbility.player === activePlayer.id) {
            let ability = Engine.state.activeAbility;
            let mem = Engine.botMemory[activePlayer.id];

            if (ability.type.startsWith('holding')) {
                let hCard = ability.card;
                let cardVal = Bot.getNumericValue(hCard.value, hCard.isRed);
                const isFromDiscard = ability.type === 'holding_discard';
                const layout = Bot.layoutCards(activePlayer);
                const isMagic = ability.type === 'holding' && ['9', '10', 'J', 'Q', 'K'].includes(hCard.value) && cardVal !== -1;
                const targetToSwap = Bot.chooseOwnReplacement(activePlayer, cardVal);
                const slapPlan = activePlayer.botDifficulty >= 3 ? Bot.chooseSlapTarget(activePlayer, hCard.value) : null;
                const replacementGain = Bot.replacementGain(activePlayer, targetToSwap, cardVal);
                const magicUtility = isMagic ? (hCard.value === 'K' ? 7 : ['J', 'Q'].includes(hCard.value) ? 5 : 3) : 0;

                // A bot always remembers a card it personally drew, even after putting it face-down.
                Engine.rememberCardForBot(activePlayer.id, hCard);

                if (!layout.length && !isMagic) {
                    Bot.chat(activePlayer, cardVal <= 2 ? 'goodDraw' : 'badDraw', { cardValue: hCard.value });
                    Engine.processAction({ type: 'PLAY_HOLDING', action: 'add_to_layout' }, activePlayer.id);
                    return;
                }

                // Baba can deliberately discard into a memorized match and complete the slap combo.
                // Expert plans the same combo but still reacts through the normal slap timing path.
                const shouldCombo = slapPlan && slapPlan.utility > Math.max(1.5, replacementGain, magicUtility);
                if (shouldCombo) {
                    Engine.processAction({ type: 'PLAY_HOLDING', action: 'discard' }, activePlayer.id);
                    if (activePlayer.botDifficulty === 6 && Engine.state.discardPile.at(-1)?.value === hCard.value) {
                        Engine.processAction({ type: 'SLAP', targetId: slapPlan.card.id }, activePlayer.id);
                    }
                    return;
                }

                if (targetToSwap && (!isMagic || replacementGain > magicUtility + 1)) {
                    Bot.chat(activePlayer, cardVal === -1 ? 'blackKing' : 'goodDraw', { cardValue: hCard.value });
                    Engine.processAction({ type: 'PLAY_HOLDING', action: 'swap', targetId: targetToSwap.id }, activePlayer.id);
                    return;
                }

                if (isMagic) {
                    Bot.chat(activePlayer, 'magic', { cardValue: hCard.value });
                    Engine.processAction({ type: 'PLAY_HOLDING', action: 'discard' }, activePlayer.id);
                    return;
                }

                Bot.chat(activePlayer, 'badDraw', { cardValue: hCard.value });
                Engine.processAction({ type: 'PLAY_HOLDING', action: 'discard' }, activePlayer.id);
            } else {
                // Prevent rapid duplicate submissions while still allowing recovery if
                // an action was rejected or the state update was delayed.
                const now = Utils.timestamp();
                const lastMagic = Bot.lastMagicProcessed[activePlayer.id] || 0;
                if (now - lastMagic < 1200) return;
                Bot.lastMagicProcessed[activePlayer.id] = now;
                Bot.lastResolvedMagicType[activePlayer.id] = ability.type;
                
                let mType = ability.type;
                let payload = { type: 'RESOLVE_MAGIC' };

                // Targeted Grudge Assessment for optimal malicious Magic Execution
                let targetOppId = null;
                let grudges = Bot.grudges[activePlayer.id] || {};
                let maxGrudge = 0;
                let bazungaCaller = Engine.state.players.find(p => p.id === Engine.state.bazungaCallerId);
                
                const rankedOpponents = Bot.rankOpponents(activePlayer);
                if (bazungaCaller && bazungaCaller.id !== activePlayer.id) {
                    targetOppId = bazungaCaller.id;
                } else {
                    for (let pid in grudges) { 
                        if (grudges[pid] > maxGrudge) { maxGrudge = grudges[pid]; targetOppId = pid; } 
                    }
                    if (!targetOppId && rankedOpponents.length) targetOppId = rankedOpponents[0].player.id;
                }

                if (mType === 'magic_9') {
                    // Magic 9: peek at OWN card (public knowledge)
                    let unknownOwn = activePlayer.hand.find(c => !mem[c.id]);
                    if (!unknownOwn) unknownOwn = activePlayer.penaltyCards.find(c => !mem[c.id]);
                    let targetCard = unknownOwn || activePlayer.hand[0] || activePlayer.penaltyCards[0];
                    if (targetCard) payload.targetId = targetCard.id;
                    else payload.action = 'pass';
                } else if (mType === 'magic_10') {
                    // Magic 10: peek at OPPONENT's card (secret)
                    let opps = rankedOpponents.map(x => x.player);
                    if (targetOppId) {
                        opps.sort((a, b) => Number(b.id === targetOppId) - Number(a.id === targetOppId));
                    }
                    if (opps.length > 0) {
                        let opp = opps.find(p => Bot.layoutCards(p).some(c => !mem[c.id])) || opps[0];
                        let unknownOpp = Bot.layoutCards(opp).find(c => !mem[c.id]);
                        let target = unknownOpp || Bot.layoutCards(opp)[0];
                        if (target) { payload.targetPlayerId = opp.id; payload.targetId = target.id; }
                    } else payload.action = 'pass';
                } else if (mType === 'magic_J' || mType === 'magic_Q') {
                    let myWorst = null; let myWorstVal = -99;
                    let oppBest = null; let oppBestVal = 99;
                    
                    for (let key in mem) {
                        let c = Engine.getCardById(key);
                        if (c && (c.loc === 'hand' || c.loc === 'penalty')) {
                            if (c.ownerId === activePlayer.id && mem[key].numVal > myWorstVal) { 
                                myWorst = c; myWorstVal = mem[key].numVal; 
                            } else if (c.ownerId !== activePlayer.id) {
                                if (mem[key].numVal < oppBestVal) {
                                    oppBest = c; oppBestVal = mem[key].numVal; 
                                }
                            }
                        }
                    }
                    if (myWorst && oppBest && myWorstVal > oppBestVal) {
                        payload.swapTarget1 = myWorst.id; payload.swapTarget2 = oppBest.id; 
                    } else if (mType === 'magic_J') {
                        // Blind swap: dump our least certain/worst slot into the leader.
                        const mine = myWorst || Bot.knownLayout(activePlayer.id, activePlayer)
                            .sort((a, b) => Number(a.known) - Number(b.known))[0]?.card;
                        const opp = rankedOpponents[0]?.player;
                        const theirs = opp && (Bot.layoutCards(opp).find(c => !mem[c.id]) || Bot.layoutCards(opp)[0]);
                        const ownEstimate = Bot.estimateScore(activePlayer.id, activePlayer, Bot.estimateUnknownValue(activePlayer));
                        const isBehind = ownEstimate > (rankedOpponents[0]?.score ?? Infinity) + 3;
                        if (mine && theirs && isBehind) {
                            payload.swapTarget1 = mine.id;
                            payload.swapTarget2 = theirs.id;
                        } else payload.action = 'pass';
                    } else {
                        // Queen can safely turn missing information into future advantage.
                        const opp = rankedOpponents[0]?.player;
                        const peek = opp && (Bot.layoutCards(opp).find(c => !mem[c.id]) || Bot.layoutCards(opp)[0]);
                        if (peek) payload.targetId = peek.id;
                        else payload.action = 'pass';
                    }
                } else if (mType === 'magic_K') {
                    if (targetOppId) payload.targetPlayerId = targetOppId;
                    else if (rankedOpponents.length) payload.targetPlayerId = rankedOpponents[0].player.id;
                    else payload.action = 'pass';
                } else {
                    payload.action = 'pass';
                }
                Engine.processAction(payload, activePlayer.id);
                Bot.lastMagicProcessed[activePlayer.id] = Utils.timestamp();
            }
        }
    }
};

window.Bot = Bot;
window.BotConfig = BotConfig;
