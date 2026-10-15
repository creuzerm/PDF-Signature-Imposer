const test = require('node:test');
const assert = require('node:assert');
const { calculateImpositionOffsets } = require('../src/layout_logic');

test('calculateImpositionOffsets centers horizontally and vertically', (t) => {
    // 8.5 x 11 sheet, 4 x 6 source page
    const sourceWidth = 4;
    const sourceHeight = 6;
    const sheetWidth = 11;
    const sheetHeight = 8.5;

    // Left page
    const leftOffsets = calculateImpositionOffsets(sourceWidth, sourceHeight, sheetWidth, sheetHeight, true);

    // half sheet width is 5.5
    // x = (5.5 - 4) / 2 = 0.75
    // y = (8.5 - 6) / 2 = 1.25
    assert.strictEqual(leftOffsets.x, 0.75);
    assert.strictEqual(leftOffsets.y, 1.25);

    // Right page
    const rightOffsets = calculateImpositionOffsets(sourceWidth, sourceHeight, sheetWidth, sheetHeight, false);

    // half sheet width is 5.5
    // x = 5.5 + (5.5 - 4) / 2 = 5.5 + 0.75 = 6.25
    assert.strictEqual(rightOffsets.x, 6.25);
    assert.strictEqual(rightOffsets.y, 1.25);
});

test('calculateImpositionOffsets applies creep compensation correctly', (t) => {
    // 8.5 x 11 sheet, 4 x 6 source page
    const sourceWidth = 4;
    const sourceHeight = 6;
    const sheetWidth = 11;
    const sheetHeight = 8.5;
    const creepOffset = 0.1; // Move towards spine by 0.1

    // Left page
    const leftOffsets = calculateImpositionOffsets(sourceWidth, sourceHeight, sheetWidth, sheetHeight, true, creepOffset);

    // half sheet width is 5.5
    // x = (5.5 - 4) / 2 = 0.75
    // x with creep = 0.75 + 0.1 = 0.85
    assert.strictEqual(leftOffsets.x, 0.85);

    // Right page
    const rightOffsets = calculateImpositionOffsets(sourceWidth, sourceHeight, sheetWidth, sheetHeight, false, creepOffset);

    // half sheet width is 5.5
    // x = 5.5 + (5.5 - 4) / 2 = 6.25
    // x with creep = 6.25 - 0.1 = 6.15
    assert.strictEqual(rightOffsets.x, 6.15);
});
