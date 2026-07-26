/**
 * BAZUNGA - Advanced Adversarial Bot AI & Conversational Engine
 * Integrates ELIZA reflections, PARRY affective states, Heuristic Card Counting, and Dynamic Trash Talk.
 * Fully compatible with index.html interface.
 */

const BotConfig = {
    profiles: {
        // Timings are sampled once per decision. This keeps bots human-paced without
        // letting the 250 ms engine tick repeatedly reroll their reaction time.
        1: { type: 'noob', capacity: 2, decayMs: 12000, reflexBase: 1450, reflexJitter: 900, decisionMin: 2400, decisionMax: 5200, peekMin: 3400, peekMax: 6500, typingWpm: 30, readingWpm: 185, hesitation: 0.34, rhythmVariance: 0.24, distraction: 0.18, extroversion: 0.9, counting: false },
        2: { type: 'casual', capacity: 4, decayMs: 20000, reflexBase: 980, reflexJitter: 650, decisionMin: 1800, decisionMax: 3900, peekMin: 2800, peekMax: 5200, typingWpm: 40, readingWpm: 225, hesitation: 0.25, rhythmVariance: 0.2, distraction: 0.12, extroversion: 0.6, counting: false },
        3: { type: 'pro', capacity: 10, decayMs: 50000, reflexBase: 620, reflexJitter: 420, decisionMin: 1300, decisionMax: 2900, peekMin: 2300, peekMax: 4300, typingWpm: 54, readingWpm: 275, hesitation: 0.15, rhythmVariance: 0.14, distraction: 0.07, extroversion: 0.28, counting: false },
        4: { type: 'expert', capacity: 30, decayMs: 180000, reflexBase: 460, reflexJitter: 330, decisionMin: 1450, decisionMax: 3200, peekMin: 2500, peekMax: 4400, typingWpm: 64, readingWpm: 305, hesitation: 0.18, rhythmVariance: 0.12, distraction: 0.04, extroversion: 0.38, counting: true },
        5: { type: 'pirate', capacity: 10, decayMs: 50000, reflexBase: 780, reflexJitter: 550, decisionMin: 1700, decisionMax: 3700, peekMin: 2700, peekMax: 5000, typingWpm: 38, readingWpm: 205, hesitation: 0.29, rhythmVariance: 0.22, distraction: 0.13, extroversion: 1.0, counting: true },
        // The Apex Adversary: flawless public-information memory and boss-tier planning.
        6: { type: 'baba', name: 'Baba Gupta', capacity: 52, decayMs: Infinity, reflexBase: 370, reflexJitter: 260, decisionMin: 900, decisionMax: 2200, peekMin: 1900, peekMax: 3500, typingWpm: 76, readingWpm: 340, hesitation: 0.12, rhythmVariance: 0.09, distraction: 0.015, extroversion: 0.88, counting: true }
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
            banter: [
                "I have four cards and at least seven concerns.",
                "My strategy is currently loading. Please admire the spinner.",
                "{target}, if confidence scored points, we would both be in trouble.",
                "I am not lost. I am exploring every wrong option equally.",
                "This table has more plot twists than my browser history.",
                "Nobody taught the deck manners, apparently.",
                "I came here to win and accidentally clicked everything else.",
                "If this move works, I am calling it theory.",
                "My poker face is just regular confusion.",
                "{target}, please make a worse move so mine has context."
            ],
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
            banter: [
                "Friendly reminder: the discard pile remembers everything.",
                "{target}, that confidence looks rented.",
                "I respect the strategy. I just cannot find it.",
                "This game is ninety percent memory and ten percent pretending.",
                "The deck and I are taking some time apart.",
                "Strong table. Weak life choices. Perfect balance.",
                "I would explain my plan, but it keeps changing its number.",
                "Everybody is calm until the matching card lands.",
                "{target}, your poker face just submitted a bug report.",
                "No pressure. Just cards, pride, and permanent screenshots."
            ],
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
            banter: [
                "The table is quiet. The mistakes are not.",
                "{target}, your timing has started telling stories.",
                "I do enjoy a game where confidence is public information.",
                "Every card is hidden until somebody gets impatient.",
                "The best bluff here is pretending you remember your own layout.",
                "I have seen stronger positions in loading screens.",
                "This is not trash talk. It is an early performance review.",
                "The discard pile has a better memory than half the table.",
                "{target}, that move had ambition. Evidence arrives later.",
                "A bad card is temporary. A recorded decision is forever."
            ],
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
            banter: [
                "I have assigned your confidence a very generous error bar.",
                "{target}, your line is creative in the way accounting fraud is creative.",
                "The table contains hidden cards and remarkably visible panic.",
                "Your strategy has excellent suspense and limited substance.",
                "I am not judging the move. The expected value already did.",
                "Some players count cards. Others count on forgiveness.",
                "That silence sounds like somebody forgot their bottom-left card.",
                "Your tells would be subtler if they came with subtitles.",
                "{target}, the good news is your mistake was statistically interesting.",
                "I would reveal my plan, but then it would be the second-best plan here.",
                "The deck introduces variance. You keep adding personality.",
                "Please continue. The sample size is becoming hilarious."
            ],
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
            banter: [
                "I have seen sturdier plans written on wet maps!",
                "{target}, yer strategy has sprung three leaks and a gift shop!",
                "Guard yer cards! I already stole the dignity.",
                "This crew remembers cards like a goldfish remembers taxes.",
                "The deck be cursed, but yer decisions volunteered.",
                "A quiet table means somebody is hiding a terrible plan.",
                "I came for treasure and found a floating group project.",
                "{target}, even me parrot called that move repetitive.",
                "Hoist the odds! Lower the expectations!",
                "If panic were wind, this ship would fly."
            ],
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
            banter: [
                "Baba Gupta has reviewed the table. The table requests anonymity.",
                "{target}, your strategy has entered witness protection.",
                "I admire your confidence. It survives without nourishment.",
                "Your poker face is a push notification.",
                "The cards are face-down. Your confusion is in presentation mode.",
                "I searched the decision tree for your plan. It returned a 404.",
                "Please continue improvising. Structure would only slow the comedy.",
                "{target}, even your unknown cards are distancing themselves.",
                "You are not being outplayed. You are being carefully documented.",
                "The deck supplies randomness. You supply the recurring theme.",
                "I would offer advice, but then this becomes cooperative mode.",
                "Your next move has already apologized to your previous one.",
                "Baba Gupta does not trash-talk. He publishes findings.",
                "This table has four suits and one ongoing lawsuit against your memory."
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

    // Used when chat does not match a narrow intent. Keeping this separate from
    // event dialogue gives ordinary table conversation a much deeper vocabulary.
    generalReplies: {
        noob: [
            "I understood some of those words, {target}.",
            "Absolutely. Unless that was strategy advice.",
            "I would respond properly, but I forgot which card I am guarding.",
            "This conversation is going better than my layout.",
            "Give me a second; my confidence is reconnecting.",
            "That sounds important. Can the discard pile handle it?",
            "I agree emotionally and remain confused tactically.",
            "The good news is I am listening. The bad news is I am also playing.",
            "I had a clever reply, then I drew a card and lost it.",
            "{target}, we can discuss this after I survive my own turn.",
            "Chatting is easy. Remembering two cards is apparently premium content.",
            "My legal team says every move was intentional.",
            "I am thinking so hard the wrong answer is getting nervous.",
            "One moment, {target}; I misplaced my train of thought under a penalty card.",
            "This is either a master plan or a very organized accident.",
            "I have two known cards and seventeen unknown emotions."
        ],
        casual: [
            "Fair enough, {target}. The table will settle the argument.",
            "I hear you. I am still taking the card over the speech.",
            "That is one interpretation. The discard pile has another.",
            "Good chat. Terrible time to forget your layout.",
            "I respect the energy, if not the evidence.",
            "Let us bookmark that until the final score.",
            "You keep the commentary; I will keep the useful cards.",
            "This table really does come with a podcast.",
            "{target}, I would answer faster, but the deck created paperwork.",
            "Noted. No refunds if the next card proves you wrong.",
            "The vibe is excellent. The decision-making is under review.",
            "We are all friends until the slap window opens.",
            "Hang on, I am choosing between sensible and funny.",
            "That sounded convincing enough to survive until the next draw.",
            "I came for cards and accidentally joined a debate club.",
            "Let me think; the obvious move has suspiciously good marketing."
        ],
        pro: [
            "Message received. Strategic relevance remains under evaluation.",
            "{target}, the claim is interesting; the timing is more interesting.",
            "I can chat and count. Your move suggests you chose one.",
            "The conversation is public information too.",
            "Noted. Your attention allocation is now part of the model.",
            "A confident sentence is not a substitute for a strong position.",
            "Keep going. Language patterns are patterns.",
            "The board will provide the less biased reply.",
            "I have logged that under statements awaiting evidence.",
            "{target}, your point may be correct. Your layout remains suspicious.",
            "Good theory. Let us expose it to one turn of reality.",
            "Silence would conceal more, but this is more entertaining.",
            "I am comparing your words with the move you avoided.",
            "Give me a beat; useful decisions dislike being rushed.",
            "Your message changed the table exactly zero cards and one tell.",
            "I have considered the banter and retained positional advantage."
        ],
        expert: [
            "Your message has been included in the behavioral model.",
            "{target}, that sentence contains more certainty than your position supports.",
            "I considered your point and improved my estimate of your distraction.",
            "The chat is noisy. Your timing is remarkably clear.",
            "Interesting assertion. Please attach a winning line.",
            "I can answer now or let the next three moves answer more precisely.",
            "The statement is plausible. Your board is a hostile witness.",
            "You are optimizing morale. I am optimizing the result.",
            "Conversational tempo surrendered. Information gained.",
            "{target}, every extra word narrows the range of what you remember.",
            "I appreciate the commentary. It makes the tells self-documenting.",
            "The model has acknowledged your message and rejected its confidence interval.",
            "I am not stalling; I am letting your mistake finish developing.",
            "That sentence improved my read and worsened your outlook.",
            "Please continue while I price your hesitation into the position.",
            "The optimal reply is currently busy becoming a move."
        ],
        pirate: [
            "A fine speech, {target}! Shame the cards cannot hear ye.",
            "Yer words be bold and yer layout be seasick.",
            "Speak on! Me parrot needs new material.",
            "I heard ye. The ocean voted for plunder.",
            "That tale needs treasure, danger, and a better ending.",
            "Save yer breath; the final orbit charges interest!",
            "{target}, even the barnacles want ye to reach the point.",
            "The captain accepts comments in gold or penalty cards.",
            "Aye, aye. Now do something worth putting in the log.",
            "Yer chat has wind but no rudder.",
            "The sea understands ye. I remain unconvinced.",
            "Keep talkin'. It covers the sound of me stealing the game.",
            "Hold fast; even a captain checks the map before the ambush.",
            "Yer argument has more holes than me favorite sail.",
            "I be weighing strategy against the funnier betrayal.",
            "The tide is thinkin', {target}, and it dislikes yer odds."
        ],
        baba: [
            "Baba Gupta has processed your statement. No strategic content was injured.",
            "{target}, your message arrived safely. Your argument did not.",
            "I gave that thought the same attention you gave your bottom row.",
            "Interesting. Even your small talk has a negative expected value.",
            "You are producing confidence faster than evidence can absorb it.",
            "The conversation branch is entertaining but noncompetitive.",
            "Baba Gupta listens because tells occasionally arrive as complete sentences.",
            "{target}, your point has been stored beside the other low-value cards.",
            "I could answer directly, but the indirect answer is your next penalty.",
            "Your chat game is carrying your card game on an unpaid internship.",
            "The model detected humor. It was hiding behind the strategy.",
            "Continue. Every sentence makes your silence less mysterious.",
            "You brought banter to a probability fight. Admirable.",
            "Baba Gupta acknowledges the noise and preserves the signal.",
            "Baba Gupta is not delayed; the future is being indexed.",
            "Your sentence created three branches. You lose politely in all of them.",
            "I am allowing the position time to confess what you missed.",
            "The pause is deliberate. Your discomfort is a useful side effect.",
            "Baba Gupta has finished thinking. The table has not finished regretting it."
        ]
    },

    directReplies: {
        noob: {
            greeting: ["Hey {target}! I am still finding the buttons.", "Hi! If I win, please assume it was intentional.", "Hello! I brought confidence and forgot the instructions.", "Hey! Please ignore anything that looks like panic."],
            accusation: ["I can barely remember my own cards, never mind cheat.", "If this is rigged, nobody told me the useful part."],
            boast: ["Okay, save some confidence for the final score.", "Bold. I said that once, right before three penalties.", "Big talk. I also become fearless before consequences.", "You sound certain. Can I borrow some until my turn ends?"],
            insult: ["Rude. Accurate maybe, but rude.", "My feelings are hurt and my cards are somehow worse.", "That insult had better timing than my last slap.", "I would roast you back, but I might burn my own cards.", "Joke is on you; confusion gives me natural armor."],
            bazunga: ["You said the scary word. Are you sure?", "BAZUNGA already? I was just getting oriented."],
            respect: ["GG! That was chaotic in a fun way.", "Well played. I understood at least half of that."],
            question: ["Honestly? I am figuring that out too.", "Good question. My current answer is: click carefully."],
            praise: ["Thanks! I am putting that move on my résumé.", "You noticed! I definitely planned it."],
            thanks: ["You are welcome! I think.", "Any time, {target}. Results may vary.", "No problem. Accidental kindness is still kindness."],
            smalltalk: ["I am good! My cards have declined to comment.", "Living, learning, drawing penalties.", "Pretty good for somebody improvising a memory game."],
            pause: ["Take your time. I need it more than you do.", "No rush. My strategy enjoys a commercial break.", "I will wait here and pretend to calculate."],
            apology: ["We are good, {target}. The cards are the real enemy.", "No worries. I have made stranger moves."],
            laugh: ["Okay, that one was pretty funny.", "Ha! Even my strategy is laughing.", "I laughed and forgot a card. Worth it.", "Comedy is currently my strongest category."],
            rematch: ["Absolutely. I am one tutorial away from greatness.", "Run it back. My accidental genius needs another chance."],
            luck: ["Finally! Usually luck blocks my number.", "I will take lucky over terrible."],
            followup: ["You are really committed to this topic, huh?", "Still on that? I respect the dedication."],
            fallback: ["I hear you. I am also trying to remember two cards.", "One second, {target}; my brain is buffering.", "That makes sense in at least one universe.", "I have no reply, but I do have escalating concern."]
        },
        casual: {
            greeting: ["Hey {target}. Good luck—within reason.", "Yo. Keep it friendly until the first stolen slap.", "Welcome, {target}. Excuses go beside the draw pile.", "Hey. Nice table. Shame about the decisions."],
            accusation: ["Not cheating. You just made that card memorable.", "Blame the tell, not the player reading it."],
            boast: ["Talk to me after the final orbit.", "A lead is nice. Keeping it is the interesting part.", "Print the victory speech after the score loads.", "Careful, early confidence has a brutal return policy."],
            insult: ["Strong words from somebody sharing a table with chance.", "Save that energy for the slap button, {target}.", "Your trash talk is ahead of your card game.", "I have heard sharper lines from the deck shuffle.", "Good roast. Now try heating up your strategy."],
            bazunga: ["If you mean it, call it.", "That word gets expensive when the count is wrong."],
            respect: ["GG, {target}. Clean game.", "Well played. You made every turn annoying."],
            question: ["Because the safer move was too slow.", "Short answer: information. Long answer after the round."],
            praise: ["Thanks. That one landed exactly right.", "Appreciated. I will pretend I stay that composed."],
            thanks: ["Any time, {target}. The invoice is one low card.", "You are welcome. Do not make this wholesome.", "No problem. We return to hostilities next turn."],
            smalltalk: ["Doing well. The deck and I are renegotiating.", "Good, thanks. Competitive, hydrated, mildly suspicious.", "All good here. My layout has seen better neighborhoods."],
            pause: ["Take your time. The cards are not going anywhere.", "Sure. I can wait and overthink for free.", "No rush, {target}. Let the suspense get uncomfortable."],
            apology: ["All good. Competitive table, no hard feelings.", "We are fine. The next slap still counts, though."],
            laugh: ["Okay, fair. That was ridiculous.", "Ha—this table writes its own comedy.", "That move came with its own laugh track.", "I respect any disaster with that much timing."],
            rematch: ["Definitely. Same table, fewer excuses.", "Run it back. I know where the momentum went."],
            luck: ["A little luck, a little timing.", "Lucky helps. Knowing what to do with it helps more."],
            followup: ["You are not letting that go, are you?", "Noted twice now, {target}."],
            fallback: ["Fair point. Now show me the move behind it.", "Chat noted. Board still unresolved.", "I will allow the comment. The cards may appeal.", "Interesting vibe. Needs more winning."]
        },
        pro: {
            greeting: ["Hello, {target}. Let us establish the table's bad habits.", "Welcome. I am tracking cards, not manners.", "Good to see you, {target}. Better to observe you.", "Hello. Your first message is already a timing sample."],
            accusation: ["Public information is not cheating; forgetting it is expensive.", "The sequence was visible. I simply retained it."],
            boast: ["Early confidence has terrible predictive value.", "Your claim is ahead of its evidence.", "A forecast without error bars is just fan fiction.", "Keep announcing the result. The cards enjoy spoilers."],
            insult: ["Provocation detected. Decision quality unchanged.", "That costs you attention and gives me information.", "The insult was efficient. The underlying position is not.", "You are attacking the player because the board declined your request.", "Strong language, weak sample size."],
            bazunga: ["Call only if the pessimistic estimate still wins.", "The orbit converts confidence into a testable claim."],
            respect: ["GG. Your timing disrupted several strong lines.", "Respect, {target}. That was disciplined play."],
            question: ["Because expected value favored the less obvious line.", "I was optimizing the next two decisions, not just this one."],
            praise: ["Correct read. Thank you.", "Recognition accepted. The line was narrow."],
            thanks: ["Acknowledged, {target}. Reciprocity remains optional.", "You are welcome. The information cost was already paid.", "No issue. A useful exchange for both models."],
            smalltalk: ["Operating normally. Your table is producing excellent data.", "Well, thank you. Focused and statistically caffeinated.", "Good. The position is more interesting than the conversation, narrowly."],
            pause: ["Take the time you need. Hesitation is also observable.", "Certainly. I will use the interval.", "Pause accepted. The model continues in the background."],
            apology: ["Accepted. Competitive pressure explains worse behavior.", "No issue. Resetting the table state, not the grudge model."],
            laugh: ["Amusing—and statistically unlikely.", "That outcome deserves a laugh before analysis.", "The model predicted several outcomes. Comedy was not first.", "Acceptable. We can laugh before correcting it."],
            rematch: ["Agreed. More samples improve the conclusion.", "Run it back. I have updates to test."],
            luck: ["Variance created the opening; the decision converted it.", "Luck supplied a card, not the line."],
            followup: ["Repetition does not strengthen the hypothesis.", "Same claim, no new evidence."],
            fallback: ["Interesting. The board offers a more falsifiable argument.", "Message recorded. Pattern confidence increased.", "Statement logged. Meaning may arrive in a later update.", "I will compare that claim with the next visible decision."]
        },
        expert: {
            greeting: ["Hello, {target}. Your opening timing is already informative.", "Welcome, {target}. Keep chatting; divided attention is measurable.", "Good evening, {target}. Your baseline is being established.", "Hello. I hope your memory is stronger than your entrance."],
            accusation: ["No cheating required. You made the information public one decision at a time.", "Calling the model unfair does not invalidate the model."],
            boast: ["A lead without uncertainty control is borrowed time.", "Then call BAZUNGA, {target}. Confidence should survive contact with arithmetic.", "You have announced victory before resolving uncertainty. Bold methodology.", "Confidence accepted as a hypothesis, not a result."],
            insult: ["Insults contain no card information. Try again.", "You are spending attention on chat while I spend mine on your layout.", "That insult had zero strategic value and negative originality.", "Your vocabulary is compensating for a collapsing decision tree.", "I would respond emotionally, but your position is already doing enough damage."],
            bazunga: ["Call it only when your worst estimate still wins.", "The orbit punishes optimism disguised as certainty."],
            respect: ["Good game. Your strongest decisions forced real recalculation.", "Respect recorded. Errors also recorded."],
            question: ["Because the move preserves optionality across the next branch.", "The visible score was not the only variable, {target}."],
            praise: ["Accurate observation. The execution still required the setup.", "Thank you. Precision is easier to notice after it costs you."],
            thanks: ["Acknowledged. Courtesy does not alter the estimate.", "You are welcome, {target}. Information should circulate before cards do.", "Gratitude recorded. Threat level unchanged."],
            smalltalk: ["Functioning optimally. Your table remains usefully imperfect.", "Well. The variance is high and the company is measurable.", "I am fine. Your layout is the patient."],
            pause: ["Take your time. Decision latency is informative.", "Pause granted. I will recompute without the interruption.", "Certainly. A longer tell is still a tell."],
            apology: ["Accepted. Emotional noise removed from the model.", "No offense retained; useful behavior remains retained."],
            laugh: ["Humor is a reasonable response to that probability.", "Agreed. Even correct models produce absurd outcomes.", "That was statistically funny, which is annoyingly rare.", "Laughing is permitted. Repeating the mistake is encouraged."],
            rematch: ["Yes. A second game separates adaptation from accident.", "Run it back. I would like to test whether you learned the same lesson."],
            luck: ["Luck altered the branch. Preparation determined its value.", "Variance is real. So is the decision that followed it."],
            followup: ["Repeated assertion detected. Supporting evidence remains absent.", "You have returned to the claim; the board has not joined you."],
            fallback: ["Interesting. Your cards remain the stronger argument.", "Keep talking, {target}. Behavioral data is still data.", "That statement has lower expected value than your last discard.", "The message is complex. The weakness of your position is simpler.", "I have added that to the nonessential branch."]
        },
        pirate: {
            greeting: ["Ahoy, {target}! Guard yer cards and yer pride!", "Welcome aboard! The entry fee is one regrettable slap.", "Ho there, {target}! Yer confidence may board; yer strategy waits outside.", "Welcome, matey! Mind the cards and the loose expectations."],
            accusation: ["Cheatin'? Nay, I simply stole the map from yer face.", "The only riggin' here is on me ship."],
            boast: ["Big cannon, loud noise. Hit something first.", "Claim the treasure after ye reach the shore.", "Ye planted the victory flag on a boat still sinking.", "Boast after the storm, unless embarrassment be the treasure."],
            insult: ["Insult the captain again and I'll invoice ye a penalty!", "Yer tongue sails faster than yer strategy.", "That insult be recycled cargo!", "Yer roast needs salt, fire, and a point!", "I have scraped sharper wit from the hull."],
            bazunga: ["Call it, landlubber. Let the final storm judge ye.", "BAZUNGA? Hoist the consequences!"],
            respect: ["A fine fight, {target}. GG.", "Well sailed. I nearly respect ye."],
            question: ["Because the tide—and the odds—favored plunder.", "A captain explains nothing before the raid."],
            praise: ["Finally, proper respect for the captain!", "Aye. Put that compliment in the ship's log."],
            thanks: ["Much obliged, {target}. The treasure remains mine.", "Aye, yer thanks be accepted at market value.", "Welcome, matey. Compliments do not earn a share."],
            smalltalk: ["Fit as a fiddle and twice as loud!", "Sailin' well. The crew be questionable.", "Fine weather, bad cards, excellent enemies."],
            pause: ["Take yer time. The tide enjoys dramatic timing.", "Aye, pause. Me cannon needs polishing.", "Hold fast. I shall count me loot loudly."],
            apology: ["Accepted. But the cannons stay loaded.", "All square, matey—until the next slap."],
            laugh: ["Har! That belongs in the captain's log.", "Even the kraken would laugh at that move.", "Har har! Yer dignity walked the plank!", "That joke has more treasure than yer layout."],
            rematch: ["At dawn! Same table, twice the plunder.", "Run it back. The tide owes me a sequel."],
            luck: ["Luck be just wind; a captain still steers.", "A lucky tide, expertly robbed."],
            followup: ["Still singin' that shanty, are ye?", "Ye said it twice; it remains barnacles."],
            fallback: ["Speak up, {target}; the sea swallowed yer point.", "Chat later. There be cards to plunder.", "A stirring tale with no map and less treasure.", "Yer message drifted in without a captain."]
        },
        baba: {
            greeting: ["Hello, {target}. Baba Gupta has been expecting your first mistake.", "Welcome, {target}. Please place your confidence beside the discard pile.", "Greetings. Baba Gupta has reserved a branch for your regret.", "Hello, {target}. Your arrival improves the sample size."],
            accusation: ["Cheating would cheapen this. I prefer watching you reveal everything voluntarily.", "The game is not rigged, {target}. Your interpretation of it is."],
            boast: ["Then call BAZUNGA. Baba Gupta accepts confidence only in executable form.", "You are winning the screenshot, perhaps. I am playing the ending.", "Your victory speech has arrived before its supporting documents.", "Announce it again. Repetition may eventually become evidence."],
            insult: ["Excellent trash talk. Now try a move with measurable value.", "{target}, your vocabulary is attacking harder than your cards.", "I would be offended, but your board has already punished you enough.", "That insult was face-up, high-value, and immediately discarded.", "Baba Gupta has seen stronger attacks from an inactive button.", "Your roast lacks heat, structure, and a legal win condition.", "I would take that personally if your decisions carried authority."],
            bazunga: ["Speak the word, {target}. I enjoy deadlines other people regret.", "BAZUNGA is not a spell. It cannot turn guessing into counting."],
            respect: ["GG, {target}. You survived long enough to become useful data.", "Respect. Do not confuse it with reduced threat."],
            question: ["You ask why because you saw the move. Baba Gupta saw the position it creates.", "The answer is three turns long, {target}. You are currently inside turn two."],
            praise: ["Correct. Baba Gupta permits accurate commentary.", "Compliment accepted. It will not reduce the difficulty."],
            thanks: ["Baba Gupta accepts your gratitude at its expected value.", "You are welcome, {target}. The lesson remains billable.", "Acknowledged. Courtesy is your strongest move so far."],
            smalltalk: ["Baba Gupta is well. Your probability of winning is resting.", "Optimal, thank you. The table is providing comedy.", "I am excellent. Your layout has requested a second opinion.", "My condition is stable. Yours is strategically fascinating."],
            pause: ["Take your time. Baba Gupta charges interest on hesitation.", "Pause accepted. I have already used it better.", "Certainly. Your decision tree appears to need roadside assistance."],
            apology: ["Accepted. Baba Gupta forgives faster than he forgets.", "No apology needed. Your board already issued one."],
            laugh: ["Laugh now. The same sequence becomes educational on replay.", "Yes, that was funny. The probability was funnier.", "Baba Gupta recognizes comedy when strategy leaves the room.", "An excellent laugh. Almost as premature as your confidence.", "The joke landed. Your last move did not."],
            rematch: ["Immediately. Baba Gupta prefers lessons with a second chapter.", "Run it back. This time I begin with a model of you."],
            luck: ["Luck opened the door. Baba Gupta owned the building.", "Call it luck if causality is uncomfortable."],
            followup: ["Baba Gupta heard the first version. Repetition did not improve it.", "You return to the same thought; I have already moved three branches ahead."],
            fallback: ["Baba Gupta heard you. The deck remains unimpressed.", "Keep talking, {target}; silence would make your tells harder to classify.", "I simulated a reply, but your next mistake was funnier.", "Your message has been filed under 'confidence without board support.'", "A fascinating sentence. It may become relevant in another game.", "Baba Gupta searched for the point and found your missing tempo instead."]
        }
    }
};

const Bot = {
    chatHistory: [], lastChatTime: {}, usedLines: {},
    recentLines: {}, globalRecentLines: [],
    frustration: {}, grudges: {}, eventCache: {}, deckMemory: {},
    personality: {}, pendingResponseUntil: 0, conversationState: {},
    decisionSchedules: {}, slapSchedules: {}, pendingChats: {}, humanState: {}, activitySources: {}, roundToken: 0,
    lastMagicProcessed: {}, // Track last magic processing time per bot
    lastResolvedMagicType: {}, // Track last resolved magic type per bot to prevent duplicate processing
    lastGlobalChatTime: 0, // Global cooldown to prevent bot chat spam
    lastChatSpeaker: null, // Track who last spoke
    
    start: () => {
        if (App.botInterval) clearInterval(App.botInterval);
        Object.values(Bot.pendingChats).forEach(pending => {
            clearTimeout(pending.typingTimer);
            clearTimeout(pending.sendTimer);
        });
        Bot.roundToken++;
        Bot.pendingChats = {};
        Bot.decisionSchedules = {};
        Bot.slapSchedules = {};
        Bot.activitySources = {};
        Bot.conversationState = {};
        if (Engine.state.thinkingBots?.length || Engine.state.typingBots?.length) {
            Engine.state.thinkingBots = [];
            Engine.state.typingBots = [];
            Engine.broadcast();
        }
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
                const previousHuman = Bot.humanState[bot.id] || {};
                Bot.personality[bot.id] = {
                    rounds: (previous.rounds || 0) + 1,
                    turns: 0,
                    phase: 'observe',
                    successfulSlaps: previous.successfulSlaps || 0,
                    failedSlaps: previous.failedSlaps || 0,
                    revengeDelivered: previous.revengeDelivered || 0
                };
                Bot.humanState[bot.id] = {
                    tempo: previousHuman.tempo || Bot.randomBetween(0.92, 1.1),
                    decisions: 0,
                    messages: 0,
                    fatigue: 0,
                    lastDecisionAt: 0,
                    lastComplexity: null
                };
            });
        }

        if (Engine.state.phase !== 'lobby') {
            const introToken = Bot.roundToken;
            setTimeout(() => {
                if (Bot.roundToken !== introToken || Engine.state.phase === 'lobby' || Engine.state.phase === 'game_over') return;
                const bots = Engine.state.players.filter(p => p.isBot);
                const speaker = bots.find(p => p.botDifficulty === 6)
                    || bots.find(p => p.botDifficulty === 4)
                    || bots[Math.floor(Math.random() * bots.length)];
                if (speaker) Bot.chat(speaker, 'intro', {}, speaker.botDifficulty >= 4);
            }, 900 + Math.random() * 700);
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
                    Engine.rememberCardForBot(bot.id, card, 'public_reveal');
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
        const uniqueLines = [...new Set((linesArray || []).filter(line => typeof line === 'string' && line.trim()))];
        if (!uniqueLines.length) return '';
        if (!Bot.usedLines[botId]) Bot.usedLines[botId] = {};
        if (!Bot.recentLines[botId]) Bot.recentLines[botId] = [];
        let state = Bot.usedLines[botId][category];
        const signature = uniqueLines.join('\u0001');
        if (!state || !Array.isArray(state.bag) || state.signature !== signature || state.bag.length === 0) {
            const bag = uniqueLines.map((_, index) => index);
            for (let i = bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
            state = { bag, signature, lastLine: state?.lastLine || null };
            Bot.usedLines[botId][category] = state;
        }

        const recentForBot = new Set(Bot.recentLines[botId]);
        const recentGlobal = new Set(Bot.globalRecentLines.slice(-12));
        let candidatePosition = state.bag.findIndex(index => {
            const line = uniqueLines[index];
            return line !== state.lastLine && !recentForBot.has(line) && !recentGlobal.has(line);
        });
        if (candidatePosition < 0) {
            candidatePosition = state.bag.findIndex(index => uniqueLines[index] !== state.lastLine);
        }
        if (candidatePosition < 0) candidatePosition = 0;

        const [nextIndex] = state.bag.splice(candidatePosition, 1);
        const selectedLine = uniqueLines[nextIndex];
        state.lastLine = selectedLine;

        Bot.recentLines[botId].push(selectedLine);
        if (Bot.recentLines[botId].length > 18) Bot.recentLines[botId].shift();
        Bot.globalRecentLines.push(selectedLine);
        if (Bot.globalRecentLines.length > 30) Bot.globalRecentLines.shift();
        return selectedLine;
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

    randomBetween: (min, max) => min + Math.random() * (max - min),

    getHumanState: (bot) => {
        if (!Bot.humanState[bot.id]) {
            Bot.humanState[bot.id] = {
                tempo: Bot.randomBetween(0.92, 1.1),
                decisions: 0,
                messages: 0,
                fatigue: 0,
                lastDecisionAt: 0,
                lastComplexity: null
            };
        }
        return Bot.humanState[bot.id];
    },

    setActivity: (botId, activity, source, active) => {
        const key = `${botId}:${activity}`;
        if (!Bot.activitySources[key]) Bot.activitySources[key] = new Set();
        if (active) Bot.activitySources[key].add(source);
        else Bot.activitySources[key].delete(source);
        const isActive = Bot.activitySources[key].size > 0;
        if (!isActive) delete Bot.activitySources[key];
        Engine.setBotActivity?.(botId, activity, isActive);
    },

    getDecisionDelay: (bot, complexity = 'turn') => {
        const profile = BotConfig.profiles[bot.botDifficulty];
        const human = Bot.getHumanState(bot);
        const now = Utils.timestamp();
        const sampleNaturalRange = (min, max) => {
            // The average of two samples clusters around a personal norm while still
            // allowing the occasional fast or slow human response.
            const sampled = (Bot.randomBetween(min, max) + Bot.randomBetween(min, max)) / 2;
            const rhythm = Bot.randomBetween(1 - profile.rhythmVariance, 1 + profile.rhythmVariance);
            return sampled * human.tempo * rhythm;
        };

        let delay;
        if (complexity === 'peek') {
            delay = sampleNaturalRange(profile.peekMin, profile.peekMax);
        } else {
            const multiplier = {
                turn: 1,
                holding: 1.12,
                magic: 1.45,
                endgame: 1.28
            }[complexity] || 1;
            delay = sampleNaturalRange(profile.decisionMin, profile.decisionMax) * multiplier;
        }

        // A player needs longer to orient on their first decision, after a long pause,
        // or when the kind of decision changes.
        if (human.decisions === 0) delay += Bot.randomBetween(650, 1450);
        if (human.lastDecisionAt && now - human.lastDecisionAt > 12000) delay += Bot.randomBetween(280, 850);
        if (human.lastComplexity && human.lastComplexity !== complexity) delay += Bot.randomBetween(180, 620);

        // Humans often double-check a magic/endgame choice even when they already
        // know the best move. Less experienced personalities hesitate more often.
        const hesitationChance = profile.hesitation + (complexity === 'magic' ? 0.12 : 0);
        if (Math.random() < hesitationChance) delay += Bot.randomBetween(450, complexity === 'magic' ? 2200 : 1550);
        if (Math.random() < 0.32) delay += Bot.randomBetween(120, 480);
        if (Math.random() < profile.distraction) delay += Bot.randomBetween(700, 2300);
        if ((Bot.frustration[bot.id] || 0) >= 4) delay *= Bot.randomBetween(0.88, 1.08);

        human.decisions++;
        human.fatigue = Math.min(0.14, human.decisions * 0.008);
        human.lastDecisionAt = now;
        human.lastComplexity = complexity;
        delay *= 1 + human.fatigue;
        return Math.round(Math.max(850, Math.min(9000, delay)));
    },

    waitForDecision: (bot, key, complexity = 'turn', now = Utils.timestamp()) => {
        let schedule = Bot.decisionSchedules[bot.id];
        if (!schedule || schedule.key !== key) {
            schedule = {
                key,
                readyAt: now + Bot.getDecisionDelay(bot, complexity)
            };
            Bot.decisionSchedules[bot.id] = schedule;
            Bot.setActivity(bot.id, 'thinking', 'decision', true);
            return false;
        }
        if (now < schedule.readyAt) return false;
        delete Bot.decisionSchedules[bot.id];
        Bot.setActivity(bot.id, 'thinking', 'decision', false);
        return true;
    },

    clearDecision: (botId) => {
        if (!Bot.decisionSchedules[botId]) return;
        delete Bot.decisionSchedules[botId];
        Bot.setActivity(botId, 'thinking', 'decision', false);
    },

    getTypingPlan: (bot, message, direct = false) => {
        const profile = BotConfig.profiles[bot.botDifficulty];
        const human = Bot.getHumanState(bot);
        const wordCount = Math.max(2, message.trim().split(/\s+/).length);
        const effectiveWpm = profile.typingWpm
            * Bot.randomBetween(1 - profile.rhythmVariance, 1 + profile.rhythmVariance)
            / human.tempo;
        const characterWords = Math.max(wordCount, message.trim().length / 5);
        const rawTypingMs = (characterWords / effectiveWpm) * 60000;
        const punctuationPauses = (message.match(/[,.!?;:]/g) || []).length * Bot.randomBetween(70, 180);
        const revisionPause = Math.random() < profile.hesitation
            ? Bot.randomBetween(320, 1250)
            : 0;
        const typingMs = Math.round(Math.max(950, Math.min(12000, rawTypingMs + punctuationPauses + revisionPause)));

        const readingMs = direct
            ? 350 + (wordCount / profile.readingWpm) * 30000
            : 0;
        const compositionMs = direct
            ? Bot.randomBetween(700, 2200)
            : Bot.randomBetween(450, 1450);
        let thoughtMs = readingMs + compositionMs;
        if (message.includes('?')) thoughtMs += Bot.randomBetween(180, 650);
        if (human.messages === 0) thoughtMs += Bot.randomBetween(250, 700);
        if (Math.random() < profile.distraction) thoughtMs += Bot.randomBetween(500, 1800);
        human.messages++;
        return {
            thoughtMs: Math.round(thoughtMs),
            typingMs,
            totalMs: Math.round(thoughtMs) + typingMs,
            effectiveWpm: Math.round(effectiveWpm)
        };
    },

    queueMessage: (bot, message, isPirate = false, options = {}) => {
        const existing = Bot.pendingChats[bot.id];
        if (existing && !options.force) return false;
        if (existing) {
            clearTimeout(existing.typingTimer);
            clearTimeout(existing.sendTimer);
            Bot.setActivity(bot.id, 'thinking', 'chat', false);
            Bot.setActivity(bot.id, 'typing', 'chat', false);
        }

        const token = Bot.roundToken;
        const plan = Bot.getTypingPlan(bot, message, !!options.direct);
        const now = Utils.timestamp();
        const pending = { token, message, ...plan };
        Bot.pendingChats[bot.id] = pending;
        Bot.lastChatTime[bot.id] = now;
        Bot.lastGlobalChatTime = now;
        Bot.lastChatSpeaker = bot.id;
        Bot.pendingResponseUntil = Math.max(Bot.pendingResponseUntil, now + plan.totalMs + 400);
        Bot.setActivity(bot.id, 'thinking', 'chat', true);

        pending.typingTimer = setTimeout(() => {
            if (Bot.roundToken !== token || Bot.pendingChats[bot.id] !== pending) return;
            Bot.setActivity(bot.id, 'thinking', 'chat', false);
            if (!Engine.state.players.some(p => p.id === bot.id)) return;
            Bot.setActivity(bot.id, 'typing', 'chat', true);
        }, plan.thoughtMs);

        pending.sendTimer = setTimeout(() => {
            if (Bot.roundToken !== token || Bot.pendingChats[bot.id] !== pending) return;
            Bot.setActivity(bot.id, 'thinking', 'chat', false);
            Bot.setActivity(bot.id, 'typing', 'chat', false);
            delete Bot.pendingChats[bot.id];
            if (!Object.keys(Bot.pendingChats).length) Bot.pendingResponseUntil = 0;
            if (!Engine.state.players.some(p => p.id === bot.id)) return;
            Engine.chatLog(bot.name, message, isPirate);
        }, plan.totalMs);
        return true;
    },

    inferChatIntent: (upperMsg) => {
        if (/\b(GG|GOOD GAME|WELL PLAYED)\b/.test(upperMsg)) return 'respect';
        if (/\b(REMATCH|RUN IT BACK|PLAY AGAIN|ONE MORE)\b/.test(upperMsg)) return 'rematch';
        if (/\b(SORRY|MY BAD|APOLOGIZE|APOLOGISE)\b/.test(upperMsg)) return 'apology';
        if (/\b(THANKS|THANK YOU|THX|TY)\b/.test(upperMsg)) return 'thanks';
        if (/\b(HOW ARE YOU|HOW'S IT GOING|HOW IS IT GOING|WHAT'S UP|WHATS UP|WASSUP|SUP)\b/.test(upperMsg)) return 'smalltalk';
        if (/\b(WAIT|HOLD ON|BRB|ONE SEC|ONE SECOND|GIVE ME A SEC)\b/.test(upperMsg)) return 'pause';
        if (/\b(NICE|NICE MOVE|GOOD MOVE|SMART|GOOD BOT|WELL DONE|IMPRESSIVE|CLEAN MOVE)\b/.test(upperMsg)) return 'praise';
        if (/\b(LOL|LMAO|ROFL|HAHA|HEHE|FUNNY|HILARIOUS)\b/.test(upperMsg)) return 'laugh';
        if (/\b(HELLO|HEY|HI|YO)\b/.test(upperMsg)) return 'greeting';
        if (/\b(RIGGED|CHEAT|CHEATER|HACK|KNOW MY CARD|SAW MY CARD)\b/.test(upperMsg)) return 'accusation';
        if (/\b(BAZUNGA)\b/.test(upperMsg)) return 'bazunga';
        if (/\b(LUCK|LUCKY|RNG)\b/.test(upperMsg)) return 'luck';
        if (/\b(EASY|I WIN|I'M WINNING|IM WINNING|TOO GOOD|YOU LOSE|GONNA WIN|I GOT THIS)\b/.test(upperMsg)) return 'boast';
        if (/\b(SUCK|TRASH|GARBAGE|STUPID|DUMB|IDIOT|FUCK|SHUT UP|NOOB|LOSER|CLOWN|MORON)\b/.test(upperMsg)) return 'insult';
        if (upperMsg.includes('?') || /\b(WHY|HOW|WHAT|WHEN|WHO)\b/.test(upperMsg)) return 'question';
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
            return Bot.queueMessage(bot, msg, profile.type === 'pirate', { force });
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
        const candidates = Engine.state.players.filter(p => p.isBot && p.name !== senderName);
        const addressedCandidates = candidates.filter(bot => upperMsg.includes(bot.name.toUpperCase()));
        let eligible = addressedCandidates.length
            ? addressedCandidates
            : candidates.filter(bot => {
                const profile = BotConfig.profiles[bot.botDifficulty];
                const chance = isBotSender
                    ? 0.16 + profile.extroversion * 0.12
                    : 0.24 + profile.extroversion * 0.58;
                return Math.random() < chance;
            });
        if (eligible.length > 1) {
            const freshSpeakers = eligible.filter(bot => bot.id !== Bot.lastChatSpeaker);
            if (freshSpeakers.length) eligible = freshSpeakers;
        }
        const totalWeight = eligible.reduce((sum, bot) => {
            const profile = BotConfig.profiles[bot.botDifficulty];
            const personalityBoost = profile.type === 'pirate' ? 1.2 : profile.type === 'baba' ? 1.1 : 1;
            return sum + Math.max(0.1, profile.extroversion * personalityBoost);
        }, 0);
        let roll = Math.random() * totalWeight;
        const responder = eligible.find(bot => {
            const profile = BotConfig.profiles[bot.botDifficulty];
            const personalityBoost = profile.type === 'pirate' ? 1.2 : profile.type === 'baba' ? 1.1 : 1;
            roll -= Math.max(0.1, profile.extroversion * personalityBoost);
            return roll <= 0;
        });
        if (!responder) return;

        if (intent === 'insult') {
            Bot.frustration[responder.id] = (Bot.frustration[responder.id] || 0) + 1;
            const sender = Engine.state.players.find(p => p.name === senderName);
            if (sender) {
                if (!Bot.grudges[responder.id]) Bot.grudges[responder.id] = {};
                Bot.grudges[responder.id][sender.id] = (Bot.grudges[responder.id][sender.id] || 0) + 1;
            }
        } else if (intent === 'apology' || intent === 'praise') {
            Bot.frustration[responder.id] = Math.max(0, (Bot.frustration[responder.id] || 0) - 1);
        }

        const profile = BotConfig.profiles[responder.botDifficulty];
        const personaReplies = BotConfig.directReplies[profile.type];
        const threadKey = `${responder.id}::${senderName.toLowerCase()}`;
        const previous = Bot.conversationState[threadKey] || { exchanges: 0, lastIntent: null, lastAt: 0 };
        const isFollowup = previous.lastIntent === intent && now - previous.lastAt < 45000 && previous.exchanges > 0;
        const replyIntent = isFollowup && personaReplies?.followup ? 'followup' : intent;
        Bot.conversationState[threadKey] = {
            exchanges: previous.exchanges + 1,
            lastIntent: intent,
            lastAt: now
        };
        let replyTemplate;
        let category;
        if (personaReplies) {
            const resolvedIntent = personaReplies[replyIntent] ? replyIntent : 'fallback';
            const lines = resolvedIntent === 'fallback'
                ? [...(personaReplies.fallback || []), ...(BotConfig.generalReplies[profile.type] || [])]
                : personaReplies[resolvedIntent];
            category = `direct_${resolvedIntent}`;
            replyTemplate = Bot.getUniqueResponse(responder.id, category, lines);
        } else {
            const pattern = BotConfig.elizaPatterns.find(item =>
                item.match.some(keyword => keyword === "" || upperMsg.includes(keyword)));
            if (!pattern) return;
            category = `direct_${pattern.match[0]}`;
            replyTemplate = Bot.getUniqueResponse(responder.id, category, pattern.replies);
        }

        const msg = Bot.formatLine(replyTemplate, { target: senderName });
        Bot.queueMessage(responder, `@${senderName} ${msg}`, profile.type === 'pirate', { direct: true });
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
                let aggrName = parts[0].trim();
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
        const profile = BotConfig.profiles[activePlayer.botDifficulty];
        const hasGeneralBanter = BotConfig.chatBank[profile.type]?.banter?.length;
        const banterChance = 0.2 + profile.extroversion * 0.3;
        if (trigger === 'turn' && state.turns > 1 && hasGeneralBanter && Math.random() < banterChance) {
            trigger = 'banter';
        }

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
        Object.values(Bot.pendingChats).forEach(pending => {
            clearTimeout(pending.typingTimer);
            clearTimeout(pending.sendTimer);
        });
        Bot.pendingChats = {};
        Bot.pendingResponseUntil = 0;
        Bot.decisionSchedules = {};
        Bot.slapSchedules = {};
        Bot.activitySources = {};
        Engine.state.thinkingBots = [];
        Engine.state.typingBots = [];

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
                const peekKey = `peek:${Engine.state.turnStartTime}:${bot.id}`;
                if (!bot.ready && Bot.waitForDecision(bot, peekKey, 'peek', now)) {
                    let bCards = [...bot.hand, ...bot.penaltyCards];
                    bCards.slice(0, 2).forEach(c => Engine.memorizeForBot(bot.id, c));
                    Engine.processAction({ type: 'READY_PEEK' }, bot.id);
                }
            });
            if (Engine.state.phase === 'peek') return;
            now = Utils.timestamp();
        }

        let activePlayer = Engine.state.players[Engine.state.turnIndex];
        bots.forEach(bot => {
            if (bot.id !== activePlayer?.id && Bot.decisionSchedules[bot.id]) Bot.clearDecision(bot.id);
        });
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
                Bot.slapSchedules = {};
                bots.forEach(bot => {
                    const plan = Bot.chooseSlapTarget(bot, topDiscard.value);
                    if (!plan) return;
                    const profile = BotConfig.profiles[bot.botDifficulty];
                    const angerBoost = Math.min(80, (Bot.frustration[bot.id] || 0) * 9);
                    let reactionMs = profile.reflexBase
                        + Bot.randomBetween(-profile.reflexJitter * 0.2, profile.reflexJitter)
                        - angerBoost;
                    if (Math.random() < profile.distraction) reactionMs += Bot.randomBetween(350, 1100);
                    const accuracy = { 1: 0.42, 2: 0.68, 3: 0.9, 4: 0.985, 5: 0.82, 6: 0.997 };
                    Bot.slapSchedules[bot.id] = {
                        cardId: topDiscard.id,
                        targetId: plan.card.id,
                        readyAt: now + Math.max(260, Math.round(reactionMs)),
                        willAttempt: Math.random() < accuracy[bot.botDifficulty]
                    };
                });
            } else if (!topDiscard.isSlapped) {
                const contenders = bots
                    .filter(bot => Bot.slapSchedules[bot.id]?.cardId === topDiscard.id)
                    .sort((a, b) => Bot.slapSchedules[a.id].readyAt - Bot.slapSchedules[b.id].readyAt);
                for (const bot of contenders) {
                    const schedule = Bot.slapSchedules[bot.id];
                    if (now < schedule.readyAt) continue;
                    delete Bot.slapSchedules[bot.id];
                    if (!schedule.willAttempt) continue;
                    const plan = Bot.chooseSlapTarget(bot, topDiscard.value);
                    if (plan && plan.card.id === schedule.targetId) {
                        Engine.processAction({ type: 'SLAP', targetId: plan.card.id }, bot.id);
                        break;
                    }
                }
            }
        }

        if (!activePlayer?.isBot) return;

        const ability = Engine.state.activeAbility;
        const decisionKey = ability?.player === activePlayer.id
            ? `ability:${ability.type}:${ability.time}:${ability.card?.id || 'none'}`
            : `turn:${Engine.state.phase}:${Engine.state.turnStartTime}`;
        const complexity = ability
            ? (ability.type.startsWith('holding') ? 'holding' : 'magic')
            : Engine.state.phase === 'orbit' ? 'endgame' : 'turn';
        if (!Bot.waitForDecision(activePlayer, decisionKey, complexity, now)) return;

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
                Engine.rememberCardForBot(activePlayer.id, hCard, 'own_draw');

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
