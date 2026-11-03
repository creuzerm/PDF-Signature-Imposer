(function (root, factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        const { PDFDocument } = require('pdf-lib');
        module.exports = factory(PDFDocument);
    } else {
        root.LayoutLogic = factory(root.PDFLib.PDFDocument);
    }
}(typeof self !== "undefined" ? self : this, function (PDFDocument) {

    /**
     * Calculates imposition offsets for centering and creep compensation.
     */
    function calculateImpositionOffsets({
        sourceWidth,
        sourceHeight,
        targetWidth,
        targetHeight,
        isLeftPage,
        sheetIndex,
        totalSheets,
        creepAmount = 0
    }) {
        const halfTargetWidth = targetWidth / 2;

        // Base centering offsets
        const xCenter = (halfTargetWidth - sourceWidth) / 2;
        const yCenter = (targetHeight - sourceHeight) / 2;

        // Creep compensation
        let currentCreep = 0;
        if (totalSheets > 1 && creepAmount > 0) {
            currentCreep = (sheetIndex / (totalSheets - 1)) * creepAmount;
        }

        let xOffset = xCenter;
        if (isLeftPage) {
            xOffset += currentCreep;
        } else {
            xOffset = halfTargetWidth + xCenter - currentCreep;
        }

        return { x: xOffset, y: yCenter };
    }

    async function create2UpSpreads(pdfBytes, options = {}) {
      const { signatureSize = 4, creepAmount = 0 } = options;

      // 1. Load the source PDF
      const sourcePdf = await PDFDocument.load(pdfBytes);
      const sourcePages = sourcePdf.getPages();

      // 2. Create a new PDF document
      const outputPdf = await PDFDocument.create();

      // 3. Embed all pages at once
      const embeddedPages = await outputPdf.embedPdf(sourcePdf, sourcePdf.getPageIndices());

      const totalSheetsPerSig = signatureSize / 4;

      // 4. Iterate through pages in pairs (0 & 1, 2 & 3, etc.)
      for (let i = 0; i < sourcePages.length; i += 2) {
        // Get the dimensions of the first page in the pair to determine output size
        const { width: sourceWidth, height: sourceHeight } = sourcePages[i].getSize();

        // Create a landscape page (Width = 2x source width, Height = source height)
        const targetWidth = sourceWidth * 2;
        const targetHeight = sourceHeight;
        const newPage = outputPdf.addPage([targetWidth, targetHeight]);

        // Determine sheet index for creep
        const currentSpreadIndex = i / 2;
        // The imposition mapping places the outermost sheet first for each signature,
        // then works inwards. Every physical sheet has two spreads (front and back).
        const sheetIndex = Math.floor(currentSpreadIndex / 2) % totalSheetsPerSig;

        // Draw the first embedded page (Left side)
        const leftOffsets = calculateImpositionOffsets({
            sourceWidth,
            sourceHeight,
            targetWidth,
            targetHeight,
            isLeftPage: true,
            sheetIndex,
            totalSheets: totalSheetsPerSig,
            creepAmount
        });

        newPage.drawPage(embeddedPages[i], {
          x: leftOffsets.x,
          y: leftOffsets.y,
          width: sourceWidth,
          height: sourceHeight,
        });

        // Draw the second embedded page (Right side), if it exists
        if (i + 1 < sourcePages.length) {
          const rightOffsets = calculateImpositionOffsets({
            sourceWidth,
            sourceHeight,
            targetWidth,
            targetHeight,
            isLeftPage: false,
            sheetIndex,
            totalSheets: totalSheetsPerSig,
            creepAmount
          });

          newPage.drawPage(embeddedPages[i + 1], {
            x: rightOffsets.x,
            y: rightOffsets.y,
            width: sourceWidth,
            height: sourceHeight,
          });
        }
      }

      // 5. Save and return the bytes
      const outputBytes = await outputPdf.save();
      return outputBytes;
    }

    /**
     * Calculates 4-Up imposition duplex layout calculation and rotation angles
     * @param {number} slotIndex - The index of the slot on the 4-Up sheet (0, 1, 2, 3)
     * @param {string} foldOrientation - 'head-to-head' or 'head-to-toe'
     * @returns {number} The rotation angle in degrees
     */
    function calculate4UpLayout(slotIndex, foldOrientation) {
        if (foldOrientation === 'head-to-head') {
            // In head-to-head, top slots (assumed 0 and 1) are rotated 180 degrees
            if (slotIndex === 0 || slotIndex === 1) {
                return 180;
            }
        }
        // For head-to-toe, or bottom slots in head-to-head
        return 0;
    }

    /**
     * Generates coordinates for fold tick marks along the gutters for 4-up layout.
     * @param {number} sheetWidth - The width of the physical sheet
     * @param {number} sheetHeight - The height of the physical sheet
     * @returns {object} Coordinates for horizontal and vertical tick marks
     */
    function generateFoldTickMarks(sheetWidth, sheetHeight) {
        const xCenter = sheetWidth / 2;
        const yCenter = sheetHeight / 2;

        return {
            horizontal: { x: xCenter, y: yCenter },
            vertical: { x: xCenter, y: yCenter }
        };
    }

    return {
        create2UpSpreads,
        calculateImpositionOffsets,
        calculate4UpLayout,
        generateFoldTickMarks
    };
}));
