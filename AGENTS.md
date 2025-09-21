# Agent Instructions for PDF Signature Imposer

This document provides guidance for AI agents working on this codebase.

## Project Overview

This is a single-file, browser-based web application that repaginates a PDF to allow for correct multi-signature booklet printing. It uses JavaScript to reorder the pages of a source PDF so that when printed in "booklet" mode, the output can be folded into separate, correctly ordered signatures for bookbinding.

The entire application is contained within `index.html`.

## Technology Stack

*   **HTML/CSS/JavaScript**: The application is built with standard web technologies.
*   **Vanilla JavaScript**: There are no JavaScript frameworks like React or Vue. All DOM manipulation and logic are written in plain JavaScript.
*   **pdf-lib.js**: This library is used for all PDF manipulation. It's loaded from a CDN. The script is included in the `<head>` of `index.html`.
*   **Tailwind CSS**: This utility-first CSS framework is used for styling. It is also loaded from a CDN.

There is **no build process**. You do not need to run `npm install` or any other build commands.

## Development and Testing

To test any changes, simply open the `index.html` file in a modern web browser (like Chrome, Firefox, or Edge).

There are no automated tests for this project. All testing must be performed manually.

### Manual Testing Workflow:

1.  **Open `index.html` in a browser.**
2.  **Upload a test PDF.** A PDF with at least 16 pages is recommended to test all features.
3.  **Test with different settings:**
    *   Select various "Pages per Signature" options.
    *   Toggle the "Separate cover with flyleaf" checkbox on and off.
4.  **Click "Repaginate & Download".**
5.  **Verify the downloaded PDF.** Open the new `imposed_... .pdf` file and carefully check the page order. The `README.md` file contains a detailed example of the expected output for a 16-page document.

## Core Logic

The core logic of the application is inside the `<script>` tag in `index.html`.

The most important function is `processPDF()`. This function is responsible for:
1.  Reading the uploaded PDF.
2.  Calculating the number of signatures and padding pages.
3.  Handling the flyleaf logic.
4.  **Generating the new page order.** The page imposition algorithm is complex and is the most critical part of the application. Any changes to this logic must be tested thoroughly.
5.  Creating the new PDF and triggering the download.

When working on this project, pay close attention to the `processPDF` function and ensure that any modifications result in a correctly imposed PDF. Refer to the `README.md` for the principles of booklet imposition if you are unsure.

## Imposition Algorithm

The core task of this tool is to reorder the pages of a source document (after handling flyleaves and padding) into a new sequence. This new sequence is designed to "trick" a standard printer's booklet-making feature into producing multiple, separate signatures instead of one large one.

The algorithm works as follows:

1.  **Divide into Signatures**: The source pages (a list of page objects, potentially including added flyleaves and blank padding pages) are first conceptually divided into signatures of a given size (e.g., 16 pages per signature).

2.  **Split Signatures in Half**: Each signature is split into a "front half" and a "back half". For a 16-page signature, pages 1-8 are the front half and pages 9-16 are the back half.

3.  **Group Halves**: The algorithm creates two collections:
    *   A list of all the "front half" chunks.
    *   A list of all the "back half" chunks.

4.  **Reverse the Back Half Order**: The list of "back half" chunks is reversed. For example, if there are two signatures, the back half of Signature 2 is now placed before the back half of Signature 1.

5.  **Concatenate and Flatten**: The final page order is created by:
    *   First, taking the list of "front half" chunks and flattening it into a single sequence of pages.
    *   Then, taking the *reversed* list of "back half" chunks and flattening it into a single sequence of pages.
    *   Appending the second sequence to the first.

### Example: 32-page document, 16-page signatures

*   **Signature 1**: Pages 1-16. Front half: 1-8. Back half: 9-16.
*   **Signature 2**: Pages 17-32. Front half: 17-24. Back half: 25-32.

The final imposed order will be:
`[1-8]`, `[17-24]`, `[25-32]`, `[9-16]` (flattened into a single list).

This new sequence is then used to build the final PDF. When this new PDF is printed with a booklet setting, the printer will correctly assemble the sheets for Signature 1 and Signature 2 separately.
