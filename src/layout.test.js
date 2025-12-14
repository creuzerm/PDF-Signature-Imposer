import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { create2UpSpreads } from './layout_logic';

describe('Layout Logic (2-up)', () => {
    it('creates 2-up spreads correctly', async () => {
        // Create source PDF
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        for (let i = 0; i < 4; i++) {
            const page = doc.addPage([200, 300]);
            page.drawText('Page ' + i, {
                x: 50,
                y: 50,
                size: 20,
                font,
                color: rgb(0, 0, 0),
            });
        }
        const sourceBytes = await doc.save();

        // Run logic
        const outputBytes = await create2UpSpreads(sourceBytes);

        // Verify output
        const outputDoc = await PDFDocument.load(outputBytes);
        const pageCount = outputDoc.getPageCount();

        expect(pageCount).toBe(2);

        const firstPage = outputDoc.getPages()[0];
        const { width, height } = firstPage.getSize();

        // Expect 2x width (400) and same height (300)
        expect(width).toBeCloseTo(400, 0);
        expect(height).toBeCloseTo(300, 0);
    });
});
