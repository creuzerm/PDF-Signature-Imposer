(function (global, factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = factory();
    } else {
        global.SignatureLogic = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {

    function calculateSignatureOptions(originalPageCount, isFlyleafEnabled, availableSizes) {
        let adjustedPageCount = originalPageCount;

        if (isFlyleafEnabled && originalPageCount >= 2) {
            adjustedPageCount += 2;
        }

        let minBlanks = Infinity;
        let bestSignatureSize = null;
        const options = [];

        for (const sigSize of availableSizes) {
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
