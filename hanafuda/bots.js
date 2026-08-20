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

    const CHAT_POOLS = {
        shared: {
            greeting: [
                'Yo. You playing or just warming up the keyboard?', 'There you are. I thought the flowers scared you off.',
                'Hey, {name}. Keep one eye on the field.', 'Sup. The table is already judging us both.',
                'Mate, I am right here. Try a card next.', 'Hello again. Same table, fresh bad ideas.',
                'Bro detected. Strategy still loading.', 'Yeah, dude? I am busy stealing your months.',
                'Oi. Say it with a card.', 'Present and annoyingly comfortable.',
                'What is up? Apart from my chances.', 'Hey. No speech needed—show me the hand.',
                'I hear you. The deck does not care.', 'Morning, evening, whatever. Your turn still stinks.',
                'Alright, mate. Let us make this month messy.'
            ],
            insult: [
                'That is a lot of mouth for {theirCards} cards.', 'Fuck me? Win a month first.',
                'Strong language. Weak field control.', 'You sound rattled. I like the honesty.',
                'Call me whatever you want; the pair is still mine.', 'Save some rage for the scoreboard, mate.',
                'That insult had more structure than your last turn.', 'Cute. Now watch the field bite you.',
                'You type harder than you play.', 'Talk your shit. I respect the commitment.',
                'Bit rude. Almost as rude as that card you donated.', 'I have heard worse from people with actual Yaku.',
                'Keep swinging. One of those words might score.', 'Temper, temper. The flowers are delicate.',
                'That all? I expected at least a decent threat.', 'You are furious at some very small rectangles.',
                'Good heat. Bad aim.', 'I would answer properly, but your turn already insulted you.'
            ],
            family: [
                'My mother would still spot that match before you.', 'Leave the mums out of it; yours has suffered enough watching this.',
                'Yo mama called. She wants a stronger punchline.', 'Family roast accepted. Card skills still declined.',
                'My mum is cardboard? Yours must be the instruction sheet you skipped.', 'That mum joke arrived late and without a matching month.',
                'A classic mum joke. Dusty, but I respect the effort.', 'Your mother raised a confident typist, I will give her that.',
                'Tell your mum I said your last move was brave.', 'Mum jokes already? This month got ugly fast.',
                'Your family deserves compensation for this strategy.', 'Solid family roast. Shame it scores zero.'
            ],
            question: [
                'Good question. Bad time—I am setting a trap.', 'Maybe. What are you offering for the answer?',
                'Ask the field. It has been more honest than either of us.', 'Short answer: yes. Useful answer: watch the months.',
                'I could explain, but then you might improve.', 'Depends. Are you asking me or blaming the deck?',
                'Probably. This table has done stranger shit.', 'I was wondering the same thing, honestly.',
                'That question has layers. Your hand needs some.', 'Give me one turn and I will demonstrate.',
                'No clue, mate. I am improvising with confidence.', 'The answer is somewhere under your last mistake.',
                'Ask again after the draw; I may become wise.', 'Maybe not. That is what makes this fun.',
                'I know the answer, but I enjoy the suspense.'
            ],
            where: [
                'Right here, watching you lose track of the months.', 'At the table, mate. Emotionally? Miles ahead.',
                'Where am I? Near your next bad decision.', 'I am in the flower garden, stealing anything unattended.',
                'Still here. You cannot get rid of me that easily.', 'Behind you on points—or in front. Check {lead}.',
                'Somewhere between the deck and your panic.', 'Right beside the pair you failed to notice.',
                'Here. The tiny cards make me look taller.', 'In round {round}, apparently living rent-free in the chat.',
                'Exactly where the good cards keep landing.', 'Lost? Follow the red borders back to the table.'
            ],
            challenge: [
                'No, I have plenty. I am spacing it out for your safety.', 'You want the good material? Give me a good move.',
                'That is not all I have. It is all you have earned.', 'Careful asking for more; the deck might listen.',
                'I can turn it up. Can your hand?', 'Challenge accepted. Regret pending.',
                'You keep talking and I will start trying.', 'Big request from someone holding {theirCards} cards.',
                'Plenty left, mate. I was using the child-safe setting.', 'Fine. Gloves off, flowers out.',
                'Beat the next play and I will upgrade the insults.', 'You want smoke from a flower-card bot? Beautiful.'
            ],
            compliment: [
                'Cheers. Do not get used to me agreeing with you.', 'Fair play—that one was clean.',
                'Thanks, mate. Your last move was not bad either.', 'A compliment? Check the deck for a misdeal.',
                'Respect. We can resume being idiots now.', 'I will take it. Points would be nicer.',
                'That was almost wholesome. Disgusting.', 'Good eye. You may survive this month yet.',
                'Cheers. You are less hopeless than advertised.', 'Right back at you—that capture had teeth.'
            ],
            confusion: [
                'Match the month, not the picture. That is the whole trick.', 'Same month captures. Yaku scores. Panic is optional.',
                'Tap a card; if two matches exist, choose the pair you want.', 'Koi-Koi means risk it. Shobu means bank it and breathe.',
                'Watch the month number first. The artwork is there to distract you beautifully.',
                'You are not alone—these tiny bastards take a minute to learn.', 'Check ALL 48 if the flowers are blending together.',
                'No matching month means your card stays on the field.', 'Two possible matches? Pick which field card you want.',
                'Make a Yaku and the big red and gold buttons will appear.', 'It looks complicated until it suddenly does not.',
                'Ask the exact bit that is confusing and I will translate.'
            ],
            luck: [
                'Luck helped. I still had to notice the match.', 'Blame the deck; it cannot hear you.',
                'Bad luck is just good comedy from the other chair.', 'The draw was filthy. I admit it.',
                'I got lucky. Please complain in writing.', 'Some days the pond hands you a fish.',
                'The deck likes me more. Personality issue, perhaps.', 'That was luck wearing a clever hat.',
                'Your luck is not dead. It is taking a very long break.', 'Fair—there was absolutely some bullshit in that draw.'
            ],
            repeat: [
                'You said that already. It has not aged.', 'Same line twice? At least rotate the insults.',
                'Mate, the chat has an echo.', 'I heard you the first time. The cards did too.',
                'Repeating it will not make a Yaku appear.', 'New sentence, same panic.',
                'We have looped. Somebody shuffle the conversation.', 'Again? Your dialogue deck needs more cards.',
                'That message came back like unwanted chaff.', 'Déjà vu, but somehow louder.',
                'You are recycling chat while I recycle your hopes.', 'Copy, paste, lose. Efficient little system.',
                'Same words. Different turn. Still no points.', 'Say it a third time and it becomes a terrible Yaku.',
                'I know, I know. You are a man of one powerful sentence.'
            ],
            goodbye: [
                'Later, mate. Try not to dream about the missing pair.', 'Good game. Go rest that furious typing finger.',
                'See you. The flowers will remember nothing.', 'Cheers. Come back with stronger cards and weaker excuses.',
                'Later. I will keep the pond warm.', 'Bye. That was messy in the best way.',
                'Good night. Tell the deck you forgive it.', 'Catch you next month, menace.'
            ],
            laughter: [
                'Laugh now. The draw is still coming.', 'At least one of us is enjoying this disaster.',
                'Fair. That was genuinely stupid.', 'Ha. Okay, you got me there.',
                'Keep laughing; it improves the table atmosphere.', 'That is the correct response to this match.',
                'I would laugh too, but I am trying to look dangerous.', 'Beautiful. Two idiots and forty-eight flowers.'
            ],
            general: [
                'I genuinely did not expect that.', 'Oh shit. Where did that come from?',
                'That changes the month.', 'Interesting. Slightly annoying, but interesting.',
                'I thought you were bluffing. My mistake.', 'Hopefully you do not have the other one.',
                'That card has bad intentions.', 'I see the plan now. Hate it.',
                'Quietly decent move, that.', 'You nearly caught me sleeping.',
                'The field just got awkward.', 'I was saving that month, you bastard.',
                'Okay, now we have a game.', 'That draw was suspiciously convenient.',
                'I do not like how confident you look.', 'One good pair and suddenly you have posture.',
                'This round is getting filthy.', 'You fed the field and called it strategy.',
                'Not bad. Do not become unbearable.', 'I have {botCards} cards and several bad ideas left.'
            ]
        },
        casual: {
            greeting: ['Pete is here. Pete is rarely ready.', 'Yo, mate. Let us poke the flowers.', 'Dude! Finally, a language I understand.', 'Hey. I brought vibes instead of strategy.'],
            insult: ['Bit harsh. Accurate later, maybe.', 'Pete catches strays and cards. Mostly cards.', 'Rude, mate. I was going to lose casually.', 'You roast like you draw: confidently random.'],
            challenge: ['This is Casual Pete. There was never a ceiling.', 'I have more. None of it is quality-controlled.', 'Alright, smartarse. Pete turns the dial to medium.', 'Bold of you to challenge a man named Petal Pete.'],
            compliment: ['Aw, cheers. Pete feels seen.', 'Thanks. That was suspiciously kind.', 'You too, mate. That move was actually sharp.', 'Compliment accepted before you change your mind.'],
            general: ['Pete did not plan that. Please look impressed.', 'I clicked a flower and destiny happened.', 'Honestly? No idea what happens next.', 'Tiny card, massive emotional consequences.']
        },
        clever: {
            greeting: ['The Ronin acknowledges the noise.', 'Hello. Keep talking; it reveals confidence.', 'You arrived before your strategy. Impressive.', 'Greetings. The ribbons are already gossiping.'],
            insult: ['A loud answer to a question nobody asked.', 'Your mouth is climbing. Your score is not.', 'Crude, but rhythmically acceptable.', 'I will file that beside your weaker moves.'],
            challenge: ['You have seen the warm-up.', 'Ask for more carefully.', 'Fine. I will stop pretending this is close.', 'The next ribbon comes with consequences.'],
            general: ['That was sharper than expected.', 'You protected the right month. Annoying.', 'The field is telling on you.', 'A decent move hidden inside all that noise.']
        },
        hard: {
            greeting: ['Moon Fox heard you. Moon Fox kept counting.', 'Hello from the unpleasant side of the table.', 'Talk softly. The field has ears.', 'You found the chat. Now find the match.'],
            insult: ['Noise does not improve a bad position.', 'Keep barking. I am counting months.', 'That anger arrived before the comeback.', 'You are trying to tilt a fox with punctuation.'],
            challenge: ['You have not seen the trap yet.', 'Good. Confidence makes the fall funnier.', 'Push harder. I want the interesting version of you.', 'The moon is not even up yet.'],
            general: ['You exposed more than you captured.', 'That move closes one door and opens a worse one.', 'I was hoping you missed that.', 'Good. Now the field is worth reading.']
        },
        expert: {
            greeting: ['Akahana online. Keep it brief.', 'I hear you. I am still calculating.', 'Hello. Your visible cards say enough.', 'You talk; I count. Fair division of labour.'],
            insult: ['Emotional move. Zero expected value.', 'The insult is stronger than the position.', 'You are tilting. That is useful information.', 'Keep spending attention in the chat.'],
            challenge: ['I have barely used the good lines or the good cards.', 'Challenge noted. Pressure increased.', 'You asked for the advanced difficulty.', 'Fine. No more charity captures.'],
            compliment: ['Correct. That was strong.', 'Good move. I had it second on your list.', 'Respect. You found the narrow line.', 'Clean capture. No joke needed.'],
            general: ['That reduced my best line. Well played.', 'You chose the dangerous match.', 'I expected the other card.', 'The endgame just shifted.']
        },
        baba: {
            greeting: ['Baba is here. Hide the good flowers.', 'Yes, mate? Baba is gardening violently.', 'Bro, Baba heard you over the sound of free points.', 'Speak. Baba enjoys background noise.'],
            insult: ['Fuck you too, sunshine. Now play.', 'Baba has been insulted by professionals. Bring better material.', 'Big mouth, tiny flower cards.', 'That was rude enough to be almost charming.', 'Keep talking shit. Baba needs fertilizer.'],
            family: ['Yo mama saw that move and changed families.', 'Baba respects the mum joke. Ancient weapon, poor aim.', 'Your mum would have matched the month by now.', 'Leave Baba’s mum out of this; she plays Expert.'],
            challenge: ['Baba has plenty left. You have not unlocked the rude section.', 'Is that all? Mate, Baba was being house-trained.', 'Ask for smoke and Baba brings the whole damn garden.', 'Good. Baba was worried you might behave.'],
            compliment: ['Fair play, bastard. That one was clean.', 'Baba approves. Do not make it weird.', 'Good move, mate. Annoying as hell.', 'Respect. Baba nearly dropped the tea.'],
            repeat: ['Same shit again? Baba charges rent for echoes.', 'You already said that, broken little radio.', 'Baba heard you. Even the chaff heard you.', 'New words, mate. The old ones lost.'],
            general: ['Oh shit. Baba did not expect that.', 'Where did that bastard come from?', 'Hopefully you do not have the matching bright.', 'Baba sees the plan and dislikes your face a respectful amount.', 'That was filthy. Baba approves reluctantly.', 'One more move like that and Baba starts concentrating.']
        }
    };

    const normalizeChat = message => String(message || '').toLowerCase().replace(/[^a-z0-9åäö!?\s']/gi, ' ').replace(/\s+/g, ' ').trim();

    function classifyChatIntent(message) {
        const text = normalizeChat(message);
        if (/\b(bye|goodbye|later|see ya|cya|good night|gn)\b/.test(text)) return 'goodbye';
        if (/\b(lol|lmao|haha+|hehe+|rofl)\b/.test(text)) return 'laughter';
        if (/\b(mom|mum|mother|mama|yo mama)\b/.test(text)) return 'family';
        if (/\b(how do|rules?|yaku|koi.?koi|shobu|match|confus|understand|what do i)\b/.test(text)) return 'confusion';
        if (/\b(luck|lucky|rigged|bullshit draw|bs draw|cheat)\b/.test(text)) return 'luck';
        if (/\b(is that all|all you got|try me|bring it|come at me|too easy|weak)\b/.test(text)) return 'challenge';
        if (/\b(nice|good move|well played|wp|respect|smart|clever|not bad)\b/.test(text)) return 'compliment';
        if (/\b(fuck|shithead|idiot|moron|stupid|dumb|suck|bitch|bastard|prick|clown|trash|garbage|niga|nigg)\b/.test(text)) return 'insult';
        if (/^(where|where are|where is|where's)\b|\bwhere are you\b/.test(text)) return 'where';
        if (/\?|^(what|why|how|who|when|can|could|would|are|is|do|did|will)\b/.test(text)) return 'question';
        if (/\b(hello|hey|hi|yo|sup|dude|bro|mate|bruh)\b/.test(text)) return 'greeting';
        return 'general';
    }

    const chatPersona = difficulty => ({ 1: 'casual', 2: 'clever', 3: 'hard', 4: 'expert', 5: 'baba' }[difficulty] || 'casual');

    function formatChatLine(line, bot, human, state) {
        const botScore = Number(bot?.score || 0); const theirScore = Number(human?.score || 0);
        const lead = botScore === theirScore ? `a ${botScore}–${theirScore} tie` : botScore > theirScore ? `my ${botScore}–${theirScore} lead` : `your ${theirScore}–${botScore} lead`;
        return String(line).replace(/\{name\}/g, human?.name || 'mate')
            .replace(/\{round\}/g, String(state?.roundNumber || 1))
            .replace(/\{botCards\}/g, String(bot?.hand?.length || 0))
            .replace(/\{theirCards\}/g, String(human?.hand?.length || 0))
            .replace(/\{lead\}/g, lead);
    }

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
            this.humanMessages = new Map();
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
                if (bot) this.queueChat(bot, 'chat', true, { event, state });
            }
        }

        selectChatReply(bot, event, state = this.engine.state) {
            const message = normalizeChat(event?.message);
            const messageHistory = this.humanMessages.get(bot.id) || [];
            const repeated = Boolean(message && messageHistory.includes(message));
            const intent = repeated ? 'repeat' : classifyChatIntent(message);
            if (message) {
                messageHistory.push(message);
                if (messageHistory.length > 6) messageHistory.shift();
                this.humanMessages.set(bot.id, messageHistory);
            }

            const persona = chatPersona(Number(bot.botDifficulty) || 1);
            const personaPool = CHAT_POOLS[persona] || CHAT_POOLS.casual;
            const source = [
                ...(personaPool[intent] || []),
                ...(CHAT_POOLS.shared[intent] || []),
                ...(personaPool.general || []),
                ...CHAT_POOLS.shared.general
            ];
            const recent = this.recent.get(bot.id) || [];
            const available = source.filter(line => !recent.includes(line));
            const choices = available.length ? available : source;
            const index = Math.min(choices.length - 1, Math.floor(this.random() * choices.length));
            const template = choices[Math.max(0, index)] || 'Your move, mate.';
            recent.push(template);
            if (recent.length > 14) recent.shift();
            this.recent.set(bot.id, recent);

            const human = this.engine.getPlayer?.(event?.playerId)
                || state?.players?.find(player => player.id === event?.playerId)
                || state?.players?.find(player => !player.isBot);
            return formatChatLine(template, bot, human, state);
        }

        queueChat(bot, category, force = false, details = {}) {
            if (!bot?.isBot || this.pendingChats.has(bot.id)) return;
            const profile = PROFILES[bot.botDifficulty] || PROFILES[1];
            if (!force && this.random() > profile.chatChance) return;
            let line;
            if (category === 'chat' && details.event) {
                line = this.selectChatReply(bot, details.event, details.state || this.engine.state);
            } else {
                const historical = HistoricalBots?.linesFor(bot.historicalPersona, category) || [];
                const source = historical.length ? historical : ((bot.botDifficulty === 5 ? BABA_PHRASES : PHRASES)[category] || PHRASES.chat);
                const recent = this.recent.get(bot.id) || [];
                const available = source.filter(candidate => !recent.includes(candidate));
                const choices = available.length ? available : source;
                const index = Math.min(choices.length - 1, Math.floor(this.random() * choices.length));
                line = choices[Math.max(0, index)] || 'Your move, mate.';
                recent.push(line);
                if (recent.length > 14) recent.shift();
                this.recent.set(bot.id, recent);
            }
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

    return {
        PROFILES,
        PHRASES,
        BABA_PHRASES,
        CHAT_POOLS,
        HanafudaDialogue: { normalizeChat, classifyChatIntent, chatPersona, formatChatLine },
        HanafudaBotBrain,
        HanafudaBotController
    };
});
