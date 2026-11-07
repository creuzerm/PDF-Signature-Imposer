const test = require('node:test');
const assert = require('node:assert');
const { generateImpositionMap } = require('../src/imposition_logic');

test('generateImpositionMap correctly sequences standard booklet sizes', (t) => {
    // 4 pages
    assert.deepStrictEqual(generateImpositionMap(4, 4), [3, 0, 1, 2]);

    // 8 pages
    assert.deepStrictEqual(generateImpositionMap(8, 8), [7, 0, 1, 6, 5, 2, 3, 4]);

    // 12 pages
    assert.deepStrictEqual(generateImpositionMap(12, 12), [
        11, 0, 1, 10,
        9, 2, 3, 8,
        7, 4, 5, 6
    ]);

    // 16 pages
    assert.deepStrictEqual(generateImpositionMap(16, 16), [
        15, 0, 1, 14,
        13, 2, 3, 12,
        11, 4, 5, 10,
        9, 6, 7, 8
    ]);

    // 24 pages
    const map24 = generateImpositionMap(24, 24);
    assert.strictEqual(map24.length, 24);
    assert.strictEqual(map24[0], 23);
    assert.strictEqual(map24[1], 0);

    // 32 pages
    const map32 = generateImpositionMap(32, 32);
    assert.strictEqual(map32.length, 32);
    assert.strictEqual(map32[0], 31);
    assert.strictEqual(map32[1], 0);
});

test('generateImpositionMap calculates blank page padding correctly', (t) => {
    // 14 pages in a 16-page signature
    const map14in16 = generateImpositionMap(14, 16);
    assert.strictEqual(map14in16.length, 16, 'Should yield 16 slots');
    
    const blanks = map14in16.filter(pageIndex => pageIndex >= 14);
    assert.strictEqual(blanks.length, 2, 'Should identify 2 blank placeholder slots');
    
    // Original pages 14 and 15 (which don't exist, hence they are blanks) 
    // are indices 14 and 15. In a 16-page signature, they are:
    // Sheet 1 Front: 15 (Left/Blank), 0 (Right)
    // Sheet 1 Back: 1 (Left), 14 (Right/Blank)
    assert.strictEqual(map14in16[0], 15, 'First slot is page 15 (blank)');
    assert.strictEqual(map14in16[3], 14, 'Fourth slot is page 14 (blank)');
});

test('generateImpositionMap processes multiple signatures sequentially', (t) => {
    // 34 pages in 16-page signatures -> 3 signatures (48 slots)
    const map34 = generateImpositionMap(34, 16);
    assert.strictEqual(map34.length, 48, 'Should yield 48 slots (3 * 16)');

    // Signature 1 (pages 0-15)
    const sig1 = map34.slice(0, 16);
    assert.strictEqual(Math.min(...sig1), 0);
    assert.strictEqual(Math.max(...sig1), 15);

    // Signature 2 (pages 16-31)
    const sig2 = map34.slice(16, 32);
    assert.strictEqual(Math.min(...sig2), 16);
    assert.strictEqual(Math.max(...sig2), 31);

    // Signature 3 (pages 32-47)
    const sig3 = map34.slice(32, 48);
    assert.strictEqual(Math.min(...sig3), 32);
    assert.strictEqual(Math.max(...sig3), 47);

    // Blanks are pages >= 34 in the final signature
    const blanks = map34.filter(pageIndex => pageIndex >= 34);
    assert.strictEqual(blanks.length, 14, 'Should identify 14 blank placeholder slots in the last signature');
});

test('generateImpositionMap correctly sequences odd total page counts for Saddle Stitch (single signature)', (t) => {
    const oddPageCounts = [1, 3, 5, 7, 13, 27];

    for (const pageCount of oddPageCounts) {
        const signatureSize = Math.ceil(pageCount / 4) * 4;
        const map = generateImpositionMap(pageCount, signatureSize);

        const expectedSheets = Math.ceil(pageCount / 4);
        const actualSheets = map.length / 4;

        assert.strictEqual(actualSheets, expectedSheets, `For ${pageCount} pages, expected ${expectedSheets} sheets, got ${actualSheets}`);

        const blanks = map.filter(pageIndex => pageIndex >= pageCount);
        const expectedBlanks = signatureSize - pageCount;
        assert.strictEqual(blanks.length, expectedBlanks, `For ${pageCount} pages, expected ${expectedBlanks} blanks, got ${blanks.length}`);
    }
});

