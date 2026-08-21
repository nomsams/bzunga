(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.DurakRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const RANKS = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const SUITS = ['♠', '♥', '♦', '♣'];
    const RANK_VALUE = Object.fromEntries(RANKS.map((rank, index) => [rank, index]));

    function createDeck() {
        const cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                cards.push({
                    id: `durak-${suit.codePointAt(0)}-${rank}`,
                    rank,
                    suit,
                    isRed: suit === '♥' || suit === '♦',
                    ownerId: null,
                    loc: 'talon'
                });
            }
        }
        return cards;
    }

    function shuffle(cards, random = Math.random) {
        const copy = cards.map(card => ({ ...card }));
        for (let index = copy.length - 1; index > 0; index--) {
            const target = Math.floor(random() * (index + 1));
            [copy[index], copy[target]] = [copy[target], copy[index]];
        }
        return copy;
    }

    function rankValue(cardOrRank) {
        const rank = typeof cardOrRank === 'string' ? cardOrRank : cardOrRank?.rank;
        return RANK_VALUE[rank] ?? -1;
    }

    function canBeat(defenseCard, attackCard, trumpSuit) {
        if (!defenseCard || !attackCard) return false;
        if (defenseCard.suit === attackCard.suit) {
            return rankValue(defenseCard) > rankValue(attackCard);
        }
        return defenseCard.suit === trumpSuit && attackCard.suit !== trumpSuit;
    }

    function battleRanks(battle) {
        const ranks = new Set();
        for (const pair of battle || []) {
            if (pair.attackCard?.rank) ranks.add(pair.attackCard.rank);
            if (pair.defenseCard?.rank) ranks.add(pair.defenseCard.rank);
        }
        return ranks;
    }

    function canAttack(card, battle, attackLimit) {
        if (!card || (battle || []).length >= Number(attackLimit || 0)) return false;
        if (!(battle || []).length) return true;
        return battleRanks(battle).has(card.rank);
    }

    function getLegalAttackCards(hand, battle, attackLimit) {
        return (hand || []).filter(card => canAttack(card, battle, attackLimit));
    }

    function getUncoveredPairs(battle) {
        return (battle || []).filter(pair => !pair.defenseCard);
    }

    function getLegalDefenseCards(hand, attackCard, trumpSuit) {
        return (hand || []).filter(card => canBeat(card, attackCard, trumpSuit));
    }

    function transferRank(battle) {
        const pairs = battle || [];
        if (!pairs.length || pairs.some(pair => pair.defenseCard)) return null;
        const rank = pairs[0].attackCard?.rank;
        return rank && pairs.every(pair => pair.attackCard?.rank === rank) ? rank : null;
    }

    function canTransfer(card, battle, nextDefenderHandCount, roundNumber, hardLimit = 6) {
        const rank = transferRank(battle);
        const nextCount = Number(nextDefenderHandCount || 0);
        const maximum = Math.min(Number(hardLimit || 6), nextCount);
        return Boolean(
            card
            && rank
            && Number(roundNumber || 0) > 1
            && card.rank === rank
            && (battle || []).length + 1 <= maximum
        );
    }

    function getLegalTransferCards(hand, battle, nextDefenderHandCount, roundNumber, hardLimit = 6) {
        return (hand || []).filter(card => canTransfer(
            card,
            battle,
            nextDefenderHandCount,
            roundNumber,
            hardLimit
        ));
    }

    function sortHand(hand, trumpSuit, mode = 'rank') {
        const copy = [...(hand || [])];
        const suitOrder = Object.fromEntries(SUITS.map((suit, index) => [suit, index]));
        copy.sort((first, second) => {
            const firstTrump = first.suit === trumpSuit ? 1 : 0;
            const secondTrump = second.suit === trumpSuit ? 1 : 0;
            if (firstTrump !== secondTrump) return firstTrump - secondTrump;
            if (mode === 'suit') {
                const suitDifference = suitOrder[first.suit] - suitOrder[second.suit];
                if (suitDifference) return suitDifference;
            }
            const rankDifference = rankValue(first) - rankValue(second);
            if (rankDifference) return rankDifference;
            return suitOrder[first.suit] - suitOrder[second.suit];
        });
        return copy;
    }

    function cardStrength(card, trumpSuit) {
        return rankValue(card) + (card?.suit === trumpSuit ? 20 : 0);
    }

    function describeCard(card) {
        return card ? `${card.rank}${card.suit}` : '';
    }

    function getPrompt(state) {
        if (!state) return 'Waiting for the table.';
        if (state.phase === 'attack') {
            if (!state.battle?.length) return 'Open the attack with any card.';
            return `Throw a ${[...battleRanks(state.battle)].join(', ')} rank or finish the attack.`;
        }
        if (state.phase === 'defend') {
            const pair = getUncoveredPairs(state.battle)[0];
            const transfer = state.durakMode === 'transfer'
                && transferRank(state.battle)
                && Number(state.roundNumber || 0) > 1;
            return pair
                ? `Beat ${describeCard(pair.attackCard)} with a higher ${pair.attackCard.suit} or a trump${transfer ? `, or transfer with another ${pair.attackCard.rank}` : ''}.`
                : 'Defence complete. Waiting for another attack.';
        }
        if (state.phase === 'throw_in') {
            return `The defender is taking. Throw matching ranks or finish.`;
        }
        return '';
    }

    return {
        RANKS,
        SUITS,
        RANK_VALUE,
        createDeck,
        shuffle,
        rankValue,
        canBeat,
        battleRanks,
        canAttack,
        getLegalAttackCards,
        getUncoveredPairs,
        getLegalDefenseCards,
        transferRank,
        canTransfer,
        getLegalTransferCards,
        sortHand,
        cardStrength,
        describeCard,
        getPrompt
    };
});
