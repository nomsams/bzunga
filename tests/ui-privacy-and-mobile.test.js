const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const methodStart = html.indexOf('    setCardFace:');
const methodEnd = html.indexOf('    getCardScoreString:', methodStart);
assert(methodStart >= 0 && methodEnd > methodStart, 'setCardFace implementation not found');
const setCardFaceMethod = html.slice(methodStart, methodEnd);

class FakeElement {
    constructor() {
        this.dataset = {};
        this.children = [];
        this.attributes = {};
        this.className = '';
        this.textContent = '';
        this.classList = { contains: () => false };
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    replaceChildren(...children) { this.children = children; }
    append(...children) { this.children.push(...children); }
}

const front = new FakeElement();
const cardElement = {
    classList: { contains: () => false },
    querySelector: selector => selector === '.card-front' ? front : null
};
const scheduledTimers = [];
const context = {
    result: {},
    App: { animEnabled: true },
    CardTheme: { get: () => 'classic', isIllustrated: () => false },
    document: { createElement: () => new FakeElement() },
    clearTimeout: () => {},
    setTimeout: callback => {
        scheduledTimers.push(callback);
        return scheduledTimers.length;
    }
};
vm.runInNewContext(`const UI = { ${setCardFaceMethod} }; result.UI = UI;`, context);

const secretCard = { value: 'K', suit: 'HEARTS' };
context.result.UI.setCardFace(cardElement, secretCard, false);
assert.strictEqual(front.children.length, 0, 'A hidden card must not contain value nodes');
assert.strictEqual(front.attributes['aria-hidden'], 'true');
assert(!JSON.stringify(front).includes('HEARTS'), 'A hidden suit leaked into the DOM model');

context.result.UI.setCardFace(cardElement, secretCard, true);
assert.strictEqual(front.children.length, 3, 'A revealed card should render value, suit, and bottom value');
assert.strictEqual(front.children[1].textContent, 'HEARTS');
assert.strictEqual(front.attributes['aria-hidden'], 'false');

context.result.UI.setCardFace(cardElement, secretCard, false);
assert.strictEqual(front.children.length, 3, 'Card face must remain painted until the flip animation completes');
scheduledTimers.shift()();
assert.strictEqual(front.children.length, 0, 'Hidden card face must be removed from the DOM after the flip');
assert.strictEqual(front.dataset.faceKey, 'hidden');

const durationStart = html.indexOf('    getMessageDuration:');
const durationEnd = html.indexOf('    hideGameOver:', durationStart);
assert(durationStart >= 0 && durationEnd > durationStart, 'getMessageDuration implementation not found');
const durationMethod = html.slice(durationStart, durationEnd);
const durationContext = {
    result: {},
    Utils: { cleanText: value => String(value ?? '').slice(0, 240) }
};
vm.runInNewContext(`const UI = { ${durationMethod} }; result.UI = UI;`, durationContext);
const shortDuration = durationContext.result.UI.getMessageDuration('gg', 'chat');
const longDuration = durationContext.result.UI.getMessageDuration('This is a much longer message that needs enough time to read.', 'chat');
assert(longDuration > shortDuration, 'Long chat messages should remain visible longer');
assert(longDuration <= 10500, 'Chat duration must stay bounded');

const discardPoseStart = html.indexOf('    getDiscardPose:');
const discardPoseEnd = html.indexOf('    getGridOffset:', discardPoseStart);
assert(discardPoseStart >= 0 && discardPoseEnd > discardPoseStart, 'getDiscardPose implementation not found');
const discardPoseMethod = html.slice(discardPoseStart, discardPoseEnd);
const discardContext = { result: {}, Math };
vm.runInNewContext(`const UI = { ${discardPoseMethod} }; result.UI = UI;`, discardContext);
const discardCards = Array.from({ length: 24 }, (_, index) => ({ id: `discard-${index}`, value: index, suit: 'TEST' }));
const poses = discardCards.map(card => discardContext.result.UI.getDiscardPose(card));
assert.deepStrictEqual(
    discardContext.result.UI.getDiscardPose(discardCards[7]),
    poses[7],
    'A discard card must keep the same pose across rerenders'
);
assert(poses.every(pose => Math.abs(pose.rotation) <= 2.4), 'Discard rotation must stay subtle');
assert(poses.every(pose => Math.abs(pose.x) <= 2 && Math.abs(pose.y) <= 2), 'Discard offset must stay inside a two-pixel range');
assert(new Set(poses.map(pose => `${pose.rotation}:${pose.x}:${pose.y}`)).size > 8, 'Discard cards need visibly varied poses');
assert(poses.some(pose => pose.rotation === 0), 'Some discard cards should still land squarely');
assert(html.includes('discardLeft + discardPose.x') && html.includes('deckTop + discardPose.y'), 'Discard offsets must be applied to the rendered pile');
assert(!html.includes('Math.random() * 20 - 10'), 'The old excessive and unstable discard rotation must stay removed');

assert(html.includes('.chat-open #bot-typing-indicator'), 'Chat-open state must hide the activity pill');
assert(html.includes('.chat-open #chat-bubble-container'), 'Chat-open state must hide floating bubbles');
assert(html.includes('bottom: calc(138px + env(safe-area-inset-bottom))'), 'Mobile chat bubbles must sit fully above the chat button');
assert(html.includes("gameView.classList.toggle('chat-open', open)"), 'Chat drawer and game overlay state must be synchronized');
assert(html.includes('#bot-typing-indicator {\n            display: none !important;'), 'The redundant mobile typing pill must not overlap table controls');
assert(html.includes("document.getElementById('btn-return-lobby').onclick = UI.leaveGame"), 'Leave Game must be bound to the red game-over button');
assert(html.includes('window.location.replace(cleanUrl.href)'), 'Leave Game must return to a clean lobby URL');
assert(html.includes("Net.sendAction({ type: 'PEEK_CARD', targetId: cardId })"), 'Opening peeks must be reported to the host');
assert(html.includes("badge.setAttribute(") && html.includes("', current turn'"), 'The active seat must expose its turn state for every player');
assert(html.includes("let icon = p.isBot ? '🤖'"), 'Bot seats must use an unmistakable robot emoji');
assert(html.includes('expandedBadgeId') && html.includes('badge.onclick = toggleBadge'), 'Player names must expand on tap as well as desktop hover');
assert(html.includes('bazunga-alert-v1') && html.includes('bazunga-alert-v2') && html.includes('bazunga-alert-v3'), 'BAZUNGA must have rotating alert variants');
assert(html.includes('bot-peek-target') && html.includes('playBotPeekEffect'), 'Bot Q/10 peeks need a visible synchronized animation');
assert(html.includes('FINAL_SLAP_WINDOW_MS = 4200'), 'The final BAZUNGA action needs a human reaction window');
assert(html.includes("action.type !== 'SLAP'"), 'Slaps must remain legal while final scoring is pending');
assert(html.includes('final-slap-window'), 'The final slap opportunity needs unmistakable table feedback');
assert(html.includes("el.setAttribute('aria-hidden', 'true')"), 'Buried deck/discard cards must leave the accessibility tree');
assert(html.includes("el.removeAttribute('role')"), 'Buried cards must not remain accessibility buttons');
assert(html.includes('Utils.escapeHTML(l.msg)'), 'Chat messages must be escaped before HTML rendering');
assert(html.includes('Engine.state.logs.splice(0, Engine.state.logs.length - 120)'), 'The shared game log must be bounded');
assert(html.includes('id="modal-rules"') && html.includes('Only one successful slap is allowed per discard opportunity'), 'Bazunga needs complete in-game rules including the one-slap limit');
assert(html.includes("document.getElementById(id).onclick = UI.showRules"), 'Rules must open from the lobby, room, and live table');
assert(!html.includes('adjustedSlapTime'), 'Unused client slap timestamp logic should not return');

console.log('UI privacy/mobile: flip timing, bot peek VFX, reaction windows, final slaps, mobile controls, and BAZUNGA alerts passed.');
