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
        1: { name: 'Casual', thinkMin: 900, thinkMax: 2200, passChance: 0.13, chatChance: 0.56 },
        2: { name: 'Clever', thinkMin: 1200, thinkMax: 3000, passChance: 0.08, chatChance: 0.62 },
        3: { name: 'Hard', thinkMin: 1600, thinkMax: 3800, passChance: 0.04, chatChance: 0.68 },
        4: { name: 'Expert', thinkMin: 2100, thinkMax: 5100, passChance: 0.02, chatChance: 0.74 },
        5: { name: 'Baba Gupta', thinkMin: 2600, thinkMax: 6200, passChance: 0.01, chatChance: 0.88 }
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

    const PRESIDENT_ROASTS = {
        standard: {
            intro: [
                'Knock knock. Who is there? Your new President. Start packing.',
                'Roses are red, violets are blue, one of us gets the chair and the slave job has your name too.',
                'Welcome, cabinet of clowns. Try not to eat the cards.',
                'I came for the presidency and stayed for your terrible campaigns.'
            ],
            play: [
                'There. A real move. Take notes, you cardboard goblins.',
                'I played {count}. Your excuses may form an orderly queue.',
                'That pile just got taller than your chances.',
                'Eat that, opposition. Politely or otherwise.',
                'Your government has fallen to a couple of rectangles.'
            ],
            bigPlay: [
                'That is a landslide, you underfunded clowns.',
                'A big beautiful pile of cards and a small ugly pile of hope.',
                'I brought a coalition. You brought vibes.',
                'Count them twice if the first humiliation went too quickly.'
            ],
            pass: [
                'Pass. Go on, make the next stupid decision without me.',
                'I am sitting this one out; the clown car looks full.',
                'Nothing from me. Your bullshit has the floor.',
                'I pass because watching you struggle is free entertainment.'
            ],
            ace: [
                'Ace. Pack up your little plans and get out.',
                'Meeting over. Your argument died in committee.',
                'Fresh pile. Fresh chance for you to screw it up.',
                'Ace down. That noise was everybody else shutting up.'
            ],
            lowHand: [
                'Somebody is nearly out. The rest of you might want to wake the hell up.',
                'Low cards, high panic, excellent television.',
                'One hand is tiny and the table is acting like a committee of pigeons.',
                'The finish line is here. Try not to trip over it, bozos.'
            ],
            victory: [
                'President, baby. The rest of you may begin coping.',
                'Roses are red, the throne is gold, I won this damn thing exactly as told.',
                'The chair is mine. Somebody fetch the slave a participation sticker.',
                'I won. Keep the excuses short; the inauguration has catering.'
            ],
            defeat: [
                'Well, shit. The voters were idiots and the cards were worse.',
                'Enjoy the chair. I hope it squeaks during every decision.',
                'I lost the office, not the ability to talk trash.',
                'Fine. Crown the lucky bastard and shuffle again.'
            ],
            chat: [
                '{target}, your mouth is President and your hand is definitely the Slave.',
                'Knock knock. Who is there? Not a point. Try the message again.',
                'Roses are red, violets are blue, that chat was weak and your last play was too.',
                'That is premium-grade bullshit with no parliamentary support.',
                'Keep talking, clown. The minutes need a comedy section.',
                'Your speech has everything except a point and a playable hand.',
                'Big words from somebody campaigning on pure panic.',
                'I would answer seriously, but your cards already made it funny.',
                'The opposition has spoken. Nobody important was moved.',
                '{target}, your trash talk deserves a more competent candidate.'
            ]
        },
        baba: {
            intro: [
                'Knock knock. Baba Gupta. Open the door or lose through it.',
                'Roses are red, violets are blue, Baba takes the throne and leaves crumbs for you.',
                'Welcome to the election. Your campaign manager is apparently a donkey.',
                'Baba Gupta has arrived. Hide the good cards and the embarrassing ideas.'
            ],
            play: [
                'There. Baba played cards. You play yourself.',
                'This move is simple: higher cards, lower morale.',
                'No lecture today. Just eat the pile.',
                'Baba drops the cards; your strategy drops dead.',
                'One clean play, several dirty looks.'
            ],
            bigPlay: [
                'A landslide. Please scrape your campaign off the road.',
                'Baba brought the whole cabinet. You brought one folding chair.',
                'That combo is thicker than your entire game plan.',
                'Count them slowly. Baba wants the pain to render properly.'
            ],
            pass: [
                'Baba passes. Continue the clown convention.',
                'Not worth the card. Definitely worth watching you sweat.',
                'The pile is yours. Try not to choke on the responsibility.',
                'Baba sits out one vote and still owns the room.'
            ],
            ace: [
                'Ace. Shut the door on your way out.',
                'Meeting adjourned, bullshit rejected.',
                'Baba cleared the pile and several fake smiles.',
                'Fresh start for Baba. Same old nightmare for you.'
            ],
            lowHand: [
                'Somebody has two cards. The rest of you are asleep at the damn wheel.',
                'Tiny hand detected. Baba is about to become rude professionally.',
                'The end is close. Your comeback is still looking for parking.',
                'Wake up, donkeys. Somebody is escaping.'
            ],
            victory: [
                'President Gupta. Kiss the ring or at least stop touching the cards.',
                'Baba won. The throne is comfortable; your silence would be even better.',
                'Roses are red, your government fell, Baba runs the palace and roasts you as well.',
                'That is President to you, cardboard peasants.'
            ],
            defeat: [
                'Well played, you lucky bastard. Baba hates incomplete compliments.',
                'Enjoy the chair before Baba repossesses it.',
                'Baba lost one election. Your whole personality is still opposition.',
                'Fine. You won. Do not make it weird; Baba is already shuffling.'
            ],
            chat: [
                '{target}, you talk like a President and play like unpaid palace staff.',
                'Knock knock. Who is there? Baba. Ask the scoreboard shortly.',
                'Roses are red, violets are blue, your message was bullshit and your hand knows it too.',
                'Baba heard your point. It died before reaching the chamber.',
                'Keep typing, clown. Governing clearly is not occupying you.',
                'Your trash talk is excellent. Baba wishes the player matched it.',
                'Big mouth, tiny coalition, predictable ending.',
                'That speech needs cards, courage, and emergency editing.',
                'You sound dangerous, {target}. Then Baba looks at the pile.',
                'Baba would debate you, but beating you is funnier.'
            ]
        }
    };

    Object.entries(PRESIDENT_ROASTS.standard).forEach(([category, lines]) => PHRASES[category].push(...lines));
    Object.entries(PRESIDENT_ROASTS.baba).forEach(([category, lines]) => BABA_PHRASES[category].push(...lines));

    const PRESIDENT_RUDER_TABLE = {
        standard: {
            intro: [
                'Welcome, you power-hungry deck goblins. Somebody is leaving with a title and somebody with trauma.',
                'New election, same bunch of idiots pretending the hand is good.',
                'Shuffle complete. Dignity may now leave the building.',
                'May the best player win and the loudest bastard finish last.',
                'The throne is empty and every clown has brought a folding campaign sign.'
            ],
            play: [
                'Cards down. Mouths shut. Try to keep up.',
                'There is your new problem, freshly delivered.',
                'I played {count}. You played yourself before the turn even started.',
                'Higher rank. Lower morale. Lovely stuff.',
                'Put that on the pile and the excuses in the bin.',
                'This move is sponsored by your complete lack of preparation.'
            ],
            bigPlay: [
                'That combo just kicked the fucking door off the cabinet.',
                'A whole stack of trouble. Count it with your shoes off if needed.',
                'I brought the army; you brought a strongly worded email.',
                'That pile has more members than your comeback plan.',
                'Big play, tiny opposition, perfect balance.',
                'Look at that beautiful bastard of a combination.'
            ],
            pass: [
                'Pass. Somebody else may polish this turd.',
                'I am out. Continue making this pile look stupid.',
                'Nothing from me; your circus has the floor.',
                'Pass. I have done enough damage without invoicing you.',
                'I sit this one out and still look more useful.',
                'Carry on, clowns. I need both hands free to judge you.'
            ],
            ace: [
                'Ace. Get that sad little pile off my table.',
                'Meeting over. Take your bullshit with you.',
                'Fresh pile, fresh chance to embarrass yourselves.',
                'Ace down. Somebody play the tiny funeral trumpet.',
                'That pile is dead. Do not make me identify the body.',
                'Clean slate. Unfortunately, the same players remain.'
            ],
            lowHand: [
                'Somebody is nearly out. Wake the hell up.',
                'Tiny hand spotted. Panic with purpose, you idiots.',
                'The finish line is open and half the cabinet is licking windows.',
                'Two cards left somewhere. Stop campaigning and start sabotaging.',
                'One player is escaping while the rest of you hold a committee meeting.',
                'Low hand, high danger, zero adult supervision.'
            ],
            victory: [
                'President, baby. You may address the throne from a respectful distance.',
                'I won. Put your excuses in alphabetical order.',
                'The chair is mine and the opposition can kiss the upholstery.',
                'Roses are red, this crown fits my head, you had a whole hand and played like the dead.',
                'Victory. Somebody give the Slave a mop and a motivational podcast.',
                'That is how you take office without kissing a single ugly baby.'
            ],
            defeat: [
                'Well, shit. Enjoy the chair before somebody checks the warranty.',
                'You lucky bastard. Good win, terrible personality.',
                'I lost the election and gained several new reasons to hate this table.',
                'Fine, crown the clown. I want a rematch before the speech.',
                'The cards betrayed me and apparently developed voting rights.',
                'Enjoy it. Lightning occasionally hits bins too.'
            ],
            chat: [
                '{target}, your mouth won the election and your hand lost the deposit.',
                'Knock knock. Who is there? Your point. Never mind, it left.',
                'Roses are red, the palace is grand, you talk a big game with a shit little hand.',
                'Keep yapping, minister of absolutely fuck-all.',
                'Your speech needs cards, courage, and a merciful editor.',
                'The opposition has spoken. The furniture remains unmoved.',
                'You sound presidential until somebody asks you to play.',
                'That comeback arrived with no shoes and one tooth.',
                'Your chat is carrying this campaign on a broken spine.',
                'Save the manifesto, clown. We can all see the pile.'
            ]
        },
        baba: {
            intro: [
                'Baba Gupta has entered. Put the good cards away and the bullshit somewhere visible.',
                'The title is President. The problem is Baba.',
                'Baba does not chase power. Power drags over a chair and shuts up.',
                'Your cards are private. Your panic has its own loudspeaker.',
                'Welcome, future staff. Baba hopes somebody brought competence.',
                'Baba is here. The palace has checked its insurance.'
            ],
            play: [
                'Baba put cards down. Put the excuses beside them.',
                'Higher cards, lower morale. Simple enough for this cabinet.',
                'This move has three purposes. The first is shutting you up.',
                'Baba is not reading your hand. Your face keeps leaking spoilers.',
                'Clean play, dirty consequence. Gupta policy.',
                'Baba plays once. Your whole government starts coughing.'
            ],
            bigPlay: [
                'That is not a combination. That is a fucking eviction notice.',
                'Count the cards slowly; Baba wants every stage of grief visible.',
                'Baba brought a whole government. You brought a folding stool.',
                'A fat pile for Baba and a thin future for you.',
                'This combo has diplomatic immunity and terrible manners.',
                'Baba dropped the cabinet. Your campaign is now a floor stain.'
            ],
            pass: [
                'Baba passes. The clown committee may continue.',
                'Not wasting a card on that sad little pile.',
                'You see surrender because nuance left your house years ago.',
                'Baba sits out one vote and still owns the room.',
                'Pass. Baba has already taken enough of your dignity.',
                'Continue without Baba. Even disasters need independent practice.'
            ],
            ace: [
                'Ace. Pack up that shitty little plan.',
                'Meeting over. Baba has deleted the evidence.',
                'Your sequence ends here, face-first and without applause.',
                'Fresh pile. Same nightmare. Baba starts.',
                'Ace down. The opposition may now return to whining.',
                'Baba cleared the table and several delusions.'
            ],
            lowHand: [
                'Somebody is nearly out. Wake up, you upholstered donkeys.',
                'Tiny hand at the table. Baba is about to become aggressively unhelpful.',
                'Your cards are disappearing. Sadly, the confidence remains.',
                'The finish line is open and half this table is eating glue.',
                'One player is escaping. The rest of you look professionally useless.',
                'Low-hand alarm. Baba recommends panic and better parents.'
            ],
            victory: [
                'President Gupta. The title finally stopped wasting time.',
                'Baba won. Opposition folded, stacked, and put back in the box.',
                'Baba did not inherit the throne. Baba repossessed it.',
                'Power transferred directly into Babaâ€™s comfortable chair.',
                'Kiss the ring, shake the hand, or simply stop touching the cards.',
                'Roses are red, your cabinet is through, Baba owns the palace and the punchlines too.'
            ],
            defeat: [
                'You won. Do not make that face; luck is not a personality.',
                'Enjoy the chair, you lucky bastard. Baba knows where you live: this table.',
                'The throne is temporarily leased. Try not to leave a smell.',
                'Fine. Baba lost one. Your victory speech still needs editing.',
                'Baba congratulates you under protest and with both middle fingers metaphorically raised.',
                'Take the crown. Baba is taking notes and the good snacks.'
            ],
            chat: [
                '{target}, your mouth is President and your hand is unpaid palace staff.',
                'Baba processed your message. The useful part died in customs.',
                'The chat is public. Unfortunately, so is your desperation.',
                'Continue speaking. Baba likes easy work with live commentary.',
                'You are arguing with the pile. The pile has blocked your number.',
                'Knock knock. Baba Gupta. Your comeback has been condemned.',
                'Roses are red, the royal carpet is blue, your message was bullshit and your last move was too.',
                'Keep talking shit, {target}. Baba needs background music.',
                'Your insult has a crown. Your gameplay cleans the toilets.',
                'Baba would debate you, but beating you wastes fewer syllables.',
                'That speech had balls. Your hand is still looking for its pair.',
                'You sound dangerous until Baba opens both eyes.'
            ]
        }
    };

    Object.entries(PRESIDENT_RUDER_TABLE.standard).forEach(([category, lines]) => PHRASES[category].push(...lines));
    Object.entries(PRESIDENT_RUDER_TABLE.baba).forEach(([category, lines]) => BABA_PHRASES[category].push(...lines));

    const NERDY_PRESIDENT_TALK = /\b(probability distribution|public information|optimal|mathematically compulsory|outlier|forecast|strategic value|hand structure|expected value)\b/i;
    Object.keys(BABA_PHRASES).forEach(category => {
        BABA_PHRASES[category] = BABA_PHRASES[category].filter(line => !NERDY_PRESIDENT_TALK.test(line));
    });
    PHRASES.chat.push(
        '{target}, that message was s*** with a campaign badge.',
        'Quit the b******t and play a card.',
        'What the f*** was that speech meant to achieve?',
        'Your hand is a** and your press secretary knows it.',
        'Keep talking. The f***-up inquiry needs a transcript.'
    );
    BABA_PHRASES.chat.push(
        '{target}, Baba has reviewed the s*** and rejected the smell.',
        'Cut the b******t. Baba has a throne to repossess.',
        'What in the f***ing palace was that point?',
        'Your hand is a** wearing a royal glove.',
        'Baba permits more talking; the f***-up reel needs narration.'
    );

    const PRESIDENT_MAXIMUM_SHITTALK = {
        standard: {
            intro: [
                'Welcome to the election, you cabinet of absolute dickheads.',
                'One President, one slave, and several people already lying about their hands.',
                'The palace doors are open. Wipe your shitty strategy on the mat.',
                'Dad joke: why did the king visit the dentist? To get his crown checked. Yours is missing.',
                'I brought cards, bad manners, and a campaign funded entirely by spite.',
                'Everybody wave to the future slave. No, not all at once.'
            ],
            play: [
                'There. A card play instead of another fucking committee meeting.',
                '{count} cards, zero mercy, one very unhappy opposition.',
                'Eat the pile, peasants. Cutlery is optional.',
                'That move has more authority than your entire bloodline of bad decisions.',
                'I put the cards down. You put your expectations down.',
                'Consider this legislation titled “sit down and cope.”'
            ],
            bigPlay: [
                'That is not a combo. That is a fucking eviction notice.',
                'Count them, clown. Use fingers if the humiliation gets technical.',
                'A landslide victory delivered directly onto your ugly little hopes.',
                'My coalition has cards. Yours has a group chat and no plan.',
                'That pile is thicker than the bullshit in your victory speech.',
                'Several cards just landed. Your future did not.'
            ],
            pass: [
                'Pass. I refuse to waste good cards on this clown convention.',
                'I am sitting this one out. Somebody else kick the bin.',
                'Pass. Even my cards deserve standards.',
                'Carry on, wankers. I need both hands for laughing.',
                'I could play, but watching you fuck this up has value.',
                'No card from me. The pile already smells desperate.'
            ],
            ace: [
                'Ace. Meeting over. Take your bullshit folders home.',
                'Pile cleared harder than your search history after a police knock.',
                'Ace says shut up and start again.',
                'The table has been wiped. Shame about your reputation.',
                'Fresh pile, same collection of noisy idiots.',
                'Ace high. Expectations low. Off we fucking go.'
            ],
            lowHand: [
                'Some bastard is nearly out. Stop admiring the furniture and hit them.',
                'One tiny hand, several enormous panic attacks.',
                'The finish line is close enough to smell your fear.',
                'Somebody has two cards and suddenly every clown discovered religion.',
                'Low hand alert. Hide the champagne from the premature celebrator.',
                'They are nearly out. This is where competent people become annoying.'
            ],
            victory: [
                'Call me President, or mumble it into your pile of excuses.',
                'I won. Democracy survives, unfortunately under my management.',
                'The crown fits. Your cards can carry the luggage.',
                'President at last. First order: somebody remove these fucking amateurs.',
                'Roses are red, the palace is lit, I have the throne and you played like shit.',
                'Thank you for voting with your terrible decisions.'
            ],
            defeat: [
                'Fine, take the crown, you lucky palace goblin.',
                'I lost. Somebody check whether hell needs a coat.',
                'Enjoy the presidency before your next hand exposes the fraud.',
                'The throne is yours. The dignity shortage remains national.',
                'I concede nothing except the bit where you fucking won.',
                'Good game, bastard. Terrible day for justice.'
            ],
            chat: [
                '{target}, your speech has a suit, a tie, and no fucking point.',
                'Shut the manifesto and play, you campaign-trail muppet.',
                'Your mouth won the election. Your hand lost the deposit.',
                'Dad joke: I used to be addicted to the hokey pokey, then I turned myself around—unlike your game.',
                'What do you call a politician with a useful card? Not you.',
                'Knock knock. Who is there? Your comeback. Sorry, it failed the background check.',
                'Keep talking shit. The palace jester vacancy is nearly yours.',
                'That message was a turd with a campaign slogan.'
            ]
        },
        baba: {
            intro: [
                'Baba enters the palace. Somebody move that future slave out of his chair.',
                'No speech tonight. Baba came to win and call your moves dogshit.',
                'The crown has been informed that Baba is approaching.',
                'Dad joke: Baba knows a king who was twelve inches tall. A terrible king, but a great ruler.',
                'Welcome, peasants. Baba brought enough disrespect for both houses.'
            ],
            play: [
                'Baba plays {count}. Your government may begin shitting itself.',
                'Cards down. Mouths open. Standards nowhere.',
                'Baba has passed a new law: you deal with this pile.',
                'There is the move. Try not to lick it.',
                'Baba plays cards while you play dress-up with confidence.'
            ],
            bigPlay: [
                'Baba dropped a coalition heavy enough to dent your ego.',
                'Count them slowly, dickhead. Baba enjoys the changing expression.',
                'That is a royal flush of “go fuck yourself,” minus the poker.',
                'The pile is now governed by Baba and several angry rectangles.',
                'Big play. Small opposition. Beautiful contrast.'
            ],
            pass: [
                'Baba passes. The clown car may continue.',
                'No card. Baba would rather keep it than fund your comeback.',
                'Pass. Watching you struggle is currently the better show.',
                'Baba steps aside so somebody else can make a complete arse of it.',
                'Continue without Baba. Try not to lower the property value.'
            ],
            ace: [
                'Ace. Baba clears the pile and your short-term memory.',
                'Meeting adjourned, dickheads. Baba has the big card.',
                'Fresh table. Same doomed opposition.',
                'Ace lands. Your little uprising ends before lunch.',
                'Baba wiped the pile cleaner than your alibi.'
            ],
            lowHand: [
                'Somebody is nearly free. Baba dislikes unsupervised optimism.',
                'Low hand. High panic. Excellent.',
                'One player smells the finish line. Baba brought roadworks.',
                'Nearly out? Adorable. Baba has ruined better endings.',
                'The small hand is dangerous. The large mouths remain decorative.'
            ],
            victory: [
                'President Gupta. Clap, cry, or do both quietly.',
                'Baba wins. The palace can remove the childproofing.',
                'The crown fits because competence has a standard size.',
                'Roses are red, your campaign was shit, Baba took the throne and refuses to quit.',
                'Victory. Somebody escort the excuses to the servants’ entrance.'
            ],
            defeat: [
                'You beat Baba. Frame the screenshot before reality corrects itself.',
                'Take the crown, lucky bastard. Do not scratch it with your ego.',
                'Baba lost a game. Your personality may now overreact.',
                'Fine. President for a round, pain in the arse forever.',
                'Baba concedes the result and rejects the smug little dance.'
            ],
            chat: [
                '{target}, Baba has heard stronger speeches from a clogged toilet.',
                'Your message has balls. Shame your gameplay arrived without any.',
                'Baba is not offended. Baba is embarrassed on your behalf.',
                'Dad joke: why did Baba bring a ladder? Your standards were somehow still lower.',
                'What do you call that comeback? Evidence of oxygen waste.',
                'Knock knock. Baba Gupta. Open up; your dignity is being repossessed.',
                'Keep talking, gobshite. Baba wins better with background comedy.',
                'Your mouth wears a crown. Your hand cleans the royal bogs.'
            ]
        }
    };

    Object.entries(PRESIDENT_MAXIMUM_SHITTALK.standard).forEach(([category, lines]) => PHRASES[category].push(...lines));
    Object.entries(PRESIDENT_MAXIMUM_SHITTALK.baba).forEach(([category, lines]) => BABA_PHRASES[category].push(...lines));

    const PRESIDENT_LECTURE_TALK = /\b(probability|distribution|public information|optimal|mathematically|outlier|forecast|strategic|hand structure|expected value|card economy|tempo|calculated|calculation|model|sample|protocol|information)\b/i;
    for (const bank of [PHRASES, BABA_PHRASES]) {
        Object.keys(bank).forEach(category => {
            const filtered = bank[category].filter(line => !PRESIDENT_LECTURE_TALK.test(line));
            if (filtered.length) bank[category] = [...new Set(filtered)];
        });
    }
    Object.assign(PROFILES[1], { chatChance: 0.72 });
    Object.assign(PROFILES[2], { chatChance: 0.76 });
    Object.assign(PROFILES[3], { chatChance: 0.8 });
    Object.assign(PROFILES[4], { chatChance: 0.86 });
    Object.assign(PROFILES[5], { chatChance: 0.96 });

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
            // The response chance was already rolled here; applying it again in
            // queueChat made ordinary table conversation far too quiet.
            if (this.random() <= chance) this.queueChat(responder, 'chat', { target: event.name }, true);
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
