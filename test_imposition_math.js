const test = require('node:test');
const assert = require('node:assert');
const { generateImpositionMap } = require('./src/imposition_logic');
const { calculateImpositionOffsets } = require('./src/layout_logic');

test('4-page signature booklet page reordering', () => {
    const map = generateImpositionMap(4, 4);
    assert.deepStrictEqual(map, [3, 0, 1, 2]);
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
