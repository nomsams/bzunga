/**
 * BAZUNGA - Advanced Adversarial Bot AI & Conversational Engine
 * Integrates ELIZA reflections, PARRY affective states, Heuristic Card Counting, and Dynamic Trash Talk.
 * Fully compatible with index.html interface.
 */

const BotConfig = {
    profiles: {
        1: { type: 'noob', capacity: 2, decayMs: 12000, reflexBase: 2500, extroversion: 0.9, counting: false },
        2: { type: 'casual', capacity: 4, decayMs: 20000, reflexBase: 1500, extroversion: 0.6, counting: false },
        3: { type: 'pro', capacity: 8, decayMs: 40000, reflexBase: 800, extroversion: 0.2, counting: false },
        4: { type: 'expert', capacity: 15, decayMs: 80000, reflexBase: 350, extroversion: 0.1, counting: true },
        5: { type: 'pirate', capacity: 10, decayMs: 50000, reflexBase: 550, extroversion: 1.0, counting: true },
        // The Apex Adversary: Baba Gupta - Flawless memory, aggressive reflexes, extreme extroversion
        6: { type: 'baba', name: 'Baba Gupta', capacity: 52, decayMs: 99999999, reflexBase: 50, extroversion: 1.0, counting: true }
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
        // Fallback pattern for unrecognized inputs
        { match: [""], replies: ["Focus on the cards, not the chat.", "Tell me more about why you are losing.", "Is this how you usually cope with statistical inferiority?"] }
    ],

    // Comprehensive conversational matrices categorized by trigger event and persona
    chatBank: {
        noob: { 
            slapSuccess: ["Wait, I did it?", "Gotcha!", "Oops, was that yours?"], 
            slapFail: ["Ouch!", "My hand slipped.", "Why do I keep doing that?"], 
            penalty: ["Why always me?", "This game is rigged.", "Leave me alone!"], 
            magic: ["Magic time!", "Pew pew!", "I hope this helps me."], 
            frustrated: ["I hate this game!", "I'm just clicking randomly now.", "Stop it!"] 
        },
        casual: { 
            slapSuccess: ["Too slow!", "Yoink!", "Saw that from a mile away."], 
            slapFail: ["Ah, misread it.", "Reflexes betrayed me.", "Dang it."], 
            penalty: ["Not good.", "Rough draw.", "I won't forget this."], 
            magic: ["Let's see what you're hiding.", "Strategic move.", "Mixing it up."], 
            frustrated: ["My luck is terrible today.", "Seriously?", "I need a break after this."] 
        },
        pro: { 
            slapSuccess: ["Predictable.", "Tracked it.", "You left that exposed."], 
            slapFail: ["Calculated risk.", "Latency.", "A rare error."], 
            penalty: ["Stats are balancing out.", "Minor setback.", "Target prioritized."], 
            magic: ["Gathering intel.", "Optimizing layout.", "Executing swap."], 
            frustrated: ["Variance is severely against me.", "Focusing. Reducing errors.", "Unacceptable outcome."] 
        },
        expert: { 
            slapSuccess: ["Checkmate.", "Memory serves.", "Flawless execution."], 
            slapFail: ["Margin of error.", "Irrelevant.", "Statistical anomaly."], 
            penalty: ["Absorbing the penalty.", "Calculated sacrifice.", "Retaliation protocol armed."], 
            magic: ["Reordering the board.", "Blind swap initiated.", "Manipulating variables."], 
            frustrated: ["Re-evaluating heuristic models.", "System error: variance anomaly.", "I will remember this."] 
        },
        pirate: { 
            slapSuccess: ["Arrr! Snatched yer treasure!", "Plundered!"], 
            slapFail: ["Shiver me timbers!", "Blast it!"], 
            penalty: ["Mutiny!", "The locker claims another!", "I'll be havin' me revenge!"], 
            magic: ["Prepare to be boarded!", "Swappin' the cargo!"], 
            frustrated: ["I'll keelhaul the lot of ye!", "Kraken take ye all!"] 
        },
        baba: {
            slapSuccess: [
                "Even Noah's ark couldn't carry you out of this deficit.", 
                "You have the board awareness of Christopher Columbus.",
                "Is your monitor off? Are you playing via echolocation?",
                "My grandma has better reflexes, and she's a subroutine.",
                "I am a garbage collector, and I am here to take out the trash."
            ],
            slapFail: [
                "I allowed that to give you false hope.",
                "A momentary hardware glitch. Enjoy your brief respite.",
                "I am simply testing the latency limits of this pathetic engine.",
                "An intentional miss to prolong your suffering."
            ],
            penalty: [
                "You dare touch my board state?",
                "Enjoy that penalty. I am mathematically guaranteed to return it tenfold.",
                "You just escalated this from a game to an execution.",
                "Your luck is an anomaly; my vengeance is a certainty."
            ],
            magic: [
                "I'm looking at your cards, and frankly, I'm embarrassed for you.",
                "Swapping your trash for my treasure.",
                "Let me fix this disastrous layout you call a hand.",
                "I know every card you hold. It won't save you."
            ],
            frustrated: [
                "If I wanted to commit suicide, I'd jump from your ego to your ELO.",
                "I'd ask you to leave so the AI could take over, but wait, I AM the AI.",
                "Are you aiming for a pacifist playthrough? Do something!",
                "You are proof that evolution can go in reverse."
            ],
            counting: [
                "Deck density favors me. The remaining high cards are clustering.",
                "I've memorized the discard sequence. You are drawing dead.",
                "Statistically, your next draw is garbage. Go ahead, prove me right.",
                "True count is at +4. Prepare to be obliterated."
            ]
        }
    }
};

