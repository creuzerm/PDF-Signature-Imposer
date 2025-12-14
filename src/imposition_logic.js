(function (global, factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = factory();
    } else {
        global.ImpositionLogic = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {

    /**
     * Generates the imposition mapping for a given page count and signature size.
     * Returns an array of page indices in the order they should appear in the booklet PDF.
     *
     * @param {number} pageCount - The total number of pages in the source document (or processed set).
     * @param {number} signatureSize - Pages per signature (must be multiple of 4).
     * @returns {number[]} Array of zero-based page indices.
     */
    function generateImpositionMap(pageCount, signatureSize) {
        const totalSignatures = Math.ceil(pageCount / signatureSize);
        const impositionMap = [];

        for (let sigIndex = 0; sigIndex < totalSignatures; sigIndex++) {
            const sigStartPage = sigIndex * signatureSize;
            const sheetsInSig = signatureSize / 4;

            // Process each sheet in the signature
            for (let sheet = 0; sheet < sheetsInSig; sheet++) {
                // Standard Booklet Imposition Mapping
                // Front: High, Low
                // Back:  Low+1, High-1

                const lowLocal = sheet * 2;
                const highLocal = signatureSize - 1 - (sheet * 2);

                const p1 = sigStartPage + highLocal; // Left (Front)
                const p2 = sigStartPage + lowLocal;  // Right (Front)
                const p3 = sigStartPage + lowLocal + 1; // Left (Back)
                const p4 = sigStartPage + highLocal - 1; // Right (Back)

                impositionMap.push(p1, p2, p3, p4);
            }
        }
        return impositionMap;
    }

    /**
     * Calculates valid batch configurations based on signature size and total signatures.
     * Returns options for splitting the output.
     *
     * @param {number} signatureSize - Pages per signature.
     * @param {number} totalSignatures - Total number of signatures calculated.
     * @returns {Array} List of batch options { sigsPerBatch: number, description: string }
     */
    function getBatchConfigs(signatureSize, totalSignatures) {
        const configs = [];

        // Strategy 1: ~100 pages per file
        const TARGET_PAGES = 100;
        let sigsFor100 = Math.round(TARGET_PAGES / signatureSize);
        if (sigsFor100 < 1) sigsFor100 = 1;

        // Strategy 2: 1 Signature per file
        const sigsForOne = 1;

        // Use a map to avoid duplicates and handle descriptions
        const potentialConfigs = new Map();

        // Always consider 1 signature if we have multiple signatures
        if (totalSignatures > 1) {
            potentialConfigs.set(1, `1 Signature (${signatureSize} pages) per file`);
        }

        // Consider ~100 pages if it makes sense
        // It makes sense if it's not 1 (already covered) and less than total (otherwise it's single file)
        if (sigsFor100 !== 1 && sigsFor100 < totalSignatures) {
             const pages = sigsFor100 * signatureSize;
             potentialConfigs.set(sigsFor100, `~${pages} pages (${sigsFor100} signatures) per file`);
        }

        // Convert to array and sort
        const sortedKeys = Array.from(potentialConfigs.keys()).sort((a, b) => a - b);
        for (const k of sortedKeys) {
            configs.push({
                sigsPerBatch: k,
                description: potentialConfigs.get(k)
            });
        }

        return configs;
    }

    /**
     * Chunks the flat imposition map into multiple arrays of indices.
     * @param {number[]} impositionMap - The full flat array of indices.
     * @param {number} signatureSize - Pages per signature.
     * @param {number} sigsPerBatch - Number of signatures per batch.
     * @returns {number[][]} Array of index arrays.
     */
    function chunkImpositionMap(impositionMap, signatureSize, sigsPerBatch) {
        // If 0 or invalid, return as one chunk
        if (!sigsPerBatch || sigsPerBatch <= 0) return [impositionMap];

        const chunkSize = sigsPerBatch * signatureSize;
        const chunks = [];
        for (let i = 0; i < impositionMap.length; i += chunkSize) {
            chunks.push(impositionMap.slice(i, i + chunkSize));
        }
        return chunks;
    }

    return { generateImpositionMap, getBatchConfigs, chunkImpositionMap };
});
