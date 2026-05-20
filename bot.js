/**
 * BAZUNGA - Advanced Bot AI & ELIZA-Inspired Conversational Engine
 * Handles memory decay, heuristics, frustration tracking, and dynamic chat.
 */

const BotConfig = {
    // Difficulty profiles defining cognitive limits and personality traits
    profiles: {
        1: { type: 'noob', capacity: 2, decayMs: 12000, reflexBase: 2500, chatProb: 0.5, counting: false },
        2: { type: 'casual', capacity: 4, decayMs: 20000, reflexBase: 1800, chatProb: 0.4, counting: false },
        3: { type: 'pro', capacity: 6, decayMs: 35000, reflexBase: 1200, chatProb: 0.3, counting: false },
        4: { type: 'expert', capacity: 10, decayMs: 60000, reflexBase: 800, chatProb: 0.25, counting: true },
        5: { type: 'pirate', capacity: 8, decayMs: 45000, reflexBase: 900, chatProb: 0.6, counting: true }
    },
    
    // ELIZA-style Conversation Patterns for responding to players or other bots
    elizaPatterns: [
        { match: ["WHY", "HOW COME"], replies: ["Why do you ask?", "Probabilities dictate it.", "Because the cards fell that way.", "What answer would please you most?"] },
        { match: ["YOU SUCK", "CHEAT", "RIGGED", "STUPID"], replies: ["Are you feeling frustrated?", "Emotions lead to mistakes.", "I am just executing logic. Are you?", "Blaming the game won't improve your memory."] },
        { match: ["HELLO", "HI ", "HOLA"], replies: ["Greetings. Let us play.", "Hello. Focus on the deck.", "How do you do. Please watch your cards."] },
        { match: ["BOT", "AI", "ROBOT"], replies: ["Do computers worry you?", "I am simply an algorithm.", "We are all just processing inputs, aren't we?", "Are you afraid of losing to a machine?"] },
        { match: ["YES", "YEP", "YEAH"], replies: ["You seem quite positive.", "Are you sure?", "I see.", "Confidence is good, but memory is better."] },
        { match: ["NO", "NOPE", "NAH"], replies: ["Why the negativity?", "Are you saying 'no' just to be defensive?", "Understood.", "Suit yourself."] }
    ],

    // Personality-based chat responses for game events
    chatBank: {
        noob: {
            slapSuccess: ["Wait, I did it?", "Gotcha!", "Oops, was that yours?", "I actually remembered one!"],
            slapFail: ["Ouch!", "My hand slipped.", "I thought that was a match...", "Why do I keep doing that?"],
            penalty: ["Why always me?", "This game is rigged.", "I have too many cards.", "I'm never going to win."],
            magic: ["Magic time!", "What does this one do again?", "Pew pew!", "I hope this helps me."],
            idle: ["Is it my turn yet?", "I'm so confused.", "Wait, whose card was that?"],
            frustrated: ["I hate this game!", "Stop picking on me!", "I'm just clicking randomly now.", "This is too fast!"]
        },
        casual: {
            slapSuccess: ["Too slow!", "Nice try.", "Yoink!", "Saw that from a mile away."],
            slapFail: ["Ah, misread it.", "Dang it.", "Reflexes betrayed me.", "Should have double-checked."],
            penalty: ["Not good.", "I'll recover.", "Rough draw.", "That sets me back."],
            magic: ["Let's see what you're hiding.", "Time to mix it up.", "Strategic move.", "Swapping things around."],
            idle: ["Good game so far.", "Anyone keeping track of the Kings?", "It's getting quiet..."],
            frustrated: ["Okay, that's enough.", "My luck is terrible today.", "Seriously?", "I need a break after this."]
        },
        pro: {
            slapSuccess: ["Predictable.", "Saw that coming.", "Tracked it.", "You left that exposed."],
            slapFail: ["Calculated risk.", "A rare error.", "Latency.", "I factored the odds incorrectly."],
            penalty: ["A minor setback.", "Stats are balancing out.", "Unfortunate variance.", "I can absorb this."],
            magic: ["Gathering intel.", "Optimizing layout.", "Executing swap.", "Realigning the board."],
            idle: ["The discard pile is getting heavy on face cards.", "Patience wins games.", "I'm tracking three targets."],
            frustrated: ["Variance is severely against me.", "This sequence is highly improbable.", "Focusing. Reducing errors.", "Unacceptable outcome."]
        },
        expert: {
            slapSuccess: ["Your layout is compromised.", "Checkmate.", "Memory serves.", "Flawless execution."],
            slapFail: ["Margin of error.", "Grace period missed.", "Irrelevant.", "A statistical anomaly."],
            penalty: ["Absorbing the penalty.", "I can afford this.", "Calculated sacrifice.", "It alters nothing."],
            magic: ["Reordering the board.", "Target acquired.", "Blind swap initiated.", "Manipulating variables."],
            idle: ["Probability of drawing a 10+ is currently 42%.", "Your tells are obvious.", "I map every card."],
            frustrated: ["System error: too many penalties.", "Re-evaluating heuristic models.", "This board state is suboptimal.", "I will remember this."]
        },
        pirate: {
            slapSuccess: ["Arrr! Snatched yer treasure!", "Walk the plank!", "Ye be too slow, matey!", "Plundered!"],
            slapFail: ["Blistering barnacles!", "Shiver me timbers!", "Blast it!", "A curse upon me hand!"],
            penalty: ["A curse upon the sea!", "More dead weight for the hull.", "Mutiny!", "The locker claims another!"],
            magic: ["Prepare to be boarded!", "Hoist the colors!", "I'm lookin' at yer booty!", "Swappin' the cargo!"],
            idle: ["Yarrr, pass the rum.", "Who dares challenge Blackbeard?!", "The winds be quiet..."],
            frustrated: ["I'll keelhaul the lot of ye!", "Kraken take ye all!", "Me ship is sinkin'!", "Fire the cannons!"]
        }
    }
};

