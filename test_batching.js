const { getBatchConfigs, chunkImpositionMap } = require('./src/imposition_logic');

console.log("Running Batching Logic Tests...");

let passed = true;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        passed = false;
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    const actStr = JSON.stringify(actual);
    const expStr = JSON.stringify(expected);
    if (actStr !== expStr) {
        console.error(`❌ FAIL: ${message}`);
        console.error(`   Expected: ${expStr}`);
        console.error(`   Actual:   ${actStr}`);
        passed = false;
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

// Test getBatchConfigs
// Case 1: Small file (e.g. 1 signature)
// Should return empty array (only Single File valid, which is implicit)
{
    console.log("\nTest Case: Small file (1 signature)");
    const configs = getBatchConfigs(16, 1);
    assertEqual(configs, [], "Should return no options for single signature file");
}

// Case 2: Medium file (e.g. 500 pages, sig size 16)
// Total sigs = ceil(500/16) = 32
// Expected:
// 1. 1 Sig (16 pages)
// 2. ~100 pages -> 100/16 = 6.25 -> 6 sigs (96 pages)
{
    console.log("\nTest Case: Medium file (32 signatures, 16pp)");
    const configs = getBatchConfigs(16, 32);
    // Expect: [{sigsPerBatch: 1, ...}, {sigsPerBatch: 6, ...}]

    assert(configs.length === 2, "Should return 2 options");
    if (configs.length >= 1) assert(configs[0].sigsPerBatch === 1, "First option should be 1 sig");
    if (configs.length >= 2) assert(configs[1].sigsPerBatch === 6, "Second option should be 6 sigs (~96 pages)");
}

// Case 3: Exact match for 100 pages
// Sig size 20. 100 / 20 = 5 sigs.
// Total sigs = 10.
{
    console.log("\nTest Case: Exact match (10 signatures, 20pp)");
    const configs = getBatchConfigs(20, 10);
    // 1. 1 Sig (20 pages)
    // 2. 5 Sigs (100 pages)

    assert(configs.length === 2, "Should return 2 options");
    if (configs.length >= 2) assert(configs[1].sigsPerBatch === 5, "Second option should be 5 sigs");
}

// Case 4: Large Signature (e.g. 64 pages)
// 100 / 64 = 1.56 -> Rounds to 2.
// Wait, 1.56 rounds to 2. 2 * 64 = 128 pages.
// Or maybe rounds to 1? Math.round(1.56) = 2.
// If sig size is 120. 100 / 120 = 0.83 -> rounds to 1.
// If sig size > 100, calculating ~100 might yield 1 sig.
// In that case, we shouldn't duplicate "1 Sig".
{
    console.log("\nTest Case: Large Signature (120 pages)");
    // Total sigs 5.
    const configs = getBatchConfigs(120, 5);
    // 100 / 120 = 0.8 -> 1.
    // So ~100 pages option is 1 sig.
    // "1 Sig" option is 1 sig.
    // Should return only 1 option (1 Sig) - Actually wait, if 1 sig is effectively same as ~100 pages, we deduplicate?
    // My logic uses a Map. So yes.
    // However, if result is just 1 sig, and total > 1, we return [{sigsPerBatch: 1...}].

    assert(configs.length === 1, "Should deduplicate 1 sig and ~100 pages if same");
    if (configs.length >= 1) assert(configs[0].sigsPerBatch === 1, "Option should be 1 sig");
}

// Test chunkImpositionMap
{
    console.log("\nTest Case: Chunking");
    // Mock Map: [0, 1, 2, 3, ... 31] (32 pages, 2 sigs of 16)
    const map = Array.from({length: 32}, (_, i) => i);
    const signatureSize = 16;

    // Chunk by 1 sig
    const chunks1 = chunkImpositionMap(map, signatureSize, 1);
    assert(chunks1.length === 2, "Should have 2 chunks");
    assertEqual(chunks1[0], map.slice(0, 16), "Chunk 1 correct");
    assertEqual(chunks1[1], map.slice(16, 32), "Chunk 2 correct");

    // Chunk by 2 sigs (should be 1 chunk)
    const chunks2 = chunkImpositionMap(map, signatureSize, 2);
    assert(chunks2.length === 1, "Should have 1 chunk");
    assertEqual(chunks2[0], map, "Chunk correct");

    // Chunk by 0 (should be 1 chunk)
    const chunks0 = chunkImpositionMap(map, signatureSize, 0);
    assert(chunks0.length === 1, "Should have 1 chunk");
}

if (!passed) {
    console.error("\n❌ SOME TESTS FAILED");
    process.exit(1);
} else {
    console.log("\n✅ ALL BATCHING TESTS PASSED");
}
