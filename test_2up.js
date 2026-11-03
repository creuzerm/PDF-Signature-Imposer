const { PDFDocument, PDFName, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const { create2UpSpreads, calculateImpositionOffsets } = require('./src/layout_logic');

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

function testCreepCompensation() {
    console.log(`[Test] Running creep compensation tests...`);
    const sourceWidth = 200;
    const sourceHeight = 300;
    const targetWidth = 400;
    const targetHeight = 300;
    const totalSheets = 4; // 16-page signature
    const creepAmount = 2; // 2 points max creep

    // Outermost sheet (sheetIndex = 0)
    const outLeft = calculateImpositionOffsets({
        sourceWidth, sourceHeight, targetWidth, targetHeight,
        isLeftPage: true, sheetIndex: 0, totalSheets, creepAmount
    });
    const outRight = calculateImpositionOffsets({
        sourceWidth, sourceHeight, targetWidth, targetHeight,
        isLeftPage: false, sheetIndex: 0, totalSheets, creepAmount
    });

    if (outLeft.x !== 0 || outRight.x !== 200 || outLeft.y !== 0 || outRight.y !== 0) {
        console.error(`❌ FAIL: Expected outermost sheet creep to be 0.`);
        console.error(`outLeft: ${JSON.stringify(outLeft)}, outRight: ${JSON.stringify(outRight)}`);
        process.exit(1);
    }

    // Innermost sheet (sheetIndex = 3)
    const inLeft = calculateImpositionOffsets({
        sourceWidth, sourceHeight, targetWidth, targetHeight,
        isLeftPage: true, sheetIndex: 3, totalSheets, creepAmount
    });
    const inRight = calculateImpositionOffsets({
        sourceWidth, sourceHeight, targetWidth, targetHeight,
        isLeftPage: false, sheetIndex: 3, totalSheets, creepAmount
    });

    // Innermost left should be shifted right by creepAmount (2)
    // Innermost right should be shifted left by creepAmount (2)
    if (inLeft.x !== 2 || inRight.x !== 198) {
        console.error(`❌ FAIL: Expected innermost sheet creep to be fully applied.`);
        console.error(`inLeft: ${JSON.stringify(inLeft)}, inRight: ${JSON.stringify(inRight)}`);
        process.exit(1);
    }

    // Middle sheet (sheetIndex = 1)
    const midLeft = calculateImpositionOffsets({
        sourceWidth, sourceHeight, targetWidth, targetHeight,
        isLeftPage: true, sheetIndex: 1, totalSheets, creepAmount
    });
    const expectedMidCreep = (1 / 3) * 2;

    if (Math.abs(midLeft.x - expectedMidCreep) > 0.001) {
        console.error(`❌ FAIL: Expected middle sheet creep to be interpolated.`);
        process.exit(1);
    }

    console.log(`✅ Creep compensation logic verified.`);
}

async function runAllTests() {
    testCreepCompensation();
    await runTestForPages(4);
    await runTestForPages(3);
    await runTestForPages(5);
}

runAllTests().catch(err => {
    console.error(err);
    process.exit(1);
});
