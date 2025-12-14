import { PDFDocument, StandardFonts } from 'pdf-lib';
import { generateImpositionMap } from './imposition_logic.js';
import { create2UpSpreads } from './layout_logic.js';
import './style.css';

// --- DOM Element References ---
const pdfUploadInput = document.getElementById('pdf-upload');
const fileNameDisplay = document.getElementById('file-name-display');
const signatureSizeSelect = document.getElementById('signature-size');
const processBtn = document.getElementById('process-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const statusArea = document.getElementById('status-area');
const infoOriginalPages = document.getElementById('info-original-pages');
const infoSignatureSize = document.getElementById('info-signature-size');
const infoNumSignatures = document.getElementById('info-num-signatures');
const infoPaddedPages = document.getElementById('info-padded-pages');
const statusMessage = document.getElementById('status-message');
const errorMessage = document.getElementById('error-message');
const separateCoverFlyleafCheckbox = document.getElementById(
    'separate-cover-flyleaf'
);

let uploadedFile = null;
let currentOriginalPageCount = 0;

// --- Event Listeners ---
pdfUploadInput.addEventListener('change', handleFileSelect);
processBtn.addEventListener('click', processPDF);
separateCoverFlyleafCheckbox.addEventListener('change', () => {
    if (currentOriginalPageCount > 0) {
        updateSignatureOptions(currentOriginalPageCount);
    }
});

/**
 * Updates the signature dropdown with dynamic info and auto-selects the best option.
 */
function updateSignatureOptions(originalPageCount) {
    const separateCoverCheckbox = document.getElementById(
        'separate-cover-flyleaf'
    );
    let adjustedPageCount = originalPageCount;

    if (separateCoverCheckbox.checked && originalPageCount >= 2) {
        adjustedPageCount += 2;
    }

    let minBlanks = Infinity;
    let bestSignatureSize = null;

    const options = signatureSizeSelect.getElementsByTagName('option');

    for (const option of options) {
        const sigSize = parseInt(option.value, 10);
        if (isNaN(sigSize)) continue;

        const numSheets = sigSize / 4;
        const numSignatures = Math.ceil(adjustedPageCount / sigSize);
        const totalPages = numSignatures * sigSize;
        const blanksAdded = totalPages - adjustedPageCount;

        option.textContent = `${sigSize} pages (${numSheets} sheets) — ${numSignatures} sigs, adds ${blanksAdded} blank(s)`;

        if (sigSize >= 16 && sigSize <= 32) {
            if (blanksAdded < minBlanks) {
                minBlanks = blanksAdded;
                bestSignatureSize = sigSize;
            }
        }
    }

    if (bestSignatureSize !== null) {
        signatureSizeSelect.value = bestSignatureSize;
    }
}

/**
 * Handles the file input change event.
 */
async function handleFileSelect(event) {
    const files = event.target.files;
    currentOriginalPageCount = 0;

    if (files.length === 0) {
        fileNameDisplay.textContent = 'Click to browse or drag & drop';
        fileNameDisplay.classList.remove(
            'text-indigo-700',
            'dark:text-indigo-300',
            'font-semibold',
            'text-red-600',
            'dark:text-red-400'
        );
        fileNameDisplay.classList.add('text-gray-500', 'dark:text-gray-400');
        resetStatus();
        uploadedFile = null;
        processBtn.disabled = true;
        return;
    }

    uploadedFile = files[0];
    fileNameDisplay.textContent = 'Analyzing PDF...';
    fileNameDisplay.classList.remove('text-gray-500', 'dark:text-gray-400');
    fileNameDisplay.classList.add(
        'text-indigo-700',
        'dark:text-indigo-300',
        'font-semibold'
    );
    resetStatus();

    try {
        const existingPdfBytes = await uploadedFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const originalPageCount = pdfDoc.getPageCount();
        currentOriginalPageCount = originalPageCount;

        updateSignatureOptions(originalPageCount);

        fileNameDisplay.textContent = uploadedFile.name;
    } catch (err) {
        console.error('Failed to analyze PDF:', err);
        fileNameDisplay.textContent = 'Could not read PDF';
        fileNameDisplay.classList.remove(
            'text-indigo-700',
            'dark:text-indigo-300'
        );
        fileNameDisplay.classList.add('text-red-600', 'dark:text-red-400');
        errorMessage.textContent = 'Invalid or corrupt PDF file.';
        statusArea.classList.remove('hidden');
        uploadedFile = null;
        currentOriginalPageCount = 0;
    }
}

function resetStatus() {
    statusArea.classList.add('hidden');
    statusMessage.textContent = '';
    errorMessage.textContent = '';
}

function setProcessingState(isProcessing) {
    processBtn.disabled = isProcessing;
    if (isProcessing) {
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
    }
}

function updateInfoPanel(
    originalPages,
    sigSize,
    numSigs,
    finalPages,
    flyleafsAdded
) {
    infoOriginalPages.innerHTML = `<span>Original Page Count:</span> <strong>${originalPages}</strong>`;
    infoSignatureSize.innerHTML = `<span>Pages per Signature:</span> <strong>${sigSize}</strong>`;
    infoNumSignatures.innerHTML = `<span>Number of Signatures:</span> <strong>${numSigs}</strong>`;

    const infoFlyleafStatusDiv = document.getElementById('info-flyleaf-status');
    if (flyleafsAdded) {
        infoFlyleafStatusDiv.innerHTML = `<span>Flyleaves:</span> <strong>Active (2 pages added)</strong>`;
    } else {
        infoFlyleafStatusDiv.innerHTML = `<span>Flyleaves:</span> <strong>Inactive</strong>`;
    }

    infoPaddedPages.innerHTML = `<span>Final Page Count (incl. padding & flyleaves):</span> <strong>${finalPages}</strong>`;
    statusArea.classList.remove('hidden');
}

/**
 * The core function to repaginate the PDF.
 */
async function processPDF() {
    // 1. Validate inputs
    if (!uploadedFile) {
        errorMessage.textContent = 'Please upload a PDF file first.';
        statusArea.classList.remove('hidden');
        return;
    }
    const signatureSize = parseInt(signatureSizeSelect.value, 10);
    if (signatureSize % 4 !== 0) {
        errorMessage.textContent = 'Signature size must be a multiple of 4.';
        statusArea.classList.remove('hidden');
        return;
    }

    resetStatus();
    setProcessingState(true);
    statusMessage.textContent = 'Reading PDF file...';
    statusArea.classList.remove('hidden');

    try {
        // 2. Load the PDF
        const existingPdfBytes = await uploadedFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const originalPageCount = pdfDoc.getPageCount();
        const isFlyleafEnabled = document.getElementById(
            'separate-cover-flyleaf'
        ).checked;

        let processingPageCount = originalPageCount;
        if (isFlyleafEnabled && originalPageCount >= 2) {
            processingPageCount += 2; // For front and back flyleaves
        }

        // 3. Calculate padding and signature layout
        const totalPages =
            Math.ceil(processingPageCount / signatureSize) * signatureSize;
        const numSignatures = totalPages / signatureSize;

        const flyleafsEffectivelyAdded =
            isFlyleafEnabled && originalPageCount >= 2;
        updateInfoPanel(
            originalPageCount,
            signatureSize,
            numSignatures,
            totalPages,
            flyleafsEffectivelyAdded
        );
        statusMessage.textContent = 'Preparing pages for imposition...';

        const newPdfDoc = await PDFDocument.create();
        const font = await newPdfDoc.embedFont(StandardFonts.Helvetica);
        const copiedOriginalPages = await newPdfDoc.copyPages(
            pdfDoc,
            pdfDoc.getPageIndices()
        );

        let pagesForImposition = [];
        const BLANK_PAGE_MARKER = { isBlank: true };

        if (isFlyleafEnabled && originalPageCount >= 2) {
            pagesForImposition.push(copiedOriginalPages[0]); // Front Cover
            pagesForImposition.push(BLANK_PAGE_MARKER); // Flyleaf
            for (let i = 1; i < originalPageCount - 1; i++) {
                pagesForImposition.push(copiedOriginalPages[i]);
            }
            pagesForImposition.push(BLANK_PAGE_MARKER); // Flyleaf
            pagesForImposition.push(copiedOriginalPages[originalPageCount - 1]); // Back Cover
        } else {
            pagesForImposition = [...copiedOriginalPages];
        }

        statusMessage.textContent = 'Calculating new page order...';

        // 4. Generate the new page order.
        // Process signatures sequentially. Within each signature, reorder pages
        // to form printer spreads (imposition).
        const imposedOrderIndices = generateImpositionMap(
            processingPageCount,
            signatureSize
        );

        statusMessage.textContent = 'Assembling new PDF document...';

        // 5. Add pages to the new document in the calculated order
        let pageDimensionSource =
            copiedOriginalPages.length > 0
                ? copiedOriginalPages[0]
                : pdfDoc.getPages().length > 0
                  ? pdfDoc.getPage(0)
                  : null;
        if (!pageDimensionSource && originalPageCount > 0)
            pageDimensionSource = pdfDoc.getPage(0);
        const defaultPageSize = pageDimensionSource
            ? pageDimensionSource.getSize()
            : { width: 612, height: 792 };

        for (const sourcePageIndex of imposedOrderIndices) {
            if (sourcePageIndex < processingPageCount) {
                const pageItem = pagesForImposition[sourcePageIndex];
                if (pageItem && pageItem.isBlank) {
                    const page = newPdfDoc.addPage([
                        defaultPageSize.width,
                        defaultPageSize.height,
                    ]);
                    // Draw invisible text to ensure page has content
                    page.drawText(' ', {
                        font,
                        size: 1,
                        x: 0,
                        y: 0,
                        opacity: 0,
                    });
                } else if (pageItem) {
                    newPdfDoc.addPage(pageItem);
                } else {
                    // Fallback for unexpected error
                    newPdfDoc.addPage([
                        defaultPageSize.width,
                        defaultPageSize.height,
                    ]);
                }
            } else {
                // Padding page
                const page = newPdfDoc.addPage([
                    defaultPageSize.width,
                    defaultPageSize.height,
                ]);
                // Draw invisible text to ensure page has content
                page.drawText(' ', { font, size: 1, x: 0, y: 0, opacity: 0 });
            }
        }

        // 6. Save the PDF and trigger download
        statusMessage.textContent = 'Finalizing PDF... Preparing download.';
        let newPdfBytes = await newPdfDoc.save();

        // Check for 2-up request
        const is2UpEnabled = document.getElementById('create-2up').checked;
        if (is2UpEnabled) {
            statusMessage.textContent = 'Creating 2-up spreads...';
            newPdfBytes = await create2UpSpreads(newPdfBytes);
        }

        const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `imposed_${uploadedFile.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        statusMessage.textContent =
            'Success! Your repaginated PDF has been downloaded.';
    } catch (err) {
        console.error(err);
        errorMessage.textContent = `An error occurred: ${err.message}`;
    } finally {
        setProcessingState(false);
    }
}
