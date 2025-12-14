(function (root, factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        const { PDFDocument } = require('pdf-lib');
        module.exports = factory(PDFDocument);
    } else {
        root.LayoutLogic = factory(root.PDFLib.PDFDocument);
    }
}(typeof self !== "undefined" ? self : this, function (PDFDocument) {

    async function create2UpSpreads(pdfBytes) {
      // 1. Load the source PDF
      const sourcePdf = await PDFDocument.load(pdfBytes);
      const sourcePages = sourcePdf.getPages();

      // 2. Create a new PDF document
      const outputPdf = await PDFDocument.create();

      // 3. Iterate through pages in pairs (0 & 1, 2 & 3, etc.)
      for (let i = 0; i < sourcePages.length; i += 2) {
        // Get the dimensions of the first page in the pair to determine output size
        const { width, height } = sourcePages[i].getSize();

        // Create a landscape page (Width = 2x source width, Height = source height)
        // We assume standard portrait input pages.
        const newPage = outputPdf.addPage([width * 2, height]);

        // Embed the first page (Left side)
        const [embeddedPage1] = await outputPdf.embedPdf(sourcePdf, [i]);
        newPage.drawPage(embeddedPage1, {
          x: 0,
          y: 0,
          width: width,
          height: height,
        });

        // Embed the second page (Right side), if it exists
        if (i + 1 < sourcePages.length) {
          const [embeddedPage2] = await outputPdf.embedPdf(sourcePdf, [i + 1]);
          newPage.drawPage(embeddedPage2, {
            x: width, // Move to the right by one page width
            y: 0,
            width: width,
            height: height,
          });
        }
      }

      // 4. Save and return the bytes
      const outputBytes = await outputPdf.save();
      return outputBytes;
    }

    return { create2UpSpreads };
}));