test('generateImpositionMap correctly sequences odd total page counts for multi-signature perfect binding', (t) => {
    // 21 pages in 16-page signatures
    const pageCount = 21;
    const signatureSize = 16;
    const map = generateImpositionMap(pageCount, signatureSize);

    // Total signatures = Math.ceil(21 / 16) = 2
    // Total slots = 2 * 16 = 32
    assert.strictEqual(map.length, 32, 'Should yield 32 slots');

    // Signature 1 (pages 0-15)
    const sig1 = map.slice(0, 16);
    assert.strictEqual(Math.min(...sig1), 0);
    assert.strictEqual(Math.max(...sig1), 15);

    // Signature 2 (pages 16-31)
    const sig2 = map.slice(16, 32);
    assert.strictEqual(Math.min(...sig2), 16);
    assert.strictEqual(Math.max(...sig2), 31);

    // Blanks are pages >= 21 in the final signature
    const blanks = map.filter(pageIndex => pageIndex >= pageCount);
    assert.strictEqual(blanks.length, 11, 'Should identify 11 blank placeholder slots in the last signature');
});

test('generateImpositionMap handles 0 pages edge case', (t) => {
    const map0 = generateImpositionMap(0, 16);
    assert.strictEqual(map0.length, 0);
});

function calculateMiniBookletFoldSheets(pageCount, pagesPerSheet) {
    return Math.ceil(pageCount / pagesPerSheet);
}

// Typical 8-up fold (16 pages per sheet)
function generate8UpSignatureMap(pageCount) {
    const map = [];
    const pagesPerSheet = 16;
    const numSheets = Math.ceil(pageCount / pagesPerSheet);
    const totalSlots = numSheets * pagesPerSheet;

    for (let sheet = 0; sheet < numSheets; sheet++) {
        const offset = sheet * pagesPerSheet;
        // Standard 8-up folding map for 1 physical sheet
        const sheetMap = [
            8, 9, 12, 5,
            1, 16, 13, 4,
            7, 10, 11, 6,
            2, 15, 14, 3
        ];

        for (const p of sheetMap) {
            map.push(p - 1 + offset);
        }
    }
    return map;
}

// Typical 16-up fold (32 pages per sheet)
function generate16UpSignatureMap(pageCount) {
    const map = [];
    const pagesPerSheet = 32;
    const numSheets = Math.ceil(pageCount / pagesPerSheet);
    const totalSlots = numSheets * pagesPerSheet;

    for (let sheet = 0; sheet < numSheets; sheet++) {
        const offset = sheet * pagesPerSheet;
        // Standard 16-up folding map for 1 physical sheet
        const sheetMap = [
             1, 32, 31,  2,  3, 30, 29,  4,
             5, 28, 27,  6,  7, 26, 25,  8,
             9, 24, 23, 10, 11, 22, 21, 12,
            13, 20, 19, 14, 15, 18, 17, 16
        ];

        for (const p of sheetMap) {
            map.push(p - 1 + offset);
        }
    }
    return map;
}

test('8-up mini-booklet imposition page ordering and fold sheet calculations', (t) => {
    const pageCount = 64;
    const map = generate8UpSignatureMap(pageCount);
    const expectedSheets = calculateMiniBookletFoldSheets(pageCount, 16);

    assert.strictEqual(expectedSheets, 4, '64 pages should require 4 physical sheets in an 8-up layout');
    assert.strictEqual(map.length, 64, '8-up map for 64 pages should have 64 slots');
    assert.strictEqual(map[0], 7, 'Slot 0 should be index 7');
    assert.strictEqual(map[15], 2, 'Slot 15 should be index 2');
    assert.strictEqual(map[16], 23, 'Slot 16 (sheet 2, slot 0) should be index 23');
});

test('16-up mini-booklet imposition page ordering and fold sheet calculations', (t) => {
    const pageCount = 64;
    const map = generate16UpSignatureMap(pageCount);
    const expectedSheets = calculateMiniBookletFoldSheets(pageCount, 32);

    assert.strictEqual(expectedSheets, 2, '64 pages should require 2 physical sheets in a 16-up layout');
    assert.strictEqual(map.length, 64, '16-up map for 64 pages should have 64 slots');
    assert.strictEqual(map[0], 0, 'Slot 0 should be index 0');
    assert.strictEqual(map[31], 15, 'Slot 31 should be index 15');
    assert.strictEqual(map[32], 32, 'Slot 32 (sheet 2, slot 0) should be index 32');
});
