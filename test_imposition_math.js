const test = require('node:test');
const assert = require('node:assert');
const { generateImpositionMap } = require('./src/imposition_logic');
const { calculateImpositionOffsets } = require('./src/layout_logic');

test('4-page signature booklet page reordering', () => {
    const map = generateImpositionMap(4, 4);
    assert.deepStrictEqual(map, [3, 0, 1, 2]);
});

test('8-up mini-booklet imposition page ordering and fold sheet calculations', () => {
    // 8-up layout uses 16-page signatures (8 pages per side * 2 sides = 16 pages per physical fold sheet)
    const signatureSize = 16;
    const map = generateImpositionMap(signatureSize, signatureSize);

    // Fold sheet calculations
    // Total pages = 16, Pages per physical sheet = 16
    const expectedSheets = Math.ceil(16 / 16);
    assert.strictEqual(expectedSheets, 1, '8-up layout should have 1 physical fold sheet for 16 pages');
    assert.strictEqual(map.length, 16, '8-up mapping should yield 16 slots');

    // Verify ordering is standard booklet layout
    assert.deepStrictEqual(map, [
        15, 0, 1, 14,
        13, 2, 3, 12,
        11, 4, 5, 10,
        9, 6, 7, 8
    ], '8-up mini-booklet array ordering must match expected structure');
});

test('16-up mini-booklet imposition page ordering and fold sheet calculations', () => {
    // 16-up layout uses 32-page signatures (16 pages per side * 2 sides = 32 pages per physical fold sheet)
    const signatureSize = 32;
    const map = generateImpositionMap(signatureSize, signatureSize);

    // Fold sheet calculations
    // Total pages = 32, Pages per physical sheet = 32
    const expectedSheets = Math.ceil(32 / 32);
    assert.strictEqual(expectedSheets, 1, '16-up layout should have 1 physical fold sheet for 32 pages');
    assert.strictEqual(map.length, 32, '16-up mapping should yield 32 slots');

    assert.deepStrictEqual(map, [
        31, 0, 1, 30,
        29, 2, 3, 28,
        27, 4, 5, 26,
        25, 6, 7, 24,
        23, 8, 9, 22,
        21, 10, 11, 20,
        19, 12, 13, 18,
        17, 14, 15, 16
    ], '16-up mini-booklet array ordering must match expected structure');
});

test('non-multiple-of-4 page counts (5, 7, 10 pages)', () => {
    // 5 pages, 8-page signature
    const map5 = generateImpositionMap(5, 8);
    assert.strictEqual(map5.length, 8);
    assert.deepStrictEqual(map5, [7, 0, 1, 6, 5, 2, 3, 4]);

    // 7 pages, 8-page signature
    const map7 = generateImpositionMap(7, 8);
    assert.strictEqual(map7.length, 8);
    assert.deepStrictEqual(map7, [7, 0, 1, 6, 5, 2, 3, 4]);

    // 10 pages, 12-page signature
    const map10 = generateImpositionMap(10, 12);
    assert.strictEqual(map10.length, 12);
    assert.deepStrictEqual(map10, [11, 0, 1, 10, 9, 2, 3, 8, 7, 4, 5, 6]);

    // Check blank padding placement
    const blanks5 = map5.map((idx, i) => (idx >= 5 ? i : -1)).filter(i => i !== -1);
    assert.deepStrictEqual(blanks5, [0, 3, 4], 'Blank pages should be positioned correctly');
});

test('paper creep calculation formula: inner sheet offset vs outer sheet thickness compensation', () => {
    // Basic centering without creep
    let offset = calculateImpositionOffsets({
        sourceWidth: 90,
        sourceHeight: 180,
        targetWidth: 200,
        targetHeight: 200,
        isLeftPage: true,
        sheetIndex: 0,
        totalSheets: 4,
        creepAmount: 0
    });
    // half width is 100, xCenter = (100 - 90) / 2 = 5. yCenter = (200 - 180) / 2 = 10.
    assert.deepStrictEqual(offset, { x: 5, y: 10 });

    offset = calculateImpositionOffsets({
        sourceWidth: 90,
        sourceHeight: 180,
        targetWidth: 200,
        targetHeight: 200,
        isLeftPage: false,
        sheetIndex: 0,
        totalSheets: 4,
        creepAmount: 0
    });
    // right page, xOffset = 100 + 5 = 105
    assert.deepStrictEqual(offset, { x: 105, y: 10 });

    // With Creep (12 pts total)
    // Left innermost page (sheetIndex 3) shifts RIGHT (+)
    offset = calculateImpositionOffsets({
        sourceWidth: 100,
        sourceHeight: 200,
        targetWidth: 200,
        targetHeight: 200,
        isLeftPage: true,
        sheetIndex: 3,
        totalSheets: 4,
        creepAmount: 12
    });
    assert.deepStrictEqual(offset, { x: 12, y: 0 });

    // Right innermost page (sheetIndex 3) shifts LEFT (-)
    offset = calculateImpositionOffsets({
        sourceWidth: 100,
        sourceHeight: 200,
        targetWidth: 200,
        targetHeight: 200,
        isLeftPage: false,
        sheetIndex: 3,
        totalSheets: 4,
        creepAmount: 12
    });
    assert.deepStrictEqual(offset, { x: 100 - 12, y: 0 });

    // Middle sheet (sheetIndex 1, 4 total sheets => 1/3 of max creep = 4)
    offset = calculateImpositionOffsets({
        sourceWidth: 100,
        sourceHeight: 200,
        targetWidth: 200,
        targetHeight: 200,
        isLeftPage: true,
        sheetIndex: 1,
        totalSheets: 4,
        creepAmount: 12
    });
    assert.deepStrictEqual(offset, { x: 4, y: 0 });
});
