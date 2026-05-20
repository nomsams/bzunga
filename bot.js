/**
 * BAZUNGA - Advanced Bot AI & ELIZA-Inspired Conversational Engine
 * Handles memory decay, heuristics, frustration tracking, and dynamic chat.
 */

const BotConfig = {
    // Difficulty profiles defining cognitive limits and personality traits
    // Extroversion (0.0 - 1.0) dictates how often they proactively chat and reply to prompts.
    profiles: {
        1: { type: 'noob', capacity: 2, decayMs: 12000, reflexBase: 2500, extroversion: 0.9, counting: false },
        2: { type: 'casual', capacity: 4, decayMs: 20000, reflexBase: 1800, extroversion: 0.6, counting: false },
        3: { type: 'pro', capacity: 6, decayMs: 35000, reflexBase: 1200, extroversion: 0.2, counting: false },
        4: { type: 'expert', capacity: 10, decayMs: 60000, reflexBase: 800, extroversion: 0.1, counting: true },
        5: { type: 'pirate', capacity: 8, decayMs: 45000, reflexBase: 900, extroversion: 1.0, counting: true }
    },
    
    // ELIZA-style Conversation Patterns for responding to players or other bots
    elizaPatterns: [
        { match: ["WHY", "HOW COME"], replies: ["Why do you ask?", "Probabilities dictate it.", "Because the cards fell that way.", "What answer would please you most?"] },
        { match: ["YOU SUCK", "CHEAT", "RIGGED", "STUPID", "DUMB"], replies: ["Are you feeling frustrated?", "Emotions lead to mistakes.", "I am just executing logic. Are you?", "Blaming the game won't improve your memory."] },
        { match: ["HELLO", "HI ", "HOLA"], replies: ["Greetings. Let us play.", "Hello. Focus on the deck.", "How do you do. Please watch your cards."] },
        { match: ["BOT", "AI", "ROBOT"], replies: ["Do computers worry you?", "I am simply an algorithm.", "We are all just processing inputs, aren't we?", "Are you afraid of losing to a machine?"] },
        { match: ["YES", "YEP", "YEAH"], replies: ["You seem quite positive.", "Are you sure?", "I see.", "Confidence is good, but memory is better."] },
        { match: ["NO", "NOPE", "NAH"], replies: ["Why the negativity?", "Are you saying 'no' just to be defensive?", "Understood.", "Suit yourself."] },
        { match: ["BAZUNGA", "WIN", "LOSE"], replies: ["The final score is all that matters.", "We shall see when the cards flip.", "Don't get ahead of yourself."] }
    ],

    // Personality-based chat responses for game events
    chatBank: {
        noob: {
            slapSuccess: ["Wait, I did it?", "Gotcha!", "Oops, was that yours?", "I actually remembered one!"],
            slapFail: ["Ouch!", "My hand slipped.", "I thought that was a match...", "Why do I keep doing that?"],
            penalty: ["Why always me?", "This game is rigged.", "I have too many cards.", "I'm never going to win."],
            magic: ["Magic time!", "What does this one do again?", "Pew pew!", "I hope this helps me."],
            frustrated: ["I hate this game!", "Stop picking on me!", "I'm just clicking randomly now.", "This is too fast!"]
        },
        casual: {
            slapSuccess: ["Too slow!", "Nice try.", "Yoink!", "Saw that from a mile away."],
            slapFail: ["Ah, misread it.", "Dang it.", "Reflexes betrayed me.", "Should have double-checked."],
            penalty: ["Not good.", "I'll recover.", "Rough draw.", "That sets me back."],
            magic: ["Let's see what you're hiding.", "Time to mix it up.", "Strategic move.", "Swapping things around."],
            frustrated: ["Okay, that's enough.", "My luck is terrible today.", "Seriously?", "I need a break after this."]
        },
        pro: {
            slapSuccess: ["Predictable.", "Saw that coming.", "Tracked it.", "You left that exposed."],
            slapFail: ["Calculated risk.", "A rare error.", "Latency.", "I factored the odds incorrectly."],
            penalty: ["A minor setback.", "Stats are balancing out.", "Unfortunate variance.", "I can absorb this."],
            magic: ["Gathering intel.", "Optimizing layout.", "Executing swap.", "Realigning the board."],
            frustrated: ["Variance is severely against me.", "This sequence is highly improbable.", "Focusing. Reducing errors.", "Unacceptable outcome."]
        },
        expert: {
            slapSuccess: ["Your layout is compromised.", "Checkmate.", "Memory serves.", "Flawless execution."],
            slapFail: ["Margin of error.", "Grace period missed.", "Irrelevant.", "A statistical anomaly."],
            penalty: ["Absorbing the penalty.", "I can afford this.", "Calculated sacrifice.", "It alters nothing."],
            magic: ["Reordering the board.", "Target acquired.", "Blind swap initiated.", "Manipulating variables."],
            frustrated: ["System error: too many penalties.", "Re-evaluating heuristic models.", "This board state is suboptimal.", "I will remember this."]
        },
        pirate: {
            slapSuccess: ["Arrr! Snatched yer treasure!", "Walk the plank!", "Ye be too slow, matey!", "Plundered!"],
            slapFail: ["Blistering barnacles!", "Shiver me timbers!", "Blast it!", "A curse upon me hand!"],
            penalty: ["A curse upon the sea!", "More dead weight for the hull.", "Mutiny!", "The locker claims another!"],
            magic: ["Prepare to be boarded!", "Hoist the colors!", "I'm lookin' at yer booty!", "Swappin' the cargo!"],
            frustrated: ["I'll keelhaul the lot of ye!", "Kraken take ye all!", "Me ship is sinkin'!", "Fire the cannons!"]
        }
    }
};

