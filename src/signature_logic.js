(function (global, factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = factory();
    } else {
        global.SignatureLogic = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {

    function calculateSignatureOptions(originalPageCount, isFlyleafEnabled, availableSizes = []) {
        const pageCount = parseInt(originalPageCount, 10);
        if (isNaN(pageCount) || pageCount < 0) {
            return { options: [], bestSignatureSize: null };
        }

        let adjustedPageCount = pageCount;

        if (isFlyleafEnabled && pageCount >= 2) {
            adjustedPageCount += 2;
        }

        let minBlanks = Infinity;
        let bestSignatureSize = null;
        const options = [];

        const sizes = Array.isArray(availableSizes) ? availableSizes : [];
        for (const sigSize of sizes) {
            if (isNaN(sigSize)) continue;

            const numSheets = sigSize / 4;
            const numSignatures = Math.ceil(adjustedPageCount / sigSize);
            const totalPages = numSignatures * sigSize;
            const blanksAdded = totalPages - adjustedPageCount;

            options.push({
                sigSize,
                numSheets,
                numSignatures,
                totalPages,
                blanksAdded,
                label: `${sigSize} pages (${numSheets} sheets) — ${numSignatures} sigs, adds ${blanksAdded} blank(s)`
            });

            if (sigSize >= 16 && sigSize <= 32) {
                if (blanksAdded < minBlanks) {
                    minBlanks = blanksAdded;
                    bestSignatureSize = sigSize;
                }
            }
        }

        return {
            options,
            bestSignatureSize
        };
    }

    return { calculateSignatureOptions };
});
