const assert = require('assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const assetDir = path.join(__dirname, '..', 'assets', 'hanafuda-svg');
const files = fs.readdirSync(assetDir).filter(file => file.endsWith('.svg')).sort();
assert.strictEqual(files.length, 48, 'The normalized Hanafuda deck must contain 48 cards');

function paeth(a, b, c) {
    const estimate = a + b - c;
    const distanceA = Math.abs(estimate - a);
    const distanceB = Math.abs(estimate - b);
    const distanceC = Math.abs(estimate - c);
    return distanceA <= distanceB && distanceA <= distanceC ? a : distanceB <= distanceC ? b : c;
}

function decodeRgbaPng(buffer) {
    assert(buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Embedded artwork must be a PNG');
    let offset = 8;
    let width;
    let height;
    const dataChunks = [];
    while (offset < buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        const data = buffer.subarray(offset + 8, offset + 8 + length);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            assert.strictEqual(data[8], 8, 'Normalized PNGs must use 8-bit channels');
            assert.strictEqual(data[9], 6, 'Normalized PNGs must retain RGBA transparency');
        }
        if (type === 'IDAT') dataChunks.push(data);
        offset += length + 12;
    }
    const packed = zlib.inflateSync(Buffer.concat(dataChunks));
    const bytesPerPixel = 4;
    const stride = width * bytesPerPixel;
    const pixels = Buffer.alloc(stride * height);
    let sourceOffset = 0;
    for (let y = 0; y < height; y++) {
        const filter = packed[sourceOffset++];
        for (let x = 0; x < stride; x++) {
            const raw = packed[sourceOffset++];
            const left = x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0;
            const above = y > 0 ? pixels[(y - 1) * stride + x] : 0;
            const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[(y - 1) * stride + x - bytesPerPixel] : 0;
            const value = filter === 0 ? raw
                : filter === 1 ? raw + left
                : filter === 2 ? raw + above
                : filter === 3 ? raw + Math.floor((left + above) / 2)
                : filter === 4 ? raw + paeth(left, above, upperLeft)
                : (() => { throw new Error(`Unsupported PNG filter ${filter}`); })();
            pixels[y * stride + x] = value & 255;
        }
    }
    return { width, height, pixels };
}

function isGuideRed(red, green, blue, alpha) {
    return alpha > 24 && red >= 82 && red - green >= 28 && red - blue >= 18 && red >= green * 1.32;
}

function narrowRuns(values) {
    const runs = [];
    for (const value of values.sort((a, b) => a - b)) {
        if (!runs.length || value !== runs.at(-1).at(-1) + 1) runs.push([value]);
        else runs.at(-1).push(value);
    }
    return runs.filter(run => run.length <= 3);
}

for (const file of files) {
    const svg = fs.readFileSync(path.join(assetDir, file), 'utf8');
    assert(svg.includes('width="106" height="175" viewBox="0 0 106 175"'), `${file} must use the common 106 × 175 canvas`);
    assert(svg.includes('preserveAspectRatio="xMidYMid meet"'), `${file} must center its embedded artwork`);
    const match = svg.match(/href="data:image\/png;base64,([^"]+)"/);
    assert(match, `${file} must contain an embedded PNG`);
    const { width, height, pixels } = decodeRgbaPng(Buffer.from(match[1], 'base64'));
    assert.deepStrictEqual([width, height], [106, 175], `${file} raster and SVG dimensions must match`);

    const pixel = (x, y) => {
        const offset = (y * width + x) * 4;
        return pixels.subarray(offset, offset + 4);
    };
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) {
                assert.strictEqual(pixel(x, y)[3], 0, `${file} must keep a transparent two-pixel safety gutter`);
            }
        }
    }

    const suspiciousColumns = [];
    for (const x of [...Array(20).keys(), ...Array.from({ length: 20 }, (_, index) => width - 20 + index)]) {
        let redPixels = 0;
        for (let y = 0; y < height; y++) if (isGuideRed(...pixel(x, y))) redPixels++;
        if (redPixels >= Math.round(height * 0.65)) suspiciousColumns.push(x);
    }
    assert.strictEqual(narrowRuns(suspiciousColumns).length, 0, `${file} still has a narrow vertical red crop guide`);

    const suspiciousRows = [];
    for (const y of [...Array(20).keys(), ...Array.from({ length: 20 }, (_, index) => height - 20 + index)]) {
        let redPixels = 0;
        for (let x = 0; x < width; x++) if (isGuideRed(...pixel(x, y))) redPixels++;
        if (redPixels >= Math.round(width * 0.62)) suspiciousRows.push(y);
    }
    assert.strictEqual(narrowRuns(suspiciousRows).length, 0, `${file} still has a narrow horizontal red crop guide`);
}

console.log('Hanafuda assets: 48 centered RGBA cards with uniform transparent gutters and no residual crop guides passed.');