const Bot = {
    chatHistory: [],    // Stores recent messages to prevent infinite bot-to-bot loops
    lastChatTime: {},   // Rate limiting for proactive bot chats
    usedLines: {},      // Prevents back-to-back repetitive phrases
    frustration: {},    // Tracks emotional state (failed slaps, insults)
    eventCache: {},     // Avoid duplicate event parsing

    start: () => {
        if (App.botInterval) clearInterval(App.botInterval);
        App.botInterval = setInterval(Bot.tick, 1000);
        Bot.chatHistory = []; 
    },

    getNumericValue: (valStr, isRed) => {
        if (valStr === 'K' && !isRed) return -1;
        if (valStr === 'K' && isRed) return 10;
        if (valStr === 'Q' || valStr === 'J') return 10;
        if (valStr === 'A') return 1;
        return parseInt(valStr);
    },

    // ------------------------------------------------------------------------
    // CONVERSATION ENGINE (ELIZA-inspired)
    // ------------------------------------------------------------------------

    getUniqueResponse: (botId, category, linesArray) => {
        if (!Bot.usedLines[botId]) Bot.usedLines[botId] = {};
        
        let lastIndex = Bot.usedLines[botId][category];
        let nextIndex;
        
        if (linesArray.length > 1) {
            do {
                nextIndex = Math.floor(Math.random() * linesArray.length);
            } while (nextIndex === lastIndex);
        } else {
            nextIndex = 0;
        }

        Bot.usedLines[botId][category] = nextIndex;
        return linesArray[nextIndex];
    },

    chat: (bot, trigger) => {
        let now = Utils.timestamp();
        // 5-second cooldown per bot for proactive chatter
        if (now - (Bot.lastChatTime[bot.id] || 0) < 5000) return; 

        let profile = BotConfig.profiles[bot.botDifficulty];
        
        // Extroversion dictates the base probability of proactive chat
        let proactiveProb = profile.extroversion * 0.4; 
        if (Math.random() > proactiveProb) return;

        let frustrationLvl = Bot.frustration[bot.id] || 0;
        let actualTrigger = trigger;
        
        // High frustration overrides normal event chatter
        if (frustrationLvl >= 3 && Math.random() > 0.3) {
            actualTrigger = 'frustrated';
        }

        let lines = BotConfig.chatBank[profile.type][actualTrigger];
        if (lines) {
            let msg = Bot.getUniqueResponse(bot.id, actualTrigger, lines);
            Engine.chatLog(bot.name, msg, profile.type === 'pirate');
            Bot.lastChatTime[bot.id] = Utils.timestamp();
        }
    },

    listenToChat: (senderName, message, isBotSender) => {
        Bot.chatHistory.push({ sender: senderName, isBot: isBotSender });
        if (Bot.chatHistory.length > 10) Bot.chatHistory.shift();

        // Anti-Loop: If the last 4 messages are all from bots, force silence to stop ping-pong
        let recentBots = Bot.chatHistory.slice(-4).filter(h => h.isBot);
        if (recentBots.length >= 4) return;

        let upperMsg = message.toUpperCase();
        let bots = Engine.state.players.filter(p => p.isBot);
        
        bots.forEach(bot => {
            // Don't reply to yourself
            if (bot.name === senderName) return;

            let profile = BotConfig.profiles[bot.botDifficulty];

            // Trigger frustration if a user insults the bot
            if (upperMsg.includes("STUPID") || upperMsg.includes("DUMB")) {
                Bot.frustration[bot.id] = (Bot.frustration[bot.id] || 0) + 1;
            }

            // Extroversion dictates the probability of replying to human or bot questions
            let replyProb = profile.extroversion * 0.6; 
            if (Math.random() > replyProb) return;

            // ELIZA pattern matching
            for (let pattern of BotConfig.elizaPatterns) {
                if (pattern.match.some(keyword => upperMsg.includes(keyword))) {
                    let reply = Bot.getUniqueResponse(bot.id, 'eliza_' + pattern.match[0], pattern.replies);
                    
                    // Simulate natural typing delay before sending
                    setTimeout(() => {
                        Engine.chatLog(bot.name, `@${senderName} ${reply}`, profile.type === 'pirate');
                        Bot.lastChatTime[bot.id] = Utils.timestamp();
                    }, Math.random() * 2000 + 1000);
                    return; // Break loop after finding the first match
                }
            }
        });
    },

    processReactions: (now) => {
        // Read the global game state to react to the latest slap event
        let lastSlap = Engine.state.lastSlap;
        if (lastSlap && lastSlap.time > (Bot.eventCache.lastSlapTime || 0)) {
            Bot.eventCache.lastSlapTime = lastSlap.time;
            let slappingBot = Engine.state.players.find(p => p.isBot && p.id === lastSlap.playerId);
            
            if (slappingBot) {
                if (lastSlap.success) {
                    Bot.frustration[slappingBot.id] = 0; // Success resets frustration
                    Bot.chat(slappingBot, 'slapSuccess');
                } else {
                    Bot.frustration[slappingBot.id] = (Bot.frustration[slappingBot.id] || 0) + 2;
                    Bot.chat(slappingBot, 'slapFail');
                }
            }

            // The victim of the slap might get frustrated too
            if (lastSlap.success && lastSlap.targetOwnerId) {
                let victimBot = Engine.state.players.find(p => p.isBot && p.id === lastSlap.targetOwnerId);
                if (victimBot) {
                    Bot.frustration[victimBot.id] = (Bot.frustration[victimBot.id] || 0) + 1;
                    Bot.chat(victimBot, 'penalty');
                }
            }
        }
    },

    // ------------------------------------------------------------------------
    // GAMEPLAY HEURISTICS & TURN LOGIC
    // ------------------------------------------------------------------------

    tick: () => {
        if (!App.isHost || Engine.state.phase === 'lobby' || Engine.state.phase === 'game_over') return;

        let now = Utils.timestamp();
        let bots = Engine.state.players.filter(p => p.isBot);

        Bot.processReactions(now);

        // Hibernate bots temporarily if a slap just happened to let humans process the visual
        if (now - (Engine.state.lastSlapTime || 0) < 2500) return;

        // Auto-ready during peek phase
        if (Engine.state.phase === 'peek') {
            bots.forEach(bot => { 
                if (!bot.ready) Engine.processAction({ type: 'READY_PEEK' }, bot.id); 
            });
        }

        // 1. Memory Management & Decay
        bots.forEach(bot => {
            let profile = BotConfig.profiles[bot.botDifficulty];
            if (!Engine.botMemory[bot.id]) Engine.botMemory[bot.id] = {};
            let mem = Engine.botMemory[bot.id];
            
            for (let key in mem) {
                // Hard decay - forget cards after duration expires
                if (now - mem[key].time > profile.decayMs) delete mem[key];
            }
            
            // Limit memory capacity based on difficulty
            let keys = Object.keys(mem);
            if (keys.length > profile.capacity) {
                let oldest = keys.sort((a,b) => mem[a].time - mem[b].time)[0];
                delete mem[oldest];
            }
        });

        // 2. Real-time Slap Checks
        if ((Engine.state.phase === 'play' || Engine.state.phase === 'orbit') && Engine.state.discardPile.length > 0) {
            let topDiscard = Engine.state.discardPile[Engine.state.discardPile.length - 1];
            bots.forEach(bot => {
                let profile = BotConfig.profiles[bot.botDifficulty];
                let frustration = Bot.frustration[bot.id] || 0;
                
                // Highly frustrated bots slap slightly faster but make more mistakes
                let reflexDelay = profile.reflexBase - (frustration * 50); 
                let mem = Engine.botMemory[bot.id];
                
                for (let key in mem) {
                    if (mem[key].value === topDiscard.value) {
                        let [ownerId, loc, idx] = key.split('_');
                        let owner = Engine.state.players.find(p => p.id === ownerId);
                        if (owner) {
                            let target = loc === 'hand' ? owner.hand[idx] : owner.penaltyCards[idx];
                            // Simulate human reaction time probability
                            if (target && Math.random() < (1000 / Math.max(200, reflexDelay))) {
                                Engine.processAction({ type: 'SLAP', targetId: target.id }, bot.id);
                                delete mem[key]; // Wipe from memory after slap
                                return; 
                            }
                        }
                    }
                }
            });
        }

        // 3. Active Turn Logic
        let activePlayer = Engine.state.players[Engine.state.turnIndex];
        if (!activePlayer.isBot) return;

        // Thinking delay before acting
        if (now - Engine.state.turnStartTime < 2500) return;

        // Magic ability delay
        if (Engine.state.activeAbility && Engine.state.activeAbility.player === activePlayer.id) {
            if (now - Engine.state.activeAbility.time < 2000) return; 
        }

        // Phase A: Draw a Card or Call Bazunga
        if ((Engine.state.phase === 'play' || Engine.state.phase === 'orbit') && !Engine.state.activeAbility) {
            let topDiscard = Engine.state.discardPile.length > 0 ? Engine.state.discardPile[Engine.state.discardPile.length - 1] : null;
            let wantsDiscard = false;
            let mem = Engine.botMemory[activePlayer.id];
            
            // Assess Discard Pile
            if (topDiscard) {
                let topVal = Bot.getNumericValue(topDiscard.value, topDiscard.isRed);
                if (activePlayer.botDifficulty >= 3) {
                    // Advanced: Pick up negative/low cards, or cards that perfectly match a known card for future swapping
                    if (topVal <= 0) wantsDiscard = true;
                    else {
                        for (let key in mem) {
                            if (key.startsWith(activePlayer.id) && mem[key].value === topDiscard.value) {
                                wantsDiscard = true; 
                                break;
                            }
                        }
                    }
                } else {
                    // Casual bots just randomly pick up low cards
                    wantsDiscard = topVal < 6 && Math.random() > 0.5;
                }
            }

            // Advanced Expected Value (EV) Bazunga Calculation
            if (Engine.state.phase === 'play' && activePlayer.botDifficulty >= 4 && Math.random() < 0.15) {
                let myExpectedScore = 0;
                let knownCards = 0;
                let totalCards = activePlayer.hand.length + activePlayer.penaltyCards.length;

                for (let key in mem) {
                    if (key.startsWith(activePlayer.id)) {
                        myExpectedScore += mem[key].numVal;
                        knownCards++;
                    }
                }
                
                // Assume all unknown cards are roughly average value (~5)
                myExpectedScore += (totalCards - knownCards) * 5;

                // If my layout is extremely optimal (<= 4 pts across <= 4 cards), pull the trigger
                if (myExpectedScore <= 4 && totalCards <= 4) {
                    Engine.processAction({ type: 'CALL_BAZUNGA' }, activePlayer.id);
                    return;
                }
            }

            if (wantsDiscard) Engine.processAction({ type: 'DRAW_DISCARD' }, activePlayer.id);
            else Engine.processAction({ type: 'DRAW_DECK' }, activePlayer.id);
            return;
        }

        // Phase B: Resolve Drawn Cards & Magic Abilities
        if (Engine.state.activeAbility && Engine.state.activeAbility.player === activePlayer.id) {
            let ability = Engine.state.activeAbility;
            let mem = Engine.botMemory[activePlayer.id];
            
            // Deciding whether to keep or discard the drawn card
            if (ability.type.startsWith('holding')) {
                let hCard = ability.card;
                let cardVal = Bot.getNumericValue(hCard.value, hCard.isRed);
                
                // Immediately discard standard magic cards (unless it's a negative King)
                if (ability.type === 'holding' && ['9','10','J','Q','K'].includes(hCard.value)) {
                    if (cardVal === -1) { // Red/Black K variance logic
                         let target = activePlayer.hand[Math.floor(Math.random() * activePlayer.hand.length)];
                         if (target) Engine.processAction({ type: 'PLAY_HOLDING', action: 'swap', targetId: target.id }, activePlayer.id);
                    } else {
                         Bot.chat(activePlayer, 'magic');
                         Engine.processAction({ type: 'PLAY_HOLDING', action: 'discard' }, activePlayer.id);
                    }
                } else {
                    // Intelligent Swap Logic
                    let targetToSwap = null;
                    if (activePlayer.botDifficulty >= 3) {
                        let worstKnownVal = cardVal; 
                        
                        // Look for a known card in layout that is worse than the card we just drew
                        for (let key in mem) {
                            if (key.startsWith(activePlayer.id) && mem[key].numVal > worstKnownVal) {
                                let [_, loc, idx] = key.split('_');
                                targetToSwap = loc === 'hand' ? activePlayer.hand[idx] : activePlayer.penaltyCards[idx];
                                worstKnownVal = mem[key].numVal;
                            }
                        }
                        
                        // If no bad known cards exist, but we drew an amazing card (0, 1, 2), blindly swap out an unknown card
                        if (!targetToSwap && cardVal <= 2) {
                            let unknownOwn = activePlayer.hand.find(c => !mem[`${activePlayer.id}_${Engine.getSlot(activePlayer, c.id)}`]);
                            if (unknownOwn) targetToSwap = unknownOwn;
                        }
                    } else {
                        // Casual swap logic
                        if (cardVal < 7 && Math.random() > 0.4) {
                            targetToSwap = activePlayer.hand[Math.floor(Math.random() * activePlayer.hand.length)];
                        }
                    }

                    if (targetToSwap) Engine.processAction({ type: 'PLAY_HOLDING', action: 'swap', targetId: targetToSwap.id }, activePlayer.id);
                    else Engine.processAction({ type: 'PLAY_HOLDING', action: 'discard' }, activePlayer.id);
                }
            } else {
                // Resolving multi-step Magic Card logic (9, 10, J, Q, K)
                let mType = ability.type;
                let payload = { type: 'RESOLVE_MAGIC' };
                
                if (mType === 'magic_9') {
                    // Peek at own unknown card
                    let unknownOwn = activePlayer.hand.find(c => !mem[`${activePlayer.id}_${Engine.getSlot(activePlayer, c.id)}`]);
                    if (unknownOwn) payload.targetId = unknownOwn.id;
                    
                } else if (mType === 'magic_10') {
                    // Peek at opponent's unknown card
                    let opps = Engine.state.players.filter(p => p.id !== activePlayer.id);
                    if (opps.length > 0) {
                        let opp = opps[Math.floor(Math.random() * opps.length)];
                        let unknownOpp = opp.hand.find(c => !mem[`${opp.id}_${Engine.getSlot(opp, c.id)}`]);
                        if (unknownOpp) { 
                            payload.targetPlayerId = opp.id; 
                            payload.targetId = unknownOpp.id; 
                        }
                    }
                    
                } else if (mType === 'magic_Q') {
                    // Queen: Peek and Swap
                    let myWorst = null; let myWorstVal = -99;
                    let oppBest = null; let oppBestVal = 99;
                    
                    // Identify my worst card and opponent's best card based on memory
                    for (let key in mem) {
                        if (key.startsWith(activePlayer.id) && mem[key].numVal > myWorstVal) {
                            let [_, loc, idx] = key.split('_');
                            myWorst = loc === 'hand' ? activePlayer.hand[idx] : activePlayer.penaltyCards[idx];
                            myWorstVal = mem[key].numVal;
                        } else if (!key.startsWith(activePlayer.id) && mem[key].numVal < oppBestVal) {
                            let [oid, loc, idx] = key.split('_');
                            let opp = Engine.state.players.find(p => p.id === oid);
                            if (opp) { 
                                oppBest = loc === 'hand' ? opp.hand[idx] : opp.penaltyCards[idx]; 
                                oppBestVal = mem[key].numVal; 
                            }
                        }
                    }
                    
                    // If we know a perfect swap, do it
                    if (myWorst && oppBest && myWorstVal > oppBestVal) {
                        payload.swapTarget1 = myWorst.id; 
                        payload.swapTarget2 = oppBest.id;
                    } else if (Math.random() > 0.5) {
                        // Otherwise fallback to peeking an opponent
                        let opps = Engine.state.players.filter(p => p.id !== activePlayer.id);
                        if (opps.length > 0) payload.targetId = opps[0].hand[0]?.id;
                    }
                    
                } else if (mType === 'magic_J') {
                    // Jack: Blind Swap
                    let allCards = [];
                    Engine.state.players.filter(p => p.id !== activePlayer.id).forEach(p => allCards.push(...p.hand, ...p.penaltyCards));
                    if (allCards.length >= 2) {
                        payload.swapTarget1 = allCards[Math.floor(Math.random() * allCards.length)].id;
                        let t2 = allCards[Math.floor(Math.random() * allCards.length)].id;
                        while(t2 === payload.swapTarget1) t2 = allCards[Math.floor(Math.random() * allCards.length)].id; // Prevent self swap
                        payload.swapTarget2 = t2;
                    }
                    
                } else if (mType === 'magic_K') {
                    // Red King: Force Penalty
                    let opps = Engine.state.players.filter(p => p.id !== activePlayer.id);
                    if (opps.length > 0) {
                        // Target the opponent with the fewest cards (playing to win)
                        opps.sort((a,b) => (a.hand.length + a.penaltyCards.length) - (b.hand.length + b.penaltyCards.length));
                        payload.targetPlayerId = opps[0].id;
                    }
                }
                
                Engine.processAction(payload, activePlayer.id);
            }
        }
    }
};

// Export to global scope
window.Bot = Bot;
