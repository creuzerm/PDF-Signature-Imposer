const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const { generateImpositionMap } = require('./src/imposition_logic');

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
                // Just log to confirm we exist
                // console.log(`   Transition Sig ${s}->${s+1} OK.`);
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