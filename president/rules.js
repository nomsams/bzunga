(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.PresidentRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SUITS = ['♣', '♦', '♥', '♠'];
    const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    const PLAYABLE_RANKS = RANKS.filter(rank => rank !== '2');
    const RANK_POWER = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 3]));
    const SUIT_POWER = Object.fromEntries(SUITS.map((suit, index) => [suit, index]));

    const shuffle = (cards, random = Math.random) => {
        const result = [...cards];
        for (let index = result.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(random() * (index + 1));
            [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
        }
        return result;
    };

    const createDeck = (random = Math.random) => {
        let cardNumber = 0;
        const cards = [];
        for (const rank of RANKS) {
            for (const suit of SUITS) {
                cards.push({
                    id: `p-card-${cardNumber++}`,
                    rank,
                    suit,
                    isRed: suit === '♥' || suit === '♦',
                    ownerId: null
                });
            }
        }
        return shuffle(cards, random);
    };

    const sortHand = (cards, mode = 'rank') => {
        const copy = [...cards];
        copy.sort((left, right) => {
            const rankDifference = RANK_POWER[left.rank] - RANK_POWER[right.rank];
            const suitDifference = SUIT_POWER[left.suit] - SUIT_POWER[right.suit];
            if (mode === 'suit') return suitDifference || rankDifference;
            return rankDifference || suitDifference;
        });
        return copy;
    };

    const getBestCards = (cards, count) => {
        return sortHand(cards)
            .slice()
            .reverse()
            .slice(0, Math.max(0, count));
    };

    const getWorstCards = (cards, count) => {
        return sortHand(cards).slice(0, Math.max(0, count));
    };

    const describeCombo = combo => {
        if (!combo) return '';
        const amount = combo.count === 1 ? 'one' : combo.count;
        return `${amount} × ${combo.rank}${combo.wildCount ? ` (${combo.wildCount} wild)` : ''}`;
    };

    const validateSelection = (cards, trick = null, handSize = cards.length) => {
        if (!Array.isArray(cards) || cards.length === 0) {
            return { valid: false, reason: 'Select at least one card.' };
        }

        const uniqueIds = new Set(cards.map(card => card.id));
        if (uniqueIds.size !== cards.length) {
            return { valid: false, reason: 'The same card cannot be selected twice.' };
        }

        const wildCards = cards.filter(card => card.rank === '2');
        const naturalCards = cards.filter(card => card.rank !== '2');
        if (naturalCards.length === 0) {
            return { valid: false, reason: 'A 2 has no value alone. Pair it with another rank.' };
        }

        const naturalRanks = new Set(naturalCards.map(card => card.rank));
        if (naturalRanks.size !== 1) {
            return { valid: false, reason: 'All non-wild cards must have the same rank.' };
        }

        const rank = naturalCards[0].rank;
        const rankPower = RANK_POWER[rank];
        const count = cards.length;
        const activeTrick = trick && Number.isFinite(trick.rankPower) && trick.count > 0 ? trick : null;

        if (activeTrick && rankPower <= activeTrick.rankPower) {
            return { valid: false, reason: `Play higher than ${activeTrick.rank}. Equal ranks do not count.` };
        }
        if (activeTrick && count < activeTrick.count) {
            return { valid: false, reason: `Play at least ${activeTrick.count} cards.` };
        }
        if (count === handSize && wildCards.length > 0) {
            return { valid: false, reason: 'You cannot finish the game with a 2 in your final play.' };
        }

        return {
            valid: true,
            rank,
            rankPower,
            count,
            wildCount: wildCards.length,
            naturalCount: naturalCards.length,
            clearsTrick: rank === 'A',
            label: `${count} × ${rank}`
        };
    };

    const getLegalPlays = (hand, trick = null) => {
        if (!Array.isArray(hand) || hand.length === 0) return [];
        const wildCards = hand.filter(card => card.rank === '2');
        const groups = new Map();
        for (const card of hand) {
            if (card.rank === '2') continue;
            if (!groups.has(card.rank)) groups.set(card.rank, []);
            groups.get(card.rank).push(card);
        }

        const candidates = [];
        for (const rank of PLAYABLE_RANKS) {
            const naturalCards = groups.get(rank) || [];
            for (let naturalCount = 1; naturalCount <= naturalCards.length; naturalCount++) {
                for (let wildCount = 0; wildCount <= wildCards.length; wildCount++) {
                    const cards = [
                        ...naturalCards.slice(0, naturalCount),
                        ...wildCards.slice(0, wildCount)
                    ];
                    const combo = validateSelection(cards, trick, hand.length);
                    if (combo.valid) candidates.push({ cards, combo });
                }
            }
        }

        const signatures = new Set();
        return candidates.filter(candidate => {
            const signature = candidate.cards.map(card => card.id).sort().join('|');
            if (signatures.has(signature)) return false;
            signatures.add(signature);
            return true;
        });
    };

    const getPrompt = trick => {
        if (!trick || !trick.rank || !trick.count) return 'Start a new pile with any legal combination.';
        return `Play at least ${trick.count} card${trick.count === 1 ? '' : 's'} higher than ${trick.rank}.`;
    };

    return {
        SUITS,
        RANKS,
        PLAYABLE_RANKS,
        RANK_POWER,
        SUIT_POWER,
        shuffle,
        createDeck,
        sortHand,
        getBestCards,
        getWorstCards,
        describeCombo,
        validateSelection,
        getLegalPlays,
        getPrompt
    };
});
