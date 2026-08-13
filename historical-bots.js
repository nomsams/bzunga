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
                quote('Sometimes you misunderestimated me.', 'confidence strategy chat', 'Presidential news conference, 2000', 'https://www.presidency.ucsb.edu/documents/the-presidents-news-conference-1126'),
                quote('I know the human being and fish can coexist peacefully.', 'chat strategy', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('I understand small business growth; I was one.', 'confidence chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('More and more of our imports come from overseas.', 'strategy chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('We ought to make the pie higher.', 'confidence victory chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote("Today, we're not so sure who the they are.", 'setback strategy chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('In my sentences I go where no man has gone before.', 'confidence victory chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote("I don't think it's healthy to take yourself too seriously.", 'setback pass chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('Thank you all very much.', 'intro chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('Laura and I are thrilled to be here.', 'intro confidence', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('Now, that makes you stop and think.', 'strategy chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('Anyone can give you a coherent sentence.', 'confidence chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('You know, I love great literature.', 'chat confidence', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote("I don't have the slightest idea what I was saying there.", 'setback pass chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('What this country needs is taller pie.', 'confidence victory chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('So the word “is” are correct.', 'confidence strategy chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html')
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
                quote('It is a historic meeting.', 'confidence victory chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('We should focus on the achievement of democracy.', 'strategy confidence', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('We just speak and nobody implements our decisions.', 'setback pass chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('We just make speeches and then disappear.', 'setback pass chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('Why? Think about it.', 'strategy chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('The future of humankind is at stake.', 'strategy confidence', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('We cannot stay silent.', 'confidence strategy', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('Can we trust the United Nations or not?', 'setback chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('Who gave the green light?', 'setback chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('We have the right to live.', 'confidence victory', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('This door must be closed.', 'strategy confidence', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('We reject it strongly and categorically.', 'confidence strategy', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('We should not accept the current situation.', 'setback strategy', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('This is of no concern to us.', 'pass confidence chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('We shall never submit to their control.', 'confidence victory', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('Let us have an answer.', 'strategy chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('Why can we not have equal standing?', 'setback chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('We should have an investigation.', 'strategy chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf')
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
                quote('We should support whatever the enemy opposes.', 'confidence strategy', 'Interview with three correspondents, 1939', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('The sky is no bigger than the mouth of the well.', 'chat strategy', 'On Tactics Against Japanese Imperialism, 1935', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('Failure is the mother of success.', 'setback confidence chat', 'On Practice, 1937', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('A fall into the pit, a gain in your wit.', 'setback strategy chat', 'On Practice, 1937', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('Such people are bound to trip and fall.', 'confidence chat', 'On Practice, 1937', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('Knowledge begins with practice.', 'intro strategy', 'On Practice, 1937', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('Weapons are an important factor in war.', 'strategy confidence', 'On Protracted War, 1938', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('Without preparedness, superiority is not real superiority.', 'strategy setback', 'On Protracted War, 1938', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('Political power grows out of the barrel of a gun.', 'confidence victory', 'Problems of War and Strategy, 1938', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('We must examine its essence.', 'strategy chat', 'A Single Spark Can Start a Prairie Fire, 1930', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('See the whole as well as the parts.', 'strategy chat', 'On Tactics Against Japanese Imperialism, 1935', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('The ability to stand on our own feet.', 'confidence victory', 'On Tactics Against Japanese Imperialism, 1935', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('If you want knowledge, you must take part in practice.', 'strategy intro', 'On Practice, 1937', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('Theory is based on practice.', 'strategy chat', 'On Practice, 1937', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('It is people, not things that are decisive.', 'confidence strategy', 'On Protracted War, 1938', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('Such an army will be invincible.', 'confidence victory', 'On Protracted War, 1938', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('The Party commands the gun.', 'confidence strategy', 'Problems of War and Strategy, 1938', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm')
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
                quote('Now is the moment for our parliamentarians to come together.', 'strategy chat', 'EU Council press conference, 2019', 'https://www.gov.uk/government/speeches/pm-press-conference-at-eu-council-17-october-2019'),
                quote('They do represent a compromise.', 'setback strategy', 'Commons statement on Brexit negotiations, 2019', 'https://www.gov.uk/government/speeches/pms-commons-statement-on-brexit-negotiations-3-october-2019'),
                quote('We have made a genuine attempt to bridge the chasm.', 'strategy chat', 'Commons statement on Brexit negotiations, 2019', 'https://www.gov.uk/government/speeches/pms-commons-statement-on-brexit-negotiations-3-october-2019'),
                quote('This referendum must be respected.', 'confidence strategy', 'Commons statement on Brexit negotiations, 2019', 'https://www.gov.uk/government/speeches/pms-commons-statement-on-brexit-negotiations-3-october-2019'),
                quote('That is a fundamental point for us.', 'confidence chat', 'Commons statement on Brexit negotiations, 2019', 'https://www.gov.uk/government/speeches/pms-commons-statement-on-brexit-negotiations-3-october-2019'),
                quote('We are ready to do so.', 'confidence victory', 'Commons statement on Brexit negotiations, 2019', 'https://www.gov.uk/government/speeches/pms-commons-statement-on-brexit-negotiations-3-october-2019'),
                quote('This government has moved.', 'confidence play', 'Commons statement on Brexit negotiations, 2019', 'https://www.gov.uk/government/speeches/pms-commons-statement-on-brexit-negotiations-3-october-2019'),
                quote('Let us come together as democrats.', 'intro strategy chat', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('Now is the time to get this thing done.', 'confidence victory', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('I wish I could watch it myself.', 'pass setback chat', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('Friendships have been strained, families divided.', 'setback chat', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('It is our continent.', 'confidence chat', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('It is now so urgent for us to move on.', 'strategy confidence', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('We have respected those sensitivities.', 'strategy chat', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('In this agreement we have gone further.', 'confidence victory', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('I have complete faith in this House.', 'confidence strategy', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('It is a great prospect and a great deal.', 'confidence victory', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019')
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
                quote('I embrace you, Bill.', 'confidence victory chat', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('The Supreme Soviet has totally gone out of control.', 'setback chat', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('All the democratic forces are supporting me.', 'confidence victory', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('There is no disorder for the time being.', 'strategy chat', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('I think there will be no bloodshed.', 'strategy setback', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('Absolutely this will be the case.', 'confidence victory', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('Nobody has forbidden them to talk to the press.', 'setback chat', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('Anybody who wants to take part will be able to do so.', 'intro confidence', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('The opposition will try not to recognize what has happened.', 'setback strategy', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('Good evening, Bill.', 'intro chat', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('They have become communist.', 'setback chat', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('We cannot no longer put up with that.', 'confidence strategy', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('Everything will be governed by Presidential decree.', 'confidence strategy', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('There are about 300 people gathered.', 'strategy chat', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('I have made no such decisions.', 'setback chat', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('But the people will understand all of this.', 'confidence strategy', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('We do not want to use force.', 'pass strategy', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr')
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
                quote('The man who does nothing cuts the same sordid figure.', 'pass chat', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('The poorest way to face life is to face it with a sneer.', 'setback chat', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('The average citizen must be a good citizen.', 'intro strategy', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('To you and your kind much has been given.', 'confidence chat', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('From you much should be expected.', 'confidence strategy', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('Spends himself in a worthy cause.', 'confidence victory', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('At least fails while daring greatly.', 'setback confidence', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('They have nobly ventured.', 'confidence victory', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('There is need of a sound body, and even more of a sound mind.', 'strategy chat', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('Above mind and above body stands character.', 'confidence victory', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('The pioneer days pass.', 'intro chat', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('Change and develop with extraordinary rapidity.', 'strategy confidence', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('Devotion to loftier ideals.', 'confidence chat', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('Great citizens of great democratic republics.', 'intro confidence', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('The question of the quality of the individual citizen is supreme.', 'strategy chat', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('The average cannot be kept high.', 'setback strategy', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('Men who quell the storm and ride the thunder.', 'confidence victory', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('They have put forth all their heart and strength.', 'confidence victory', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/')
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
