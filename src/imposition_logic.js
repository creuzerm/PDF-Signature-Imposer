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
        if (pageCount === 0) return [];
        const totalSignatures = Math.ceil(pageCount / signatureSize);
        const impositionMap = new Array(totalSignatures * signatureSize);
        let idx = 0;

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

                impositionMap[idx++] = sigStartPage + highLocal; // Left (Front)
                impositionMap[idx++] = sigStartPage + lowLocal;  // Right (Front)
                impositionMap[idx++] = sigStartPage + lowLocal + 1; // Left (Back)
                impositionMap[idx++] = sigStartPage + highLocal - 1; // Right (Back)
            }
        }
        return impositionMap;
    }

    return { generateImpositionMap };
});
