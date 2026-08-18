const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(source => source.trim());

assert(inlineScripts.length, 'Bazunga must contain its inline application script');
inlineScripts.forEach((source, index) => {
    assert.doesNotThrow(
        () => new vm.Script(source, { filename: `index-inline-${index + 1}.js` }),
        `Bazunga inline script ${index + 1} must parse`
    );
});

console.log(`Bazunga syntax: ${inlineScripts.length} inline script${inlineScripts.length === 1 ? '' : 's'} parsed.`);