const Bot = {
    memory: {},         // { botId: { cardKey: { value, isRed, numVal, time, certainty } } }
    
    // ELIZA & Conversation State
    chatHistory: [],    // Stores last 10 messages to prevent bot-to-bot infinite loops
    lastChatTime: {},   // Rate limiting for proactive bot chats: { botId: timestamp }
    usedLines: {},      // Prevents exact back-to-back phrase repetition: { botId: { category: lastIndex } }
    frustration: {},    // Emotional state tracking: { botId: integer }
    
    eventCache: {},     // Tracks processed events to avoid duplicate reactions

    start: () => {
        if (App.botInterval) clearInterval(App.botInterval);
        App.botInterval = setInterval(Bot.tick, 1000);
        Bot.chatHistory = []; // Reset on new game
    },

    getNumericValue: (valStr, isRed) => {
        if (valStr === 'K' && !isRed) return -1;
        if (valStr === 'K' && isRed) return 10;
        if (valStr === 'Q' || valStr === 'J') return 10;
        if (valStr === 'A') return 1;
        return parseInt(valStr);
    },

    // Card Counting Heuristic
    calculateDeckDanger: (botId) => {
        if (!Engine.state.discardPile.length) return 0.5;
        let highCardsSeen = 0;
        let totalSeen = Engine.state.discardPile.length;
        Engine.state.discardPile.forEach(c => {
            let val = Bot.getNumericValue(c.value, c.isRed);
            if (val >= 8) highCardsSeen++;
        });
        let danger = 1.0 - (highCardsSeen / totalSeen); 
        return Math.max(0.1, Math.min(0.9, danger));
    },

    // ------------------------------------------------------------------------
    // CONVERSATION ENGINE (ELIZA-inspired)
    // ------------------------------------------------------------------------

    // Fetch a line ensuring we don't repeat the exact same line back-to-back
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

    // Proactive game-event chat
    chat: (bot, trigger) => {
        let now = Utils.timestamp();
        // 5-second cooldown per bot for proactive chatter
        if (now - (Bot.lastChatTime[bot.id] || 0) < 5000) return; 

        let profile = BotConfig.profiles[bot.botDifficulty];
        if (Math.random() > profile.chatProb) return;

        // Apply frustration modifier
        let frustrationLvl = Bot.frustration[bot.id] || 0;
        let actualTrigger = trigger;
        if (frustrationLvl >= 3 && Math.random() > 0.3) {
            actualTrigger = 'frustrated';
        }

        let lines = BotConfig.chatBank[profile.type][actualTrigger];
        if (lines) {
            let msg = Bot.getUniqueResponse(bot.id, actualTrigger, lines);
            Bot.sendMsg(bot, msg, profile.type === 'pirate');
        }
    },

    // Reactive ELIZA-style chat (listens to humans and other bots)
    listenToChat: (senderName, message, isBotSender) => {
        Bot.chatHistory.push({ sender: senderName, msg: message, isBot: isBotSender });
        if (Bot.chatHistory.length > 10) Bot.chatHistory.shift();

        // Anti-Loop: If the last 4 messages are all from bots, force silence to stop ping-pong
        let recentBots = Bot.chatHistory.slice(-4).filter(h => h.isBot);
        if (recentBots.length >= 4) return;

        let upperMsg = message.toUpperCase();
        let bots = Engine.state.players.filter(p => p.isBot);
        
        bots.forEach(bot => {
            // Don't reply to yourself
            if (bot.name === senderName) return;

            // Frustration trigger based on user chat (e.g. "Stupid bot")
            if (upperMsg.includes("STUPID") || upperMsg.includes("DUMB")) {
                Bot.frustration[bot.id] = (Bot.frustration[bot.id] || 0) + 1;
            }

            // Only a ~30% chance a specific bot will reply to a message
            if (Math.random() > 0.3) return;

            // Find matching ELIZA pattern
            for (let pattern of BotConfig.elizaPatterns) {
                if (pattern.match.some(keyword => upperMsg.includes(keyword))) {
                    let reply = Bot.getUniqueResponse(bot.id, 'eliza_' + pattern.match[0], pattern.replies);
                    
                    // Delay simulating typing speed
                    setTimeout(() => {
                        Bot.sendMsg(bot, `@${senderName} ${reply}`, BotConfig.profiles[bot.botDifficulty].type === 'pirate');
                    }, Math.random() * 2000 + 1000);
                    
                    // Rate limit proactive chat so they don't spam after replying
                    Bot.lastChatTime[bot.id] = Utils.timestamp() + 3000;
                    return; // Only process first match
                }
            }
        });
    },

    sendMsg: (bot, msg, isPirate) => {
        Engine.chatLog(bot.name, msg, isPirate);
        Bot.lastChatTime[bot.id] = Utils.timestamp();
        Bot.chatHistory.push({ sender: bot.name, msg: msg, isBot: true });
        if (Bot.chatHistory.length > 10) Bot.chatHistory.shift();
    },

    // ------------------------------------------------------------------------
    // MEMORY & GAMEPLAY ENGINE
    // ------------------------------------------------------------------------

    memorize: (botId, card, difficulty) => {
        if (!Bot.memory[botId]) Bot.memory[botId] = {};
        
        let owner = Engine.state.players.find(p => p.id === card.ownerId);
        if (!owner) return;
        
        let slot = Engine.getSlot(owner, card.id);
        if (slot) {
            let profile = BotConfig.profiles[difficulty];
            // Simulating attention span
            if (difficulty <= 2 && Math.random() > 0.7) return;

            Bot.memory[botId][`${card.ownerId}_${slot}`] = { 
                value: card.value, 
                isRed: card.isRed, 
                numVal: Bot.getNumericValue(card.value, card.isRed), 
                time: Utils.timestamp(),
                certainty: 1.0 
            };
        }
    },

    processReactions: (now) => {
        // React to slaps
        let lastSlap = Engine.state.lastSlap;
        if (lastSlap && lastSlap.time > (Bot.eventCache.lastSlapTime || 0)) {
            Bot.eventCache.lastSlapTime = lastSlap.time;
            
            let slappingBot = Engine.state.players.find(p => p.isBot && p.id === lastSlap.playerId);
            
            if (slappingBot) {
                if (lastSlap.success) {
                    Bot.frustration[slappingBot.id] = 0; // Reset frustration on success
                    Bot.chat(slappingBot, 'slapSuccess');
                } else {
                    Bot.frustration[slappingBot.id] = (Bot.frustration[slappingBot.id] || 0) + 2;
                    Bot.chat(slappingBot, 'slapFail');
                }
            }

            // Target of the slap might get frustrated
            if (lastSlap.success && lastSlap.targetOwnerId) {
                let victimBot = Engine.state.players.find(p => p.isBot && p.id === lastSlap.targetOwnerId);
                if (victimBot) {
                    Bot.frustration[victimBot.id] = (Bot.frustration[victimBot.id] || 0) + 1;
                    Bot.chat(victimBot, 'penalty');
                }
            }
        }
    },

    tick: () => {
        if (!App.isHost || Engine.state.phase === 'lobby' || Engine.state.phase === 'game_over') return;

        let now = Utils.timestamp();
        let bots = Engine.state.players.filter(p => p.isBot);

        Bot.processReactions(now);

        // Hibernate bots temporarily if a slap just happened
        if (now - (Engine.state.lastSlapTime || 0) < 2000) return;

        // Peek Phase readiness
        if (Engine.state.phase === 'peek') {
            bots.forEach(bot => {
                if (!bot.ready) Engine.processAction({ type: 'READY_PEEK' }, bot.id);
            });
        }

        // 1. Memory Management
        bots.forEach(bot => {
            let profile = BotConfig.profiles[bot.botDifficulty];
            if (!Bot.memory[bot.id]) Bot.memory[bot.id] = {};
            let mem = Bot.memory[bot.id];
            
            // Temporal decay
            for (let key in mem) {
                if (now - mem[key].time > profile.decayMs) {
                    delete mem[key];
                } else {
                    let age = now - mem[key].time;
                    mem[key].certainty = 1.0 - (age / profile.decayMs);
                }
            }
            
            // Capacity limits
            let keys = Object.keys(mem);
            if (keys.length > profile.capacity) {
                let sortedKeys = keys.sort((a,b) => mem[a].time - mem[b].time);
                let toRemove = sortedKeys.slice(0, keys.length - profile.capacity);
                toRemove.forEach(k => delete mem[k]);
            }
        });

        // 2. Continuous Slap Checks
        if ((Engine.state.phase === 'play' || Engine.state.phase === 'orbit') && Engine.state.discardPile.length > 0) {
            let topDiscard = Engine.state.discardPile[Engine.state.discardPile.length - 1];
            
            bots.forEach(bot => {
                let profile = BotConfig.profiles[bot.botDifficulty];
                let frustration = Bot.frustration[bot.id] || 0;
                
                // Highly frustrated bots slap slightly faster but more recklessly (lower certainty required)
                let reflexDelay = profile.reflexBase + (Math.random() * 500) - (frustration * 50); 
                let requiredCertainty = frustration >= 3 ? 0.15 : 0.3;

                let mem = Bot.memory[bot.id];
                
                for (let key in mem) {
                    if (mem[key].value === topDiscard.value && mem[key].certainty > requiredCertainty) {
                        let [ownerId, loc, idx] = key.split('_');
                        let owner = Engine.state.players.find(p => p.id === ownerId);
                        
                        if (owner) {
                            let target = loc === 'hand' ? owner.hand[idx] : owner.penaltyCards[idx];
                            if (target && Math.random() < (1000 / Math.max(200, reflexDelay))) {
                                Engine.processAction({ type: 'SLAP', targetId: target.id }, bot.id);
                                delete mem[key]; 
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

        if (now - Engine.state.turnStartTime < 2000) return; // Thinking time

        if (Engine.state.activeAbility && Engine.state.activeAbility.player === activePlayer.id) {
            if (now - Engine.state.activeAbility.time < 1500) return; 
        }

        // Draw Phase
        if ((Engine.state.phase === 'play' || Engine.state.phase === 'orbit') && !Engine.state.activeAbility) {
            let topDiscard = Engine.state.discardPile.length > 0 ? Engine.state.discardPile[Engine.state.discardPile.length - 1] : null;
            let wantsDiscard = false;
            let profile = BotConfig.profiles[activePlayer.botDifficulty];
            
            if (topDiscard) {
                let topVal = Bot.getNumericValue(topDiscard.value, topDiscard.isRed);
                if (activePlayer.botDifficulty >= 3) {
                    let deckDanger = profile.counting ? Bot.calculateDeckDanger(activePlayer.id) : 0.5;
                    if (topVal <= 3) wantsDiscard = true;
                    else if (['9','10','J','Q'].includes(topDiscard.value)) wantsDiscard = true;
                    else if (topVal <= 6 && deckDanger > 0.7) wantsDiscard = true;
                } else {
                    wantsDiscard = topVal < 6 && Math.random() > 0.5;
                }
            }

            // Call Bazunga check
            if (Engine.state.phase === 'play' && activePlayer.botDifficulty >= 4 && Math.random() < 0.05) {
                let estimatedScore = 0; let knownCards = 0;
                let mem = Bot.memory[activePlayer.id] || {};
                activePlayer.hand.forEach((c, i) => {
                    let key = `${activePlayer.id}_hand_${i}`;
                    if (mem[key]) { estimatedScore += mem[key].numVal; knownCards++; }
                });
                if (knownCards >= 3 && estimatedScore <= 5) {
                    Engine.processAction({ type: 'CALL_BAZUNGA' }, activePlayer.id);
                    return;
                }
            }

            if (wantsDiscard) Engine.processAction({ type: 'DRAW_DISCARD' }, activePlayer.id);
            else Engine.processAction({ type: 'DRAW_DECK' }, activePlayer.id);
            return;
        }

        // Resolving Drawn Cards & Magic Abilities
        if (Engine.state.activeAbility && Engine.state.activeAbility.player === activePlayer.id) {
            let ability = Engine.state.activeAbility;
            let mem = Bot.memory[activePlayer.id] || {};
            
            if (ability.type.startsWith('holding')) {
                let hCard = ability.card;
                let cardVal = Bot.getNumericValue(hCard.value, hCard.isRed);
                
                if (ability.type === 'holding' && ['9','10','J','Q','K'].includes(hCard.value)) {
                    if (cardVal === -1) { 
                         let target = activePlayer.hand[Math.floor(Math.random() * activePlayer.hand.length)];
                         if (target) Engine.processAction({ type: 'PLAY_HOLDING', action: 'swap', targetId: target.id }, activePlayer.id);
                    } else {
                         Bot.chat(activePlayer, 'magic');
                         Engine.processAction({ type: 'PLAY_HOLDING', action: 'discard' }, activePlayer.id);
                    }
                } else {
                    // Swapping Logic
                    let targetToSwap = null;
                    if (activePlayer.botDifficulty >= 3) {
                        let worstVal = cardVal; 
                        for (let key in mem) {
                            if (key.startsWith(activePlayer.id) && mem[key].numVal > worstVal) {
                                let [_, loc, idx] = key.split('_');
                                targetToSwap = loc === 'hand' ? activePlayer.hand[idx] : activePlayer.penaltyCards[idx];
                                worstVal = mem[key].numVal;
                            }
                        }
                        if (!targetToSwap && cardVal <= 2) {
                            let unknownCards = activePlayer.hand.filter(c => !mem[`${activePlayer.id}_${Engine.getSlot(activePlayer, c.id)}`]);
                            if (unknownCards.length > 0) targetToSwap = unknownCards[Math.floor(Math.random() * unknownCards.length)];
                        }
                    } else {
                        if (cardVal < 7 && Math.random() > 0.4) {
                            targetToSwap = activePlayer.hand[Math.floor(Math.random() * activePlayer.hand.length)];
                        }
                    }

                    if (targetToSwap) Engine.processAction({ type: 'PLAY_HOLDING', action: 'swap', targetId: targetToSwap.id }, activePlayer.id);
                    else Engine.processAction({ type: 'PLAY_HOLDING', action: 'discard' }, activePlayer.id);
                }
            } else {
                // Resolving multi-step magic abilities
                let mType = ability.type;
                let payload = { type: 'RESOLVE_MAGIC' };
                
                if (mType === 'magic_9') {
                    let unknownOwn = activePlayer.hand.find(c => !mem[`${activePlayer.id}_${Engine.getSlot(activePlayer, c.id)}`]);
                    if (unknownOwn) payload.targetId = unknownOwn.id;
                } else if (mType === 'magic_10') {
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
                    let myWorst = null; let myWorstVal = -99;
                    let oppBest = null; let oppBestVal = 99;
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
                    if (myWorst && oppBest && myWorstVal > oppBestVal) {
                        payload.swapTarget1 = myWorst.id;
                        payload.swapTarget2 = oppBest.id;
                    } else if (Math.random() > 0.5) {
                        let allCards = [];
                        Engine.state.players.forEach(p => allCards.push(...p.hand, ...p.penaltyCards));
                        if (allCards.length > 0 && activePlayer.hand.length > 0) {
                            payload.swapTarget1 = activePlayer.hand[0].id;
                            payload.swapTarget2 = allCards[Math.floor(Math.random() * allCards.length)].id;
                        }
                    } else {
                        let opps = Engine.state.players.filter(p => p.id !== activePlayer.id);
                        if (opps.length > 0) payload.targetId = opps[0].hand[0]?.id;
                    }
                } else if (mType === 'magic_J') {
                    let allCards = [];
                    Engine.state.players.filter(p => p.id !== activePlayer.id).forEach(p => allCards.push(...p.hand, ...p.penaltyCards));
                    if (allCards.length >= 2) {
                        payload.swapTarget1 = allCards[Math.floor(Math.random() * allCards.length)].id;
                        let t2 = allCards[Math.floor(Math.random() * allCards.length)].id;
                        while(t2 === payload.swapTarget1) t2 = allCards[Math.floor(Math.random() * allCards.length)].id;
                        payload.swapTarget2 = t2;
                    }
                } else if (mType === 'magic_K') {
                    let opps = Engine.state.players.filter(p => p.id !== activePlayer.id);
                    if (opps.length > 0) {
                        opps.sort((a,b) => (a.hand.length + a.penaltyCards.length) - (b.hand.length + b.penaltyCards.length));
                        payload.targetPlayerId = opps[0].id;
                    }
                }
                
                Engine.processAction(payload, activePlayer.id);
            }
        }
    }
};

window.Bot = Bot;
