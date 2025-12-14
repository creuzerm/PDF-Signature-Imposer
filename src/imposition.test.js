import { describe, it, expect, beforeAll } from 'vitest';
import { generateImpositionMap } from './imposition_logic';

describe('Imposition Logic', () => {
    const SIGNATURE_SIZE = 16;
    const TEST_PAGE_COUNT = 100;
    let impositionMap;
    let totalSignatures;

    beforeAll(() => {
        impositionMap = generateImpositionMap(TEST_PAGE_COUNT, SIGNATURE_SIZE);
        totalSignatures = Math.ceil(TEST_PAGE_COUNT / SIGNATURE_SIZE);
    });

    it('calculates total signatures correctly', () => {
        expect(totalSignatures).toBe(7); // 100 / 16 = 6.25 -> 7
    });

    it('calculates total pages correctly', () => {
        expect(impositionMap.length).toBe(totalSignatures * SIGNATURE_SIZE); // 7 * 16 = 112
    });

    it('processes each signature correctly', () => {
        for (let s = 0; s < totalSignatures; s++) {
            const start = s * SIGNATURE_SIZE;
            const end = (s + 1) * SIGNATURE_SIZE;
            const actualSigMap = impositionMap.slice(start, end);

            // Expected relative pattern for 16-page signature
            // [15, 0, 1, 14, 13, 2, 3, 12, 11, 4, 5, 10, 9, 6, 7, 8]
            const pattern = [
                15, 0, 1, 14, 13, 2, 3, 12, 11, 4, 5, 10, 9, 6, 7, 8,
            ];
            const expectedSigMap = pattern.map((p) => start + p);

            expect(actualSigMap).toEqual(expectedSigMap);
        }
    });

    it('generates correct indices for the last partial signature', () => {
        const lastSigStart = (totalSignatures - 1) * SIGNATURE_SIZE;
        const lastSigMap = impositionMap.slice(lastSigStart, lastSigStart + 16);

        // Pattern validation
        const pattern = [15, 0, 1, 14, 13, 2, 3, 12, 11, 4, 5, 10, 9, 6, 7, 8];
        const expectedSigMap = pattern.map((p) => lastSigStart + p);

        expect(lastSigMap).toEqual(expectedSigMap);

        // Verify padding count (indices >= TEST_PAGE_COUNT)
        const paddingCount = lastSigMap.filter(
            (idx) => idx >= TEST_PAGE_COUNT
        ).length;
        expect(paddingCount).toBe(12); // 112 - 100 = 12
    });
});
