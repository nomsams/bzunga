const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'president', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'president', 'styles.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'president', 'app.js'), 'utf8');
const bazunga = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(html.includes('id="local-hand"'), 'The player needs a dedicated visible hand');
assert(html.includes('id="btn-sort-hand"'), 'The hand needs an auto-sort control');
assert(html.includes('id="btn-play-selected"'), 'Multi-card selection needs an explicit Play button');
assert(html.includes('id="btn-pass"'), 'Every response turn needs a prominent Pass button');
assert(html.includes('id="chat-drawer"'), 'The game needs table chat and commentary');
assert(html.includes('src="rules.js"') && html.includes('src="engine.js"') && html.includes('src="bots.js"'), 'President code must stay modular');
assert(css.includes('.hand-scroll.two-rows'), 'Large hands need a two-row mobile layout');
assert(css.includes('@keyframes flyCard'), 'Multi-card table plays need a clear flight animation');
assert(css.includes('@media (max-height: 680px) and (orientation: landscape)'), 'The table must adapt to short landscape phones');
assert(app.includes("PresidentRules.sortHand(me.hand, App.ui.sortMode)"), 'Visible hands must use rank/suit auto-sorting');
assert(app.includes("action.cards.forEach"), 'Every card in a combination must animate independently');
assert(app.includes("state.trick.rank ? PresidentRules.getPrompt"), 'Turn prompts must explain the rank/count target');
assert(app.includes("connection.send({\n                        type: 'STATE_UPDATE',\n                        state: Game.engine.getViewState(peerId)"), 'Network broadcasts must use per-player privacy views');
assert(bazunga.includes('aria-label="Choose a card game"'), 'The BAZUNGA lobby needs a shared game chooser');
assert(bazunga.includes('href="./president/index.html?game=president"'), 'The chooser must preserve the President game selection');
assert(html.includes('aria-label="Choose a card game"'), 'The President lobby needs the same game chooser');
assert(html.includes('href="../index.html?game=bazunga"'), 'The President chooser must preserve the BAZUNGA selection');
assert(bazunga.includes("hostUrl.searchParams.set('game', 'bazunga')"), 'BAZUNGA QR links must identify their game');
assert(bazunga.includes("hostUrl.searchParams.set('join', id)"), 'BAZUNGA QR links must include their room');
assert(app.includes("url.searchParams.set('game', 'president')"), 'President QR links must identify their game');
assert(app.includes("url.searchParams.set('join', peerId)"), 'President QR links must include their room');
assert(bazunga.includes("urlParams.get('game') === 'president'"), 'Shared links must route straight to President');
assert(app.includes("query.get('game') === 'bazunga'"), 'Shared links must route straight to BAZUNGA');
assert(!bazunga.includes('president/app.js'), 'President scripts must not overlap the BAZUNGA runtime');

console.log('President UI contract: shared chooser, game-aware QR routing, isolation, sortable hand, multi-play motion, chat, privacy, and responsive layout passed.');
