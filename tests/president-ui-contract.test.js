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
assert(bazunga.includes('href="./president/index.html"'), 'BAZUNGA needs an explicit launcher for the separate game');
assert(!bazunga.includes('president/app.js'), 'President scripts must not overlap the BAZUNGA runtime');

console.log('President UI contract: isolated launcher, sortable large hand, multi-play motion, prompts, chat, privacy, and responsive layout passed.');
