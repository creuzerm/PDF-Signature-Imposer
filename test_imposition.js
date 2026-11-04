const { test } = require('node:test');
const assert = require('node:assert');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const { generateImpositionMap } = require('./src/imposition_logic');
const { calculate4UpLayout, generateFoldTickMarks } = require('./src/layout_logic');

/**
 * CONFIGURATION
 */
const SIGNATURE_SIZE = 16; // 4 sheets per signature
const TEST_PAGE_COUNT = 100; // Forces 6 full sigs + 1 partial sig

/**
 * 1. SETUP: Create a 100-page Source PDF
 */
async function createSourcePDF(pageCount) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);

    for (let i = 1; i <= pageCount; i++) {
        const page = doc.addPage([200, 200]);
        const { width, height } = page.getSize();

        // Draw huge number for visual debugging
        page.drawText(`${i}`, {
            x: width / 2 - 25,
            y: height / 2 - 15,
            size: 50,
            font: font,
            color: rgb(0, 0, 0),
        });

        // Draw label for automated inspection if needed
        page.drawText(`Source Page ${i}`, {
            x: 10, y: 10, size: 10, font: font, color: rgb(0.5, 0.5, 0.5),
        });
    }
    return doc.save();
}

/**
 * 2. IMPOSITION LOGIC (Using Shared Module)
 */
async function imposePDF(pdfBytes, signatureSize) {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const newDoc = await PDFDocument.create();

    const srcPageCount = srcDoc.getPageCount();

    // Use shared logic
    const impositionMap = generateImpositionMap(srcPageCount, signatureSize);

    // Derived stats for logging
    const totalSignatures = Math.ceil(srcPageCount / signatureSize);

    console.log(`[Logic] Input Pages: ${srcPageCount}`);
    console.log(`[Logic] Total Signatures: ${totalSignatures}`);
    console.log(`[Logic] Final Page Count (padded): ${impositionMap.length}`);

    const copiedPages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices());

    // --- BUILD PDF ---
    for (const sourceIndex of impositionMap) {
        if (sourceIndex < copiedPages.length) {
            newDoc.addPage(copiedPages[sourceIndex]);
        } else {
            // Add Blank Page for padding
            const page = newDoc.addPage([200, 200]);
            page.drawText('BLANK (Padding)', { x: 50, y: 100, size: 15, color: rgb(0.8, 0.8, 0.8) });
        }
    }

    const imposedBytes = await newDoc.save();
    return { bytes: imposedBytes, map: impositionMap, totalSignatures };
}

/**
 * 3. VERIFICATION
 */
