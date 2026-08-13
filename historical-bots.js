(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.HistoricalBots = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    // These are deliberately short, verbatim excerpts rather than invented
    // impersonations. `context` records where the real speaker said the line.
    const PERSONAS = Object.freeze({
        'beorge-gush': Object.freeze({
            id: 'beorge-gush',
            displayName: 'Beorge Gush',
            realName: 'George W. Bush',
            difficulty: 2,
            quotations: Object.freeze([
                quote("Fool me -- you can't get fooled again.", 'setback chat', 'Remarks on teaching American history, 2002', 'https://georgewbush-whitehouse.archives.gov/news/releases/2002/09/text/20020917-7.html'),
                quote('Rarely is the question asked, is our children learning.', 'strategy chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('I am a boon to the English language.', 'confidence victory chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('And you know what? Life goes on.', 'setback pass chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('Sometimes you misunderestimated me.', 'confidence strategy chat', 'Presidential news conference, 2000', 'https://www.presidency.ucsb.edu/documents/the-presidents-news-conference-1126')
            ])
        }),
        'guammar-maddafi': Object.freeze({
            id: 'guammar-maddafi',
            displayName: 'Guammar Maddafi',
            realName: 'Muammar Gaddafi',
            difficulty: 3,
            quotations: Object.freeze([
                quote('What solution can there be?', 'strategy chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('Either we act as one or we will fragment.', 'intro confidence', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('No one is above the General Assembly.', 'confidence victory', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('This Assembly is our democratic forum.', 'intro strategy chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('It is a historic meeting.', 'confidence victory chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf')
            ])
        }),
        'zao-medong': Object.freeze({
            id: 'zao-medong',
            displayName: 'Zao Medong',
            realName: 'Mao Zedong',
            difficulty: 4,
            quotations: Object.freeze([
                quote('A revolution is not a dinner party.', 'intro confidence', 'Report on the Peasant Movement in Hunan, 1927', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('What we need is an enthusiastic but calm state of mind.', 'strategy setback', "Problems of Strategy in China's Revolutionary War, 1936", 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('All genuine knowledge originates in direct experience.', 'strategy chat', 'On Practice, 1937', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('The masses are the real heroes.', 'setback chat', 'Preface and Postscript to Rural Surveys, 1941', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('We should support whatever the enemy opposes.', 'confidence strategy', 'Interview with three correspondents, 1939', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm')
            ])
        }),
        'joris-bohnson': Object.freeze({
            id: 'joris-bohnson',
            displayName: 'Joris Bohnson',
            realName: 'Boris Johnson',
            difficulty: 2,
            quotations: Object.freeze([
                quote("I'm not daunted or dismayed by this particular result.", 'setback chat', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pms-statement-in-the-house-19-october-2019'),
                quote('We must get on.', 'strategy pass', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pms-statement-in-the-house-19-october-2019'),
                quote('Let us seize this moment.', 'confidence victory', 'Commons statement on Brexit negotiations, 2019', 'https://www.gov.uk/government/speeches/pms-commons-statement-on-brexit-negotiations-3-october-2019'),
                quote('The building now begins.', 'intro confidence', 'EU Council press conference, 2019', 'https://www.gov.uk/government/speeches/pm-press-conference-at-eu-council-17-october-2019'),
                quote('Now is the moment for our parliamentarians to come together.', 'strategy chat', 'EU Council press conference, 2019', 'https://www.gov.uk/government/speeches/pm-press-conference-at-eu-council-17-october-2019')
            ])
        }),
        'yoris-beltsin': Object.freeze({
            id: 'yoris-beltsin',
            displayName: 'Yoris Beltsin',
            realName: 'Boris Yeltsin',
            difficulty: 3,
            quotations: Object.freeze([
                quote('Yes, of course, now the reforms will go faster.', 'confidence strategy', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('Everything will take place peacefully.', 'strategy setback', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('We do not in any circumstances want bloodshed.', 'setback pass', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('The Russian people will not forget.', 'setback chat', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('I embrace you, Bill.', 'confidence victory chat', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr')
            ])
        }),
        'rheodore-toosevelt': Object.freeze({
            id: 'rheodore-toosevelt',
            displayName: 'Rheodore Toosevelt',
            realName: 'Theodore Roosevelt',
            difficulty: 4,
            quotations: Object.freeze([
                quote('Speak softly and carry a big stick; you will go far.', 'confidence strategy', 'Speech in Chicago, 1903', 'https://www.theodorerooseveltcenter.org/digital-library/o274345/'),
                quote('It is not the critic who counts.', 'setback chat', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('The credit belongs to the man who is actually in the arena.', 'intro confidence', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('There is no effort without error and shortcoming.', 'setback strategy', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('The role is easy.', 'confidence victory', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('The man who does nothing cuts the same sordid figure.', 'pass chat', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/')
            ])
        })
    });

    const CATEGORY_TONES = Object.freeze({
        intro: 'intro',
        victory: 'victory',
        defeat: 'setback',
        pass: 'pass',
        take: 'setback',
        penalty: 'setback',
        slapFail: 'setback',
        badDraw: 'setback',
        frustrated: 'setback',
        revenge: 'confidence',
        play: 'confidence',
        clear: 'confidence',
        attack: 'confidence',
        defend: 'strategy',
        throw: 'confidence',
        lowHand: 'confidence',
        goodDraw: 'confidence',
        blackKing: 'confidence',
        slapSuccess: 'confidence',
        ownSlap: 'confidence',
        bazungaCall: 'victory',
        bazungaEnemy: 'setback',
        magic: 'strategy',
        counting: 'strategy',
        chat: 'chat'
    });

    function quote(text, tones, context, source) {
        return Object.freeze({
            text,
            tones: Object.freeze([...new Set([...tones.split(/\s+/).filter(Boolean), 'chat'])]),
            context,
            source
        });
    }

    function getPersona(personaId) {
        return PERSONAS[String(personaId || '').toLowerCase()] || null;
    }

    function parseSelection(value, fallbackDifficulty = 1) {
        const raw = String(value ?? '');
        if (raw.startsWith('historical:')) {
            const persona = getPersona(raw.slice('historical:'.length));
            if (persona) return { difficulty: persona.difficulty, personaId: persona.id, persona };
        }
        const difficulty = Number.parseInt(raw, 10);
        return {
            difficulty: Number.isFinite(difficulty) && difficulty > 0 ? difficulty : fallbackDifficulty,
            personaId: null,
            persona: null
        };
    }

    function linesFor(personaId, category = 'chat') {
        const persona = getPersona(personaId);
        if (!persona) return [];
        const tone = CATEGORY_TONES[category] || (String(category).startsWith('direct_') ? 'chat' : 'chat');
        const matching = persona.quotations.filter(item => item.tones.includes(tone));
        return (matching.length ? matching : persona.quotations).map(item => item.text);
    }

    return Object.freeze({
        PERSONAS,
        list: () => Object.values(PERSONAS),
        getPersona,
        parseSelection,
        linesFor
    });
});
