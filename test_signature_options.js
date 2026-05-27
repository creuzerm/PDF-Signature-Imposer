const { calculateSignatureOptions } = require('./src/signature_logic');

function runTests() {
    let allPassed = true;

    function assertEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            console.error(`❌ FAIL: ${message}`);
            console.error(`Expected: ${JSON.stringify(expected)}`);
            console.error(`Actual:   ${JSON.stringify(actual)}`);
            allPassed = false;
        } else {
            console.log(`✅ PASS: ${message}`);
        }
    }

    const availableSizes = [4, 8, 12, 16, 20, 24, 28, 32];

    // Test 1: No flyleaf, exact match for 16
    let result = calculateSignatureOptions(16, false, availableSizes);
    assertEqual(result.bestSignatureSize, 16, "Best signature size for 16 pages (no flyleaf)");
    assertEqual(result.options.find(o => o.sigSize === 16).blanksAdded, 0, "Blanks added for 16-page doc in 16-page sig");

    // Test 2: No flyleaf, 14 pages
    result = calculateSignatureOptions(14, false, availableSizes);
    assertEqual(result.bestSignatureSize, 16, "Best signature size for 14 pages (no flyleaf)");
    assertEqual(result.options.find(o => o.sigSize === 16).blanksAdded, 2, "Blanks added for 14-page doc in 16-page sig");

    // Test 3: With flyleaf, 14 pages (effectively 16)
    result = calculateSignatureOptions(14, true, availableSizes);
    assertEqual(result.bestSignatureSize, 16, "Best signature size for 14 pages (with flyleaf)");
    assertEqual(result.options.find(o => o.sigSize === 16).blanksAdded, 0, "Blanks added for 14-page doc with flyleaf in 16-page sig");

    // Test 4: With flyleaf, 1 page (flyleaf not applied)
    result = calculateSignatureOptions(1, true, availableSizes);
    assertEqual(result.bestSignatureSize, 16, "Best signature size for 1 page (flyleaf disabled internally)");
    assertEqual(result.options.find(o => o.sigSize === 16).blanksAdded, 15, "Blanks added for 1-page doc in 16-page sig");

    if (allPassed) {
        console.log("\n✅ ALL TESTS PASSED.");
    } else {
        console.error("\n❌ TESTS FAILED.");
        process.exit(1);
    }
}

runTests();
