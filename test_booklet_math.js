const test = require('node:test');
const assert = require('node:assert');
const { generateImpositionMap } = require('./src/imposition_logic');

test('Booklet Imposition Math: 4-page signature', (t) => {
    // 4-page signature (1 sheet)
    // Sheet 1 Front: 4, 1
    // Sheet 1 Back: 2, 3
    const map = generateImpositionMap(4, 4);
    assert.deepStrictEqual(map, [3, 0, 1, 2]);
});

test('Booklet Imposition Math: 8-page signature', (t) => {
    // 8-page signature (2 sheets)
    // Sheet 1 Front: 8, 1 (indices 7, 0)
    // Sheet 1 Back: 2, 7 (indices 1, 6)
    // Sheet 2 Front: 6, 3 (indices 5, 2)
    // Sheet 2 Back: 4, 5 (indices 3, 4)
    const map = generateImpositionMap(8, 8);
    assert.deepStrictEqual(map, [7, 0, 1, 6, 5, 2, 3, 4]);
});

test('Booklet Imposition Math: 16-page signature', (t) => {
    // 16-page signature (4 sheets)
    const map = generateImpositionMap(16, 16);
    // Sheet 1 Front: 16, 1
    // Sheet 1 Back: 2, 15
    // Sheet 2 Front: 14, 3
    // Sheet 2 Back: 4, 13
    // Sheet 3 Front: 12, 5
    // Sheet 3 Back: 6, 11
    // Sheet 4 Front: 10, 7
    // Sheet 4 Back: 8, 9
    assert.deepStrictEqual(map, [
        15, 0, 1, 14,
        13, 2, 3, 12,
        11, 4, 5, 10,
        9, 6, 7, 8
    ]);
});

test('Booklet Imposition Math: Blank page insertion and ordering (not divisible by 4)', (t) => {
    // 10 pages in a 12-page signature (total 3 sheets)
    // 2 blank pages should be added at the end (indices 10, 11)
    const map = generateImpositionMap(10, 12);
    assert.strictEqual(map.length, 12);

    // Sheet 1 Front: 12(blank), 1 -> indices 11, 0
    // Sheet 1 Back: 2, 11(blank) -> indices 1, 10
    // Sheet 2 Front: 10, 3 -> indices 9, 2
    // Sheet 2 Back: 4, 9 -> indices 3, 8
    // Sheet 3 Front: 8, 5 -> indices 7, 4
    // Sheet 3 Back: 6, 7 -> indices 5, 6
    assert.deepStrictEqual(map, [
        11, 0, 1, 10,
        9, 2, 3, 8,
        7, 4, 5, 6
    ]);
});

test('Booklet Imposition Math: Front/back sheet pairing indexes', (t) => {
    // Let's test a 16-page signature to verify pairing
    const map = generateImpositionMap(16, 16);

    // Total 4 sheets
    const sheetsInSig = 16 / 4;
    for (let sheet = 0; sheet < sheetsInSig; sheet++) {
        const sheetStart = sheet * 4;
        const frontLeft = map[sheetStart];
        const frontRight = map[sheetStart + 1];
        const backLeft = map[sheetStart + 2];
        const backRight = map[sheetStart + 3];

        // Ensure sum of indices on each side equals total pages - 1
        // e.g., for 16 pages, 15 + 0 = 15. 1 + 14 = 15.
        assert.strictEqual(frontLeft + frontRight, 15);
        assert.strictEqual(backLeft + backRight, 15);

        // Also the lower index should be even on the front and odd on the back
        assert.strictEqual(Math.min(frontLeft, frontRight) % 2, 0); // e.g. 0, 2, 4
        assert.strictEqual(Math.min(backLeft, backRight) % 2, 1);   // e.g. 1, 3, 5
    }
});
