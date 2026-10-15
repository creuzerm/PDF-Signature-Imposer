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

test('generateImpositionMap handles 0 pages edge case', (t) => {
    const map0 = generateImpositionMap(0, 16);
    assert.strictEqual(map0.length, 0);
});
