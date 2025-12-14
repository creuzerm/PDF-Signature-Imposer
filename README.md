# PDF Signature Imposer

This is a browser-based web application that repaginates a PDF to allow for correct multi-signature booklet printing. It intelligently reorders the pages of a source PDF so that when printed using a standard printer's "booklet" mode, the output can be folded into separate, correctly ordered signatures for bookbinding.

## Key Concepts

- **[Imposition](https://en.wikipedia.org/wiki/Imposition)**: In printing, imposition is the process of arranging a document's pages on the printer's sheet so that once the sheet is printed, folded, and cut, the pages appear in their correct final order. This tool performs a specific kind of imposition to prepare a document for booklet printing.
- **[Signature](<https://en.wikipedia.org/wiki/Signature_(bookbinding)>)**: Traditionally, a signature is a single large sheet of paper printed with multiple pages, which is then folded to form a section of a book. With today's duplex printers, this concept is adapted: a signature becomes a group of sheets (e.g., A4 or US Letter) that are stacked and folded together. This group of sheets can then be stapled or sewn together, forming one portion of a larger set.

## The Problem: Why is this tool needed?

Most print drivers offer a "booklet" printing mode. This feature is great for simple booklets because it automatically arranges the pages so they are in the correct order after printing, folding, and stapling. For example, in an 8-page document, it will print pages 8 and 1 on the same sheet, 7 and 2 on the next, and so on.

However, this feature assumes you are creating **one single signature**.

For bookbinding, especially for books with many pages, the proper technique is to create **multiple smaller signatures** and then sew them together. If you simply try to print a 32-page PDF using booklet mode, the printer will treat it as one large 32-page signature. This is often impractical to fold and results in "creep" (the inner pages sticking out farther than the outer ones). The alternative, printing the document in separate 8-page chunks, is tedious and error-prone.

This tool solves that problem.

## The Solution: What does this tool do?

This application creates a new, repaginated PDF that "tricks" the printer's simple booklet mode. It shuffles the pages of your entire document in a precise order. When you print this new, shuffled PDF using the standard booklet setting, the printer performs its regular imposition. The final printed output will be perfectly arranged for you to collate and fold into multiple, separate signatures. It also offers an option to automatically insert blank flyleaves inside the front and back covers for a more professional finish.

### A Concrete Example

Let's say you have a **16-page document** and you want to create **two 8-page signatures**.

**1. Standard Imposition (The Problem):**
If you print the original 16-page document in booklet mode, the printer will create _one large signature_. It will arrange the pages on four sheets of paper like this:

- Sheet 1: pages 16 & 1, 2 & 15
- Sheet 2: pages 14 & 3, 4 & 13
- Sheet 3: pages 12 & 5, 6 & 11
- Sheet 4: pages 10 & 7, 8 & 9

This creates a single, thick 16-page signature.

**2. This Tool's Imposition (The Solution):**
This tool takes your 16-page document and reorders it into a new sequence _before_ you print. The new page order will be:

`1, 2, 3, 4, 9, 10, 11, 12, 13, 14, 15, 16, 5, 6, 7, 8`

Now, when you print _this new document_ in booklet mode, the printer does its standard pairing:

- It pairs the **1st page** (Original Page 1) with the **16th page** (Original Page 8). This is the outer sheet of your **first signature** (pages 1-8).
- It pairs the **2nd page** (Original Page 2) with the **15th page** (Original Page 7). This is the second sheet of your first signature.
- ...and so on.
- It pairs the **5th page** (Original Page 9) with the **12th page** (Original Page 16). This is the outer sheet of your **second signature** (pages 9-16).

The result is two separate stacks of paper that fold perfectly into two distinct 8-page signatures.

#### Signature Order Patterns

To make the printer treat a single job as multiple stacked signatures, the tool "wraps" the signatures around each other in the output file. The first signature occupies the very beginning and very end of the file, the second signature sits just inside that, and so on.

Here are examples of the page sequences generated for larger signature sizes:

16 Pages per Signature (4 Sheets)

_Assumes a 32-page document (2 Signatures)_

- Signature 1 (Pages 1-16): Occupies the outermost slots.
- Signature 2 (Pages 17-32): Occupies the innermost slots.
- Output Sequence: 1-8, 17-24, 25-32, 9-16

20 Pages per Signature (5 Sheets)

_Assumes a 40-page document (2 Signatures)_

- Signature 1 (Pages 1-20): Occupies the outermost slots.
- Signature 2 (Pages 21-40): Occupies the innermost slots.
- Output Sequence: 1-10, 21-30, 31-40, 11-20

24 Pages per Signature (6 Sheets)

_Assumes a 48-page document (2 Signatures)_

- Signature 1 (Pages 1-24): Occupies the outermost slots.
- Signature 2 (Pages 25-48): Occupies the innermost slots.
- Output Sequence: 1-12, 25-36, 37-48, 13-24

## Technology Stack

- **[Vite](https://vitejs.dev/)**: Build tool and development server.
- **[pdf-lib](https://pdf-lib.js.org/)**: PDF manipulation library.
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS framework.
- **[Vitest](https://vitest.dev/)**: Unit testing framework.

## Getting Started

### Prerequisites
- Node.js (v18 or later recommended)
- npm

### Installation
1. Clone the repository.
2. Run `npm install` to install dependencies.

### Development
Run `npm run dev` to start the development server.
```bash
npm run dev
```

### Production Build
To build the application for production:
```bash
npm run build
```
The build artifacts will be generated in the `dist/` directory.

### Deployment
This project requires a build step.

#### Automatic Deployment (Cloudflare Pages)
When connecting your Git repository to Cloudflare Pages, use the following settings:

1.  **Framework Preset**: Select `Vite`.
2.  **Build Command**: `npm run build`
3.  **Build Output Directory**: `dist`

#### Automatic Deployment (GitHub Pages)
This repository includes a GitHub Action (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on every push to the `main` branch.
To enable it:
1. Go to **Settings > Pages** in your GitHub repository.
2. Under **Build and deployment**, select **Source: GitHub Actions**.

## Smart UX Features

To make the process as simple as possible, the tool includes several user-experience enhancements:

1.  **Dynamic Dropdown Labels**: As soon as you upload a PDF, the tool analyzes it. It then updates the "Pages per Signature" dropdown to show you the exact outcome of each choice, including the number of signatures that will be created and how many blank pages will be added to complete the final signature.
2.  **Optimal Auto-Selection**: The tool automatically selects the most efficient signature size for your document (within a preferred range of 16-32 pages). "Most efficient" is defined as the option that requires adding the fewest blank pages. This gives you a great starting point with minimal paper waste.
