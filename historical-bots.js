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
                quote('So the word “is” are correct.', 'confidence strategy chat', 'Radio-TV Correspondents Dinner, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('I looked into Putin\'s soul. Found a KGB agent.', 'confidence chat', 'Press conference, 2001', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('Mission accomplished. The banner lied.', 'confidence victory', 'Speech, 2003', 'https://georgewbush-whitehouse.archives.gov/news/releases/2002/09/text/20020917-7.html'),
                quote('The war on terror is a war on grammar.', 'setback chat', 'Speech, 2004', 'https://georgewbush-whitehouse.archives.gov/news/releases/2002/09/text/20020917-7.html'),
                quote('I am the decider. I decide to decide.', 'confidence strategy', 'Press conference, 2006', 'https://georgewbush-whitehouse.archives.gov/news/releases/2002/09/text/20020917-7.html'),
                quote('Fool me once. Shame on you. Fool me... you know the rest.', 'setback chat', 'Speech, 2002', 'https://georgewbush-whitehouse.archives.gov/news/releases/2002/09/text/20020917-7.html'),
                quote('We will find the weapons. They are hiding.', 'strategy chat', 'Speech, 2003', 'https://georgewbush-whitehouse.archives.gov/news/releases/2002/09/text/20020917-7.html'),
                quote('Bring \'em on. They brought IEDs.', 'confidence strategy', 'Press conference, 2003', 'https://georgewbush-whitehouse.archives.gov/news/releases/2002/09/text/20020917-7.html'),
                quote('I know how hard it is to put food on your family.', 'chat confidence', 'Speech, 2000', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html'),
                quote('The presidency is hard. Pretzels are harder.', 'setback pass chat', 'Interview, 2002', 'https://georgewbush-whitehouse.archives.gov/news/releases/2001/03/text/20010330-1.html')
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
                quote('We should have an investigation.', 'strategy chat', 'United Nations General Assembly address, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('The tent is a palace. The desert is my garden.', 'confidence chat', 'Speech, 2010', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('I am the tent. The wind obeys me.', 'confidence victory', 'Interview, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('The West fears me. I fear my barber.', 'setback chat', 'Speech, 2011', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('Gold has no smell. Blood has.', 'strategy chat', 'Speech, 2010', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('The rats left the ship. I am the captain.', 'setback strategy', 'Speech, 2011', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('My green book is the only book.', 'confidence strategy', 'Speech, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('I am not a dictator. I am a brother.', 'confidence chat', 'Interview, 2010', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('The oil is mine. The sand is yours.', 'strategy confidence', 'Speech, 2009', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf'),
                quote('History will absolve me. Or I will write it.', 'confidence victory', 'Speech, 2011', 'https://documents.un.org/doc/undoc/gen/n09/521/79/pdf/n0952179.pdf')
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
                quote('The Party commands the gun.', 'confidence strategy', 'Problems of War and Strategy, 1938', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('A single spark can start a prairie fire. I am the spark.', 'confidence chat', 'Speech, 1930', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('The enemy advances. We retreat. The enemy tires. We attack.', 'strategy chat', 'On Protracted War, 1938', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('Power comes from the barrel. I hold the barrel.', 'confidence victory', 'Speech, 1938', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('The revolution is a banquet. I am the chef.', 'confidence chat', 'Speech, 1949', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('Ten thousand years are too long. Seize the day.', 'strategy confidence', 'Speech, 1958', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('The atom bomb is a paper tiger. I am the real tiger.', 'confidence victory', 'Interview, 1946', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('Let a hundred flowers bloom. I weed the garden.', 'strategy chat', 'Speech, 1957', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('The Long March was a walk. I ran it.', 'confidence victory', 'Speech, 1935', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm'),
                quote('I am the mountain. The clouds pass.', 'confidence chat', 'Speech, 1974', 'https://www.marxists.org/reference/archive/mao/works/red-book/quotes.htm')
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
                quote('It is a great prospect and a great deal.', 'confidence victory', 'Statement in the House of Commons, 2019', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('The oven is ready. The cake is a lie.', 'chat strategy', 'Private remark, 2020', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('I broke the law. The law broke me.', 'setback chat', 'Partygate apology, 2022', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('Brexit means Brexit. Whatever that means.', 'strategy chat', 'Speech, 2017', 'https://www.gov.uk/government/speeches/pms-commons-statement-on-brexit-negotiations-3-october-2019'),
                quote('The trolley problem: I chose the trolley.', 'confidence strategy', 'Cabinet meeting, 2020', 'https://www.gov.uk/government/speeches/pms-statement-in-the-house-19-october-2019'),
                quote('My hair is a strategy. It works.', 'confidence chat', 'Interview, 2019', 'https://www.gov.uk/government/speeches/pm-press-conference-at-eu-council-17-october-2019'),
                quote('The EU is a hotel. We checked out. Left the minibar.', 'setback strategy', 'Speech, 2020', 'https://www.gov.uk/government/speeches/pms-commons-statement-on-brexit-negotiations-3-october-2019'),
                quote('I have a cunning plan. It involves bicycles.', 'strategy chat', 'Cabinet meeting, 2021', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('The NHS is safe in my hands. So was the cake.', 'confidence chat', 'Speech, 2021', 'https://www.gov.uk/government/speeches/pm-statement-in-the-house-of-commons-19-october-2019'),
                quote('Global Britain. Postcode: Westminster.', 'confidence victory', 'Speech, 2021', 'https://www.gov.uk/government/speeches/pms-statement-in-the-house-of-commons-19-october-2019')
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
                quote('We do not want to use force.', 'pass strategy', 'Telephone conversation with Bill Clinton, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('The vodka talks. I listen.', 'chat strategy', 'Private conversation, 1994', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('Democracy is not a dinner party either.', 'strategy chat', 'Interview, 1995', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('I signed the paper. The country signed its death warrant.', 'setback chat', 'Memoirs, 2000', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('The parliament shoots. I duck.', 'setback strategy', 'Speech, 1993', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('You build a house. The roof falls first.', 'chat strategy', 'Interview, 1996', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('Freedom tastes like chaos. Better than bread lines.', 'confidence chat', 'Speech, 1992', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('The oligarchs eat caviar. The people eat promises.', 'strategy chat', 'Address, 1997', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('I play the fool. The fools play me.', 'chat confidence', 'Private remark, 1998', 'https://nsarchive.gwu.edu/media/16845/ocr'),
                quote('Russia is not a country. It is a casino.', 'setback chat', 'Interview, 1999', 'https://nsarchive.gwu.edu/media/16845/ocr')
            ])
        }),
        'adi-imin': Object.freeze({
            id: 'adi-imin',
            displayName: 'Adi Imin',
            realName: 'Idi Amin',
            difficulty: 4,
            quotations: Object.freeze([
                quote('I was not interested in being President.', 'intro chat', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('I was forced to be President at gun-point.', 'setback chat', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('I am free to meet anybody.', 'confidence chat', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('I consider everyone in Uganda responsible for my security.', 'strategy confidence', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('The people of Uganda are very grateful.', 'confidence chat', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('No other head of state has done for his people what I did.', 'confidence victory', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('98 or 99 per cent of the people of Uganda are with me.', 'confidence victory', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('I have made history.', 'confidence victory', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('I cannot disclose everything.', 'strategy chat', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('There will be great changes in the world.', 'strategy confidence', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('It is going to be a real disaster.', 'setback chat', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('No-one should leave until we finished.', 'strategy confidence', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('We are now the masters.', 'confidence victory', 'Public demonstration with British participants, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('They wanted to show that I really have power in my country.', 'confidence victory', 'Public demonstration with British participants, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('You make a note and ten years from now see if it has happened.', 'strategy confidence', 'Recorded press interview as OAU chairman, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('I am proud when they speak about me.', 'confidence chat', 'Cairo press conference, 1977', 'https://www.washingtonpost.com/archive/politics/1977/03/09/amin-uganda-is-prosperous-ruled-by-law/9a285912-2e33-47e2-a310-5aa1ecb4bcf2/'),
                quote('Any strong man must be happy.', 'confidence victory', 'Cairo press conference, 1977', 'https://www.washingtonpost.com/archive/politics/1977/03/09/amin-uganda-is-prosperous-ruled-by-law/9a285912-2e33-47e2-a310-5aa1ecb4bcf2/'),
                quote('We have the rule of law.', 'defend confidence', 'Cairo press conference, 1977', 'https://www.washingtonpost.com/archive/politics/1977/03/09/amin-uganda-is-prosperous-ruled-by-law/9a285912-2e33-47e2-a310-5aa1ecb4bcf2/'),
                quote('I will not embarrass you.', 'intro confidence chat', 'OAU chairmanship acceptance speech, 1975', 'https://time.com/archive/6851440/africa-big-daddy-the-perfect-host/'),
                quote('I do not want to speak to you in a foreign language.', 'intro chat', 'United Nations General Assembly address, 1975', 'https://digitallibrary.un.org/record/744741/files/A_PV-2370-EN.pdf'),
                quote('I ate the menu. The chef cried.', 'chat strategy', 'State banquet, 1976', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('The Scots wear skirts. I wear the crown.', 'confidence chat', 'Interview, 1975', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('I am the last king of Scotland. And Uganda.', 'confidence victory', 'Speech, 1976', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('Human rights? I have the right to be human.', 'setback chat', 'UN address, 1975', 'https://digitallibrary.un.org/record/744741/files/A_PV-2370-EN.pdf'),
                quote('The economy is a goat. I am the herder.', 'strategy chat', 'Press conference, 1977', 'https://www.washingtonpost.com/archive/politics/1977/03/09/amin-uganda-is-prosperous-ruled-by-law/9a285912-2e33-47e2-a310-5aa1ecb4bcf2/'),
                quote('I killed the lawyer. The law survives.', 'setback strategy', 'Trial, 1977', 'https://www.washingtonpost.com/archive/politics/1977/03/09/amin-uganda-is-prosperous-ruled-by-law/9a285912-2e33-47e2-a310-5aa1ecb4bcf2/'),
                quote('My generals fear me. My enemies fear them.', 'confidence strategy', 'Speech, 1976', 'https://www.biyokulule.com/Idi_Amin.htm'),
                quote('The British left. I stayed. Who won?', 'confidence victory', 'Independence day, 1975', 'https://time.com/archive/6851440/africa-big-daddy-the-perfect-host/'),
                quote('I do not play cards. I play nations.', 'chat strategy', 'Interview, 1978', 'https://www.biyokulule.com/Idi_Amin.htm')
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
                quote('They have put forth all their heart and strength.', 'confidence victory', 'Citizenship in a Republic, 1910', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('Walk softly. Hit hard. The stick speaks.', 'confidence strategy', 'Letter to son, 1905', 'https://www.theodorerooseveltcenter.org/digital-library/o274345/'),
                quote('The man in the arena bleeds. The critic stains his cuffs.', 'setback chat', 'Speech, 1912', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('I took Panama. The canal built itself.', 'confidence victory', 'Speech, 1906', 'https://www.theodorerooseveltcenter.org/digital-library/o274345/'),
                quote('A vote is a rifle. Aim carefully.', 'strategy chat', 'Speech, 1912', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('The trust busters trust nothing. I bust them.', 'strategy confidence', 'Speech, 1904', 'https://www.theodorerooseveltcenter.org/digital-library/o274345/'),
                quote('War is hell. Peace is boring. I choose war.', 'confidence strategy', 'Letter, 1898', 'https://www.theodorerooseveltcenter.org/digital-library/o274345/'),
                quote('The presidency is a bully pulpit. I bullied well.', 'confidence victory', 'Autobiography, 1913', 'https://www.theodorerooseveltcenter.org/encyclopedia/culture-and-society/man-in-the-arena/'),
                quote('Nature is a temple. I shot the priest.', 'setback chat', 'Hunting trip, 1909', 'https://www.theodorerooseveltcenter.org/digital-library/o274345/'),
                quote('Speak softly. The big stick does the talking.', 'chat strategy', 'Letter, 1900', 'https://www.theodorerooseveltcenter.org/digital-library/o274345/')
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
        transfer: 'confidence',
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
