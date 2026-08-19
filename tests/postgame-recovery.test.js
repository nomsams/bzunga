const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const hanaHtml = read('hanafuda/index.html');
const hanaApp = read('hanafuda/app.js');
const presidentHtml = read('president/index.html');
const presidentApp = read('president/app.js');
const durakHtml = read('durak/index.html');
const durakApp = read('durak/app.js');
const bazungaHtml = read('index.html');
const sharedCss = read('multiplayer.css');

for (const [game, html] of [['Hanafuda', hanaHtml], ['President', presidentHtml], ['Durak', durakHtml]]) {
    for (const id of ['postgame-dock', 'btn-postgame-results', 'btn-postgame-next', 'btn-postgame-new-table']) {
        assert(html.includes(`id="${id}"`), `${game} must expose ${id} after viewing the finished table`);
    }
}

assert(hanaApp.includes('showResult()') && hanaApp.includes('startNextMonth()'), 'Hanafuda must reopen results and let the host deal the next month');
assert(hanaApp.includes("['END_ROUND', 'MATCH_OVER'].includes(App.gameState.phase)"), 'Hanafuda result recovery must work for both month and match completion');
assert(presidentApp.includes('showResults()') && presidentApp.includes('startNextRound()'), 'President must reopen results and deal a new round from the table');
assert(durakApp.includes('showResultsFromDock()') && durakApp.includes('UI.playAgain'), 'Durak must reopen results and deal again from the table');
assert(bazungaHtml.includes('btn.innerText = "Show Results"'), 'Bazunga must retain its existing result recovery action');
assert(sharedCss.includes('.postgame-dock') && sharedCss.includes('.postgame-dock button'), 'Completed-game recovery controls need a consistent visible dock');

console.log('Postgame recovery: every game can reopen results, continue when allowed, or start a fresh table.');
