const { PDFDocument, PDFName, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const { create2UpSpreads } = require('./src/layout_logic');

async function runTestForPages(numPages) {
    console.log(`[Test] Creating ${numPages}-page source PDF...`);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < numPages; i++) {
        const page = doc.addPage([200, 300]);
        page.drawText('Page ' + i, { x: 50, y: 50, size: 20, font, color: rgb(0,0,0) });
    }
    const sourceBytes = await doc.save();

    console.log(`[Test] Running create2UpSpreads for ${numPages} pages...`);
    const outputBytes = await create2UpSpreads(sourceBytes);

    const outputDoc = await PDFDocument.load(outputBytes);
    const pageCount = outputDoc.getPageCount();
    console.log(`[Test] Output Page Count: ${pageCount}`);
    
    const expectedPageCount = Math.ceil(numPages / 2);

    if (pageCount !== expectedPageCount) {
        console.error(`❌ FAIL: Expected ${expectedPageCount} pages, got ${pageCount}`);
        process.exit(1);
    }

    const pages = outputDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        console.log(`[Test] Output Page ${i + 1} Size: ${width}x${height}`);

        if (Math.abs(width - 400) > 1 || Math.abs(height - 300) > 1) {
            console.error("❌ FAIL: Expected 400x300, got " + width + "x" + height);
            process.exit(1);
        }
        
        // Check right slot for the last page of an odd number of pages source
        if (numPages % 2 !== 0 && i === pages.length - 1) {
            const pageNode = page.node;
            
            // `pdf-lib` encapsulates the objects (XObjects) drawn to a page inside its Resources.
            // When embedding pages, it uses the "Do" (Draw Object) operator with a reference name.
            const resources = pageNode.Resources();
            const xobjects = resources.get(PDFName.of('XObject'));
            
            // For odd pages' last output page, there should only be one embedded page drawn (the left one).
            // Hence, the XObject dict should only have 1 entry.
            if (xobjects) {
                const keys = xobjects.keys();
                if (keys.length !== 1) {
                    console.error(`❌ FAIL: Expected 1 XObject on the last page of ${numPages}-page document, got ${keys.length}`);
                    process.exit(1);
                }
            } else {
                 console.error(`❌ FAIL: Expected XObjects on the last page of ${numPages}-page document, got none`);
                 process.exit(1);
            }
        }
    }

    console.log(`✅ 2-up logic verified for ${numPages} pages.`);
    fs.writeFileSync(`test_output_2up_${numPages}pages.pdf`, outputBytes);
}

async function runAllTests() {
    await runTestForPages(4);
    await runTestForPages(3);
    await runTestForPages(5);
}

runAllTests().catch(err => {
    console.error(err);
    process.exit(1);
});
