const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const { create2UpSpreads } = require('./src/layout_logic');

async function runTest() {
    console.log("[Test] Creating 4-page source PDF...");
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < 4; i++) {
        const page = doc.addPage([200, 300]);
        page.drawText('Page ' + i, { x: 50, y: 50, size: 20, font, color: rgb(0,0,0) });
    }
    const sourceBytes = await doc.save();

    console.log("[Test] Running create2UpSpreads...");
    const outputBytes = await create2UpSpreads(sourceBytes);

    const outputDoc = await PDFDocument.load(outputBytes);
    const pageCount = outputDoc.getPageCount();
    console.log(`[Test] Output Page Count: ${pageCount}`);

    if (pageCount !== 2) {
        console.error("❌ FAIL: Expected 2 pages, got " + pageCount);
        process.exit(1);
    }

    const firstPage = outputDoc.getPages()[0];
    const { width, height } = firstPage.getSize();
    console.log(`[Test] Output Page Size: ${width}x${height}`);

    if (Math.abs(width - 400) > 1 || Math.abs(height - 300) > 1) {
        console.error("❌ FAIL: Expected 400x300, got " + width + "x" + height);
        process.exit(1);
    }

    console.log("✅ 2-up logic verified.");
    fs.writeFileSync('test_output_2up.pdf', outputBytes);
}

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
