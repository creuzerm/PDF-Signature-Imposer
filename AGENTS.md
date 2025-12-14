# AGENTS.md

## Project Overview
This project is a PDF Imposition tool that takes a source PDF and rearranges its pages into **Signatures** (small booklets) suitable for binding.

## Core Logic Requirements

### 1. Sequential Signatures (Critical Fix)
**Current Issue:** The current code interleaves signatures (e.g., placing the first half of Signature 1, then the first half of Signature 2, etc.). This causes pages 9-16 (in a 16-page signature) to be lost or displaced.
**Requirement:** Signatures must be processed **sequentially**.
* Process **Signature 1** (Pages 1-16) completely.
* Then process **Signature 2** (Pages 17-32) completely.
* Do not nest or wrap signatures inside each other.

### 2. Imposition Mapping (Booklet Order)
Within each signature (e.g., a 16-page block), pages must be reordered to form a **Printer Spread** so they fold correctly.
* **Format:** The output PDF should contain single pages in the specific "Imposed" order. (The user will print this PDF using standard Duplex/Double-Sided printing).
* **Algorithm:** For a signature of size `N`:
    * Sheet 1 Front: `Page N`, `Page 1`
    * Sheet 1 Back:  `Page 2`, `Page N-1`
    * Sheet 2 Front: `Page N-2`, `Page 3`
    * Sheet 2 Back:  `Page 4`, `Page N-3`
    * ...continue until center.

### 3. Example: 16-Page Signature
For a block of 16 source pages (1-16), the output order must be:
1.  **16** (Back Cover of Sig)
2.  **1** (Front Cover of Sig)
3.  **2** (Inside Front)
4.  **15** (Inside Back)
5.  **14**
6.  **3**
7.  **4**
8.  **13**
...and so on.

### 4. Implementation Steps
1.  Calculate `totalSignatures`.
2.  Iterate `sigIndex` from `0` to `totalSignatures - 1`.
3.  Extract the slice of pages for *this specific signature* (e.g., `slice(sigIndex * 16, (sigIndex + 1) * 16)`).
4.  Apply the **Imposition Mapping** (Step 2) to this slice.
5.  Add the reordered pages to the new PDF.
6.  Repeat for the next signature.

## Automated Testing

### Automated Testing

#### 1. Core Imposition Logic (`test_imposition.js`)
This script verifies the sequential signature processing and booklet page ordering.
*   **Generates** a temporary 100-page "Source PDF".
*   **Runs** the imposition logic.
*   **Inspects** the mapping array.
*   **Command:** `node test_imposition.js`
*   **Requirement:** Must pass `✅ ALL TESTS PASSED` after any changes to `src/imposition_logic.js`.

#### 2. 2-Up Layout Logic (`test_2up.js`)
This script verifies the creation of 2-up landscape spreads.
*   **Command:** `node test_2up.js`
*   **Critical Implementation Note:** When creating blank pages (for padding or flyleaves) that will be processed by the 2-up logic, you **must** draw something on them (e.g., invisible text). `pdf-lib` will throw a "Can't embed page with missing Contents" error if attempting to embed a completely empty page.

**Prerequisites:**
*   Node.js environment
*   `pdf-lib` installed (`npm install pdf-lib`)