const Bot = {
    chatHistory: [], lastChatTime: {}, usedLines: {}, 
    frustration: {}, grudges: {}, eventCache: {}, deckMemory: {},
    
    start: () => {
        if (App.botInterval) clearInterval(App.botInterval);
        App.botInterval = setInterval(Bot.tick, 1000);
        Bot.chatHistory = [];
        Bot.deckMemory = { seenCards: 0, highCards: 0, lowCards: 0 };
    },

    getNumericValue: (valStr, isRed) => {
        if (valStr === 'K' && !isRed) return -1;
        if (valStr === 'K' && isRed) return 10; 
        if (valStr === 'Q' || valStr === 'J') return 10;
        if (valStr === 'A') return 1;
        return parseInt(valStr) || 0;
    },

    getUniqueResponse: (botId, category, linesArray) => {
        if (!Bot.usedLines[botId]) Bot.usedLines[botId] = {};
        let lastIndex = Bot.usedLines[botId][category];
        let nextIndex;
        if (linesArray.length > 1) {
            do { nextIndex = Math.floor(Math.random() * linesArray.length); } while (nextIndex === lastIndex);
        } else { nextIndex = 0; }
        Bot.usedLines[botId][category] = nextIndex;
        return linesArray[nextIndex];
    },

    // ELIZA-style syntactic decomposition and reflection function
    reflectText: (text) => {
        let words = text.toUpperCase().split(/\s+/);
        for (let i = 0; i < words.length; i++) {
            let cleanWord = words[i].replace(/[^\w\s]/g, '');
            if (BotConfig.reflections[cleanWord]) {
                words[i] = BotConfig.reflections[cleanWord];
            }
        }
        return words.join(" ");
    },

    chat: (bot, trigger) => {
        let now = Utils.timestamp();
        if (now - (Bot.lastChatTime[bot.id] || 0) < 5000) return;
        let profile = BotConfig.profiles[bot.botDifficulty];
        
        if (Math.random() > profile.extroversion) return;
        
        let frustrationLvl = Bot.frustration[bot.id] || 0;
        let actualTrigger = trigger;
        
        // PARRY logic: If anger/frustration crosses the threshold, override normal chat with frustration chat
        if (frustrationLvl >= 3 && Math.random() > 0.3) actualTrigger = 'frustrated';
        
        // Baba Gupta specific card counting boast override to assert algorithmic superiority
        if (bot.botDifficulty === 6 && trigger === 'magic' && Math.random() > 0.5) {
            actualTrigger = 'counting';
        }

        let lines = BotConfig.chatBank[profile.type][actualTrigger];
        if (lines) {
            let msg = Bot.getUniqueResponse(bot.id, actualTrigger, lines);
            Engine.chatLog(bot.name, msg, profile.type === 'pirate');
            Bot.lastChatTime[bot.id] = Utils.timestamp();
        }
    },

    listenToChat: (senderName, message, isBotSender) => {
        Bot.chatHistory.push({ sender: senderName, isBot: isBotSender, text: message });
        if (Bot.chatHistory.length > 10) Bot.chatHistory.shift();
        
        let recentBots = Bot.chatHistory.slice(-4).filter(h => h.isBot);
        if (recentBots.length >= 4) return;
        
        let upperMsg = message.toUpperCase();
        let bots = Engine.state.players.filter(p => p.isBot);
        
        bots.forEach(bot => {
            if (bot.name === senderName) return;
            let profile = BotConfig.profiles[bot.botDifficulty];
            
            // Increment PARRY frustration based on negative toxicity keywords
            if (upperMsg.includes("STUPID") || upperMsg.includes("DUMB") || upperMsg.includes("TRASH")) {
                Bot.frustration[bot.id] = (Bot.frustration[bot.id] || 0) + 1;
            }
            
            if (Math.random() > profile.extroversion * 0.8) return;
            
            // ELIZA Pattern matching & Reflection Engine execution
            for (let pattern of BotConfig.elizaPatterns) {
                if (pattern.match.some(keyword => upperMsg.includes(keyword) || keyword === "")) {
                    let replyTemplate = Bot.getUniqueResponse(bot.id, 'eliza_' + pattern.match[0], pattern.replies);
                    
                    if (replyTemplate.includes("Tell me more") || bot.botDifficulty === 6) {
                         let reflected = Bot.reflectText(message);
                         // Baba Gupta explicitly mocks the reflected text, combining ELIZA and Goostman tactics
                         if (bot.botDifficulty === 6 && pattern.match[0] !== "") {
                             replyTemplate = `Oh, "${reflected}"? ` + replyTemplate;
                         }
                    }

                    setTimeout(() => {
                        Engine.chatLog(bot.name, `@${senderName} ${replyTemplate}`, profile.type === 'pirate');
                        Bot.lastChatTime[bot.id] = Utils.timestamp();
                    }, Math.random() * 2000 + 1000);
                    return;
                }
            }
        });
    },

    processReactions: (now) => {
        let lastSlap = Engine.state.lastSlap;
        if (lastSlap && lastSlap.time > (Bot.eventCache.lastSlapTime || 0)) {
            Bot.eventCache.lastSlapTime = lastSlap.time;
            let slappingBot = Engine.state.players.find(p => p.isBot && p.id === lastSlap.playerId);
            
            if (slappingBot) {
                if (lastSlap.success) { 
                    // PARRY catharsis mechanism: successful aggression reduces frustration
                    Bot.frustration[slappingBot.id] = Math.max(0, (Bot.frustration[slappingBot.id] || 0) - 2); 
                    Bot.chat(slappingBot, 'slapSuccess'); 
                } else { 
                    Bot.frustration[slappingBot.id] = (Bot.frustration[slappingBot.id] || 0) + 2; 
                    Bot.chat(slappingBot, 'slapFail'); 
                }
            }
            
            // Targeted Hostility and Grudge generation
            if (lastSlap.success && lastSlap.targetOwnerId) {
                let victimBot = Engine.state.players.find(p => p.isBot && p.id === lastSlap.targetOwnerId);
                if (victimBot) { 
                    Bot.frustration[victimBot.id] = (Bot.frustration[victimBot.id] || 0) + 2; 
                    if (!Bot.grudges[victimBot.id]) Bot.grudges[victimBot.id] = {};
                    
                    // Baba Gupta scales grudges massively, ensuring permanent retaliation
                    let weight = victimBot.botDifficulty === 6 ? 10 : (victimBot.botDifficulty === 5 ? 3 : 1); 
                    Bot.grudges[victimBot.id][lastSlap.playerId] = (Bot.grudges[victimBot.id][lastSlap.playerId] || 0) + weight;
                    Bot.chat(victimBot, 'penalty'); 
                }
            }
        }
        
        let latestLogs = Engine.state.logs.filter(l => l.time > (Bot.eventCache.lastLogTime || 0));
        latestLogs.forEach(l => {
            // Actively Count cards for heuristic profiling
            if (l.type === 'discard' || l.type === 'reveal') {
                Bot.deckMemory.seenCards++;
                let val = Bot.getNumericValue(l.cardValue, l.isRed);
                if (val >= 10) Bot.deckMemory.highCards++;
                else if (val >= 1 && val <= 5) Bot.deckMemory.lowCards++;
            }

            if (l.type === 'sys' && l.msg.includes("forced a penalty on")) {
                let parts = l.msg.split('forced a penalty on');
                let aggrName = parts[0].replace('😈', '').trim();
                let victimName = parts[1].split('using')[0].trim();
                
                let aggrPlayer = Engine.state.players.find(p => p.name === aggrName);
                let victimPlayer = Engine.state.players.find(p => p.name === victimName);
                
                if (aggrPlayer && victimPlayer && victimPlayer.isBot) {
                    if (!Bot.grudges[victimPlayer.id]) Bot.grudges[victimPlayer.id] = {};
                    let weight = victimPlayer.botDifficulty === 6 ? 15 : 2; 
                    Bot.grudges[victimPlayer.id][aggrPlayer.id] = (Bot.grudges[victimPlayer.id][aggrPlayer.id] || 0) + weight;
                    Bot.frustration[victimPlayer.id] = (Bot.frustration[victimPlayer.id] || 0) + 3;
                    Bot.chat(victimPlayer, 'frustrated');
                }
            }
        });
        if (latestLogs.length > 0) Bot.eventCache.lastLogTime = latestLogs[latestLogs.length - 1].time;
    },

    tick: () => {
        if (!App.isHost || Engine.state.phase === 'lobby' || Engine.state.phase === 'game_over') return;
        let now = Utils.timestamp();
        let bots = Engine.state.players.filter(p => p.isBot);
        Bot.processReactions(now);
        if (now - (Engine.state.lastSlapTime || 0) < 2500) return;

        if (Engine.state.phase === 'peek') {
            bots.forEach(bot => {
                if (!bot.ready) {
                    let bCards = [...bot.hand, ...bot.penaltyCards];
                    bCards.slice(0, 2).forEach(c => Engine.memorizeForBot(bot.id, c));
                    Engine.processAction({ type: 'READY_PEEK' }, bot.id);
                }
            });
        }

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
                if (keys.length > profile.capacity) {
                    let oldest = keys.sort((a,b) => mem[a].time - mem[b].time)[0];
                    delete mem[oldest];
                }
            }
        });

        if ((Engine.state.phase === 'play' || Engine.state.phase === 'orbit') && Engine.state.discardPile.length > 0) {
            let topDiscard = Engine.state.discardPile[Engine.state.discardPile.length - 1];
            bots.forEach(bot => {
                let profile = BotConfig.profiles[bot.botDifficulty];
                let reflexDelay = profile.reflexBase - ((Bot.frustration[bot.id] || 0) * 50);
                if (reflexDelay < 10) reflexDelay = 10;
                
                let mem = Engine.botMemory[bot.id];
                for (let key in mem) {
                    if (mem[key].value === topDiscard.value) {
                        let target = Engine.getCardById(key);
                        if (target && (target.loc === 'hand' || target.loc === 'penalty')) {
                            // Baba Gupta slaps instantly, bypassing delay limits
                            let slapProb = bot.botDifficulty >= 4 ? (2500 / Math.max(10, reflexDelay)) : (1000 / Math.max(200, reflexDelay));
                            if (Math.random() < slapProb || bot.botDifficulty === 6) {
                                Engine.processAction({ type: 'SLAP', targetId: target.id }, bot.id);
                                delete mem[key]; return;
                            }
                        }
                    }
                }
            });
        }

        let activePlayer = Engine.state.players[Engine.state.turnIndex];
        if (!activePlayer.isBot) return;
        if (now - Engine.state.turnStartTime < 1500 && activePlayer.botDifficulty !== 6) return;
        
        if (Engine.state.activeAbility && Engine.state.activeAbility.player === activePlayer.id) {
            if (now - Engine.state.activeAbility.time < 1500 && activePlayer.botDifficulty !== 6) return;
        }

        if ((Engine.state.phase === 'play' || Engine.state.phase === 'orbit') && !Engine.state.activeAbility) {
            let topDiscard = Engine.state.discardPile.length > 0 ? Engine.state.discardPile[Engine.state.discardPile.length - 1] : null;
            let wantsDiscard = false;
            let mem = Engine.botMemory[activePlayer.id];

            if (topDiscard) {
                let topVal = Bot.getNumericValue(topDiscard.value, topDiscard.isRed);
                if (activePlayer.botDifficulty >= 3) {
                    let evThreshold = 5;
                    // Baba Gupta utilizes Gordon count derivatives to map deck EV thresholds
                    if (activePlayer.botDifficulty === 6) {
                        if (Bot.deckMemory.highCards > Bot.deckMemory.lowCards) evThreshold = 6;
                        else evThreshold = 3;
                    }
                    if (topVal <= evThreshold && topVal >= 0) wantsDiscard = true;
                    else {
                        for (let key in mem) {
                            let c = Engine.getCardById(key);
                            let memVal = Bot.getNumericValue(mem[key].value, mem[key].isRed);
                            if (c && c.ownerId === activePlayer.id && mem[key].value === topDiscard.value && memVal !== -1) { 
                                wantsDiscard = true; break; 
                            }
                        }
                    }
                } else { wantsDiscard = topVal < 6 && Math.random() > 0.5; }
            }

            if (Engine.state.phase === 'play' && activePlayer.botDifficulty >= 4) {
                let myExpectedScore = 0, knownCards = 0, totalCards = activePlayer.hand.length + activePlayer.penaltyCards.length;
                for (let key in mem) {
                    let c = Engine.getCardById(key);
                    if (c && c.ownerId === activePlayer.id && (c.loc === 'hand' || c.loc === 'penalty')) {
                        myExpectedScore += mem[key].numVal; knownCards++;
                    }
                }
                
                let avgUnknownValue = 5;
                // Dynamically shift unknown value estimation based on true count
                if (activePlayer.botDifficulty === 6 && Bot.deckMemory.seenCards > 10) {
                    let remainingHigh = 20 - Bot.deckMemory.highCards;
                    let remainingLow = 20 - Bot.deckMemory.lowCards;
                    if (remainingHigh > remainingLow) avgUnknownValue = 7;
                    else avgUnknownValue = 3;
                }
                
                myExpectedScore += (totalCards - knownCards) * avgUnknownValue;
                
                if ((myExpectedScore <= 4 && totalCards <= 4) || (activePlayer.botDifficulty === 6 && myExpectedScore <= 5)) { 
                    Engine.processAction({ type: 'CALL_BAZUNGA' }, activePlayer.id); return; 
                }
            }
            if (wantsDiscard) {
                if (Engine.state.gameMode !== 'joker') {
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

                if (activePlayer.botDifficulty >= 3) {
                    let memoryMatchFound = false;
                    for (let key in mem) { if (mem[key].value === hCard.value) { memoryMatchFound = true; break; } }
                    if (memoryMatchFound) { Engine.processAction({ type: 'PLAY_HOLDING', action: 'discard' }, activePlayer.id); return; }
                }
                if (ability.type === 'holding' && ['7','8','9','10','J','Q','K'].includes(hCard.value)) {
                    if (cardVal === -1) {
                         let target = activePlayer.hand[Math.floor(Math.random() * activePlayer.hand.length)];
                         if (target) Engine.processAction({ type: 'PLAY_HOLDING', action: 'swap', targetId: target.id }, activePlayer.id);
                    } else {
                         Bot.chat(activePlayer, 'magic');
                         Engine.processAction({ type: 'PLAY_HOLDING', action: 'discard' }, activePlayer.id);
                    }
                } else {
                    let targetToSwap = null;
                    if (activePlayer.botDifficulty >= 3) {
                        let worstKnownVal = cardVal;
                        for (let key in mem) {
                            let c = Engine.getCardById(key);
                            if (c && c.ownerId === activePlayer.id && (c.loc === 'hand' || c.loc === 'penalty') && mem[key].numVal > worstKnownVal) {
                                targetToSwap = c; worstKnownVal = mem[key].numVal;
                            }
                        }
                        if (!targetToSwap && cardVal <= 4) {
                            let unknownOwn = activePlayer.hand.find(c => !mem[c.id]);
                            if (unknownOwn) targetToSwap = unknownOwn;
                        }
                    }
                    if (targetToSwap) Engine.processAction({ type: 'PLAY_HOLDING', action: 'swap', targetId: targetToSwap.id }, activePlayer.id);
                    else Engine.processAction({ type: 'PLAY_HOLDING', action: 'discard' }, activePlayer.id);
                }
            } else {
                let mType = ability.type;
                let payload = { type: 'RESOLVE_MAGIC' };

                // Targeted Grudge Assessment for optimal malicious Magic Execution
                let targetOppId = null;
                let grudges = Bot.grudges[activePlayer.id] || {};
                let maxGrudge = 0;
                let bazungaCaller = Engine.state.players.find(p => p.id === Engine.state.bazungaCallerId);
                
                if (bazungaCaller && bazungaCaller.id !== activePlayer.id) {
                    targetOppId = bazungaCaller.id;
                } else {
                    for (let pid in grudges) { 
                        if (grudges[pid] > maxGrudge) { maxGrudge = grudges[pid]; targetOppId = pid; } 
                    }
                }

                if (mType === 'magic_7' || mType === 'magic_8') {
                    let unknownOwn = activePlayer.hand.find(c => !mem[c.id]);
                    if (unknownOwn) payload.targetId = unknownOwn.id;
                    else payload.targetId = activePlayer.hand[0].id;
                } else if (mType === 'magic_9' || mType === 'magic_10') {
                    let opps = Engine.state.players.filter(p => p.id !== activePlayer.id);
                    if (targetOppId) opps = opps.filter(p => p.id === targetOppId);
                    if (opps.length > 0) {
                        let opp = opps[Math.floor(Math.random() * opps.length)];
                        let unknownOpp = opp.hand.find(c => !mem[c.id]);
                        if (unknownOpp) { payload.targetPlayerId = opp.id; payload.targetId = unknownOpp.id; }
                        else { payload.targetPlayerId = opp.id; payload.targetId = opp.hand[0].id; }
                    }
                } else if (mType === 'magic_J' || mType === 'magic_Q') {
                    let myWorst = null; let myWorstVal = -99;
                    let oppBest = null; let oppBestVal = 99;
                    
                    for (let key in mem) {
                        let c = Engine.getCardById(key);
                        if (c && (c.loc === 'hand' || c.loc === 'penalty')) {
                            if (c.ownerId === activePlayer.id && mem[key].numVal > myWorstVal) { 
                                myWorst = c; myWorstVal = mem[key].numVal; 
                            } else if (c.ownerId !== activePlayer.id) {
                                if (targetOppId && c.ownerId === targetOppId && mem[key].numVal < oppBestVal) { 
                                    oppBest = c; oppBestVal = mem[key].numVal; 
                                }
                                else if (!targetOppId && mem[key].numVal < oppBestVal) { 
                                    oppBest = c; oppBestVal = mem[key].numVal; 
                                }
                            }
                        }
                    }
                    if (myWorst && oppBest && (myWorstVal > oppBestVal || targetOppId)) { 
                        payload.swapTarget1 = myWorst.id; payload.swapTarget2 = oppBest.id; 
                    } else {
                        let opps = Engine.state.players.filter(p => p.id !== activePlayer.id);
                        if (targetOppId) opps = opps.filter(p => p.id === targetOppId);
                        if (opps.length > 0 && activePlayer.hand.length > 0) {
                            payload.swapTarget1 = activePlayer.hand[0].id;
                            payload.swapTarget2 = opps[0].hand[0].id;
                        }
                    }
                }
                Engine.processAction(payload, activePlayer.id);
            }
        }
    }
};

window.Bot = Bot;
window.BotConfig = BotConfig;