async function runTest() {
    console.log(`[Test] Generating ${TEST_PAGE_COUNT}-page Source PDF...`);
    const sourceBytes = await createSourcePDF(TEST_PAGE_COUNT);

    console.log(`[Test] Running Imposition...`);
    const result = await imposePDF(sourceBytes, SIGNATURE_SIZE);

    let allPassed = true;

    // Edge Case Check for Zero Pages
    console.log(`\n[Inspection] Checking Zero Pages Edge Case...`);
    const zeroPagesMap = generateImpositionMap(0, SIGNATURE_SIZE);
    if (zeroPagesMap.length !== 0) {
        console.error(`❌ FAIL: generateImpositionMap for 0 pages returned length ${zeroPagesMap.length} (Expected: 0).`);
        allPassed = false;
    } else {
        console.log(`✅ Zero pages test passed.`);
    }

    // Check Single Signature (Saddle-Stitched) Booklet Edge Case
    // e.g., 10 pages into a 12-page signature
    console.log(`\n[Inspection] Checking Single-Signature Saddle-Stitched Math (10 pages in 12-page sig)...`);
    const saddleMap = generateImpositionMap(10, 12);
    const expectedSaddleMap = [11, 0, 1, 10, 9, 2, 3, 8, 7, 4, 5, 6];
    if (JSON.stringify(saddleMap) !== JSON.stringify(expectedSaddleMap)) {
        console.error(`❌ FAIL: Single-Signature Padding Math. Expected ${expectedSaddleMap}, Actual ${saddleMap}`);
        allPassed = false;
    } else {
        console.log(`✅ Single-Signature Padding Math passed.`);
    }

    // Verify large booklets integrity
    console.log(`\n[Inspection] Checking Large Booklets Integrity (64-page and 128-page signatures)...`);
    const largeDocPages = 1000;

    // 64-page signature test
    const map64 = generateImpositionMap(largeDocPages, 64);
    if (map64.length !== Math.ceil(largeDocPages / 64) * 64) {
        console.error(`❌ FAIL: 64-page signature map length incorrect.`);
        allPassed = false;
    } else if (map64[0] !== 63 || map64[63] !== 32) {
        console.error(`❌ FAIL: 64-page signature map integrity check failed.`);
        allPassed = false;
    } else {
        console.log(`✅ 64-page signature mapping passed.`);
    }

    // 128-page signature test
    const map128 = generateImpositionMap(largeDocPages, 128);
    if (map128.length !== Math.ceil(largeDocPages / 128) * 128) {
        console.error(`❌ FAIL: 128-page signature map length incorrect.`);
        allPassed = false;
    } else if (map128[0] !== 127 || map128[127] !== 64) {
        console.error(`❌ FAIL: 128-page signature map integrity check failed.`);
        allPassed = false;
    } else {
        console.log(`✅ 128-page signature mapping passed.`);
    }

    // Verify Every Signature
    for (let s = 0; s < result.totalSignatures; s++) {
        const start = s * SIGNATURE_SIZE;
        const end = (s + 1) * SIGNATURE_SIZE;
        const actualSigMap = result.map.slice(start, end);

        // Expected relative pattern for 16-page signature
        // [15, 0, 1, 14, 13, 2, 3, 12, 11, 4, 5, 10, 9, 6, 7, 8]
        const pattern = [15, 0, 1, 14, 13, 2, 3, 12, 11, 4, 5, 10, 9, 6, 7, 8];

        // Calculate Expected Absolute Indices
        const expectedSigMap = pattern.map(p => start + p);

        // Check for mismatch
        const isMatch = JSON.stringify(actualSigMap) === JSON.stringify(expectedSigMap);

        if (!isMatch) {
            console.error(`\n❌ FAIL: Signature ${s + 1} (Indices ${start}-${end-1})`);
            console.error(`Expected: ${expectedSigMap}`);
            console.error(`Actual:   ${actualSigMap}`);
            allPassed = false;
        } else {
            // Detailed check for the Transition (last page of prev vs first of current)
            if (s > 0) {
                const prevSigLastPage = result.map[start - 1]; // Should be middle of prev sig
                const currSigFirstPage = result.map[start];     // Should be end of curr sig
            }
        }
    }

    // Special Check for the Padded Signature (Signature 7)
    // Sig 7 starts at index 96.
    // Length 16. Pattern ends at 96+16 = 112.
    // Source PDF only has 0..99. Indices 100..111 should be treated as BLANK.
    console.log(`\n[Inspection] Checking Partial Signature 7 Padding...`);
    const lastSigStart = (result.totalSignatures - 1) * SIGNATURE_SIZE;
    const lastSigMap = result.map.slice(lastSigStart, lastSigStart + 16);

    const blanks = lastSigMap.filter(idx => idx >= TEST_PAGE_COUNT);
    console.log(`Sig 7 contains ${blanks.length} padding pages (Expected: 12).`);

    if (blanks.length !== 12) {
        console.error("❌ FAIL: Incorrect padding calculation for last signature.");
        allPassed = false;
    }

    if (allPassed) {
        console.log("\n✅ ALL TESTS PASSED.");
        console.log("   - Signatures did not interleave.");
        console.log("   - Transitions between signatures are distinct.");
        console.log("   - Partial signature padded correctly.");
        fs.writeFileSync('test_output_100pages.pdf', result.bytes);
        console.log("✅ Output saved to 'test_output_100pages.pdf'");
    } else {
        console.error("\n❌ TESTS FAILED.");
        process.exit(1);
    }
}

runTest().catch(err => console.error(err));

test('4-Up Layout Rotation Angles - head-to-head', () => {
    assert.strictEqual(calculate4UpLayout(0, 'head-to-head'), 180, 'Slot 0 (top left) should rotate 180');
    assert.strictEqual(calculate4UpLayout(1, 'head-to-head'), 180, 'Slot 1 (top right) should rotate 180');
    assert.strictEqual(calculate4UpLayout(2, 'head-to-head'), 0, 'Slot 2 (bottom left) should rotate 0');
    assert.strictEqual(calculate4UpLayout(3, 'head-to-head'), 0, 'Slot 3 (bottom right) should rotate 0');
});

test('4-Up Layout Rotation Angles - head-to-toe', () => {
    assert.strictEqual(calculate4UpLayout(0, 'head-to-toe'), 0, 'Slot 0 should rotate 0');
    assert.strictEqual(calculate4UpLayout(1, 'head-to-toe'), 0, 'Slot 1 should rotate 0');
    assert.strictEqual(calculate4UpLayout(2, 'head-to-toe'), 0, 'Slot 2 should rotate 0');
    assert.strictEqual(calculate4UpLayout(3, 'head-to-toe'), 0, 'Slot 3 should rotate 0');
});

