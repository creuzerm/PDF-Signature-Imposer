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
