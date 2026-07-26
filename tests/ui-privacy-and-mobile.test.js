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
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    replaceChildren(...children) { this.children = children; }
    append(...children) { this.children.push(...children); }
}

const front = new FakeElement();
const cardElement = { querySelector: selector => selector === '.card-front' ? front : null };
const context = {
    result: {},
    document: { createElement: () => new FakeElement() }
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

assert(html.includes('.chat-open #bot-typing-indicator'), 'Chat-open state must hide the activity pill');
assert(html.includes('.chat-open #chat-bubble-container'), 'Chat-open state must hide floating bubbles');
assert(html.includes("gameView.classList.toggle('chat-open', open)"), 'Chat drawer and game overlay state must be synchronized');
assert(html.includes("el.setAttribute('aria-hidden', 'true')"), 'Buried deck/discard cards must leave the accessibility tree');
assert(html.includes("el.removeAttribute('role')"), 'Buried cards must not remain accessibility buttons');
assert(html.includes('Utils.escapeHTML(l.msg)'), 'Chat messages must be escaped before HTML rendering');
assert(html.includes('Engine.state.logs.splice(0, Engine.state.logs.length - 120)'), 'The shared game log must be bounded');
assert(!html.includes('adjustedSlapTime'), 'Unused client slap timestamp logic should not return');

console.log('UI privacy/mobile: hidden-card DOM, chat layering, escaping, and bounded logs passed.');