test('4-Up Layout Rotation Angles - Duplex Back Side (head-to-head)', () => {
    assert.strictEqual(calculate4UpLayout(0, 'head-to-head', true), 180, 'Back Side Slot 0 should rotate 180');
    assert.strictEqual(calculate4UpLayout(1, 'head-to-head', true), 180, 'Back Side Slot 1 should rotate 180');
    assert.strictEqual(calculate4UpLayout(2, 'head-to-head', true), 0, 'Back Side Slot 2 should rotate 0');
    assert.strictEqual(calculate4UpLayout(3, 'head-to-head', true), 0, 'Back Side Slot 3 should rotate 0');

    // Testing automatic fallback via slots 4-7
    assert.strictEqual(calculate4UpLayout(4, 'head-to-head'), 180, 'Back Side Slot 4 should rotate 180');
    assert.strictEqual(calculate4UpLayout(7, 'head-to-head'), 0, 'Back Side Slot 7 should rotate 0');
});

test('4-Up Layout Rotation Angles - Duplex Back Side (head-to-toe)', () => {
    assert.strictEqual(calculate4UpLayout(0, 'head-to-toe', true), 0, 'Back Side Slot 0 should rotate 0');
    assert.strictEqual(calculate4UpLayout(1, 'head-to-toe', true), 0, 'Back Side Slot 1 should rotate 0');
    assert.strictEqual(calculate4UpLayout(2, 'head-to-toe', true), 0, 'Back Side Slot 2 should rotate 0');
    assert.strictEqual(calculate4UpLayout(3, 'head-to-toe', true), 0, 'Back Side Slot 3 should rotate 0');

    // Testing automatic fallback via slots 4-7
    assert.strictEqual(calculate4UpLayout(5, 'head-to-toe'), 0, 'Back Side Slot 5 should rotate 0');
    assert.strictEqual(calculate4UpLayout(6, 'head-to-toe'), 0, 'Back Side Slot 6 should rotate 0');
});

test('Fold Tick Mark Coordinates', () => {
    // Standard sheet 400x300
    const tickMarks1 = generateFoldTickMarks(400, 300);
    assert.deepStrictEqual(tickMarks1, {
        horizontal: { x: 200, y: 150 },
        vertical: { x: 200, y: 150 }
    });

    // Square sheet 500x500
    const tickMarks2 = generateFoldTickMarks(500, 500);
    assert.deepStrictEqual(tickMarks2, {
        horizontal: { x: 250, y: 250 },
        vertical: { x: 250, y: 250 }
    });

    // Non-even dimensions
    const tickMarks3 = generateFoldTickMarks(251, 199);
    assert.deepStrictEqual(tickMarks3, {
        horizontal: { x: 125.5, y: 99.5 },
        vertical: { x: 125.5, y: 99.5 }
    });

    // Signature gutter explicitly
    const tickMarks4 = generateFoldTickMarks(420, 297); // A3 dimensions
    assert.deepStrictEqual(tickMarks4, {
        horizontal: { x: 210, y: 148.5 },
        vertical: { x: 210, y: 148.5 }
    });
});

test('Additional Verification: 4-Up imposition duplex layout calculation and rotation angles (head-to-head vs head-to-toe fold orientations)', () => {
    // Explicitly verify head-to-head vs head-to-toe fold orientations
    assert.strictEqual(calculate4UpLayout(0, 'head-to-head'), 180, 'head-to-head top-left slot should rotate 180');
    assert.strictEqual(calculate4UpLayout(1, 'head-to-head'), 180, 'head-to-head top-right slot should rotate 180');
    assert.strictEqual(calculate4UpLayout(2, 'head-to-head'), 0, 'head-to-head bottom-left slot should not rotate');
    assert.strictEqual(calculate4UpLayout(3, 'head-to-head'), 0, 'head-to-head bottom-right slot should not rotate');

    assert.strictEqual(calculate4UpLayout(0, 'head-to-toe'), 0, 'head-to-toe top-left slot should not rotate');
    assert.strictEqual(calculate4UpLayout(1, 'head-to-toe'), 0, 'head-to-toe top-right slot should not rotate');
    assert.strictEqual(calculate4UpLayout(2, 'head-to-toe'), 0, 'head-to-toe bottom-left slot should not rotate');
    assert.strictEqual(calculate4UpLayout(3, 'head-to-toe'), 0, 'head-to-toe bottom-right slot should not rotate');
});

test('Additional Verification: fold tick mark coordinate generation on the signature gutter', () => {
    const gutterMarks = generateFoldTickMarks(840, 594);
    assert.deepStrictEqual(gutterMarks, {
        horizontal: { x: 420, y: 297 },
        vertical: { x: 420, y: 297 }
    });
});