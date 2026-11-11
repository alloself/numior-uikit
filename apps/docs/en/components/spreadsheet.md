# Spreadsheet

`NuiSpreadsheet` is a spreadsheet with formulas, sheet tabs and XLSX files. Use it when people need
to calculate right on the page.

<Example name="spreadsheet/Basic" />

Create a book with `createWorkbook()`, fill its sheets and pass it to `book`. Edits change that same
book, and the `change` event reports each of them.

`createCalculator(book)` computes the formulas. Pass it to `calculator` when formulas are set before
the sheet is shown. Otherwise the component creates its own.

## Installation

```ts
import { NuiSpreadsheet } from '@numior/spreadsheet';
import '@numior/vue/styles.css';
import '@numior/table/styles.css';
import '@numior/spreadsheet/styles.css';
```

The book model and formulas live in `@numior/spreadsheet/core`. That entry works without Vue,
including on a server.

## Examples

### Read only

The `readonly` prop turns editing off, while values can still be selected and copied. The
`formulaBar` and `sheetTabs` props remove the formula bar and the tabs.

<Example name="spreadsheet/ReadOnly" />

### Opening and saving XLSX

The `fileBar` prop shows a bar with the file name and Open and Save buttons. Once a file is read, the
`open` event hands over the new book: put it in `book`.

Without `saveFile` the browser downloads the file. Pass `saveFile` to send it to a server.

<Example name="spreadsheet/File" />

Parts of the file the component does not understand are saved unchanged. If an edit could affect
them, the component asks whether to save with losses.

A cell of an XLSX file holds 32,767 characters. The sheet keeps a longer text whole. On saving, the
component asks about the loss and cuts such a text in the file only.

### Your own menu items

The `contextMenu` function receives the sheet and the selection and returns items for the cell menu.

<Example name="spreadsheet/Menu" />

### Editing together

Create a document with `createWorkbookDocument` and pass it to `collaboration`. The
`createCollabClient` client from `@numior/collaboration` connects the document to a server.

```vue
<template>
  <NuiSpreadsheet
    v-if="ready"
    :book="book"
    :calculator="calculator"
    :collaboration="document"
    label="Shared book"
    @change="client.sync()"
  />
</template>
```

Call `client.sync()` from `change` to send your edits. Edits by other people appear on their own and
do not fire `change`. Show the sheet after the book has loaded from the server.

When someone else inserts or removes rows and columns, the active cell and the selection stay on
their data. An open cell moves with its row: the typed text, the focus and the caret are kept. If
its row or column was removed, the edit closes and the sheet says so in a note.

Conditional formatting rules that different people add at the same time are all kept. The order of
the rules follows the person who changed it.

Once the client is `failed`, edits are no longer sent: set `readonly` on the sheet and offer to
open the book again. To do that, stop the client, call `document.reset()` and create a new client.

The server sends the whole book. It replaces the local one together with the unsent edits, and the
sheet stays on the same tab.

Do not show `fileBar` in a shared book: opening a file replaces the book, and the others stop seeing
it. The `readonly` prop turns editing off.

## Behavior

### Formulas

Text that starts with `=` becomes a formula. While the cursor sits where an operand goes, a click, a
drag or the arrows insert a reference, and `F4` cycles its `$` signs.

References in the formula text and range frames on the sheet share a color. Drag a frame by its edge
or corner and the reference in the formula changes. A list of functions appears after letters, and
a hint shows the current argument inside parentheses.

A large book recalculates in parts. Values still being computed are marked, and the bottom of the
sheet shows the progress with a stop button.

### Selection and fill

The handle in the corner of a selection continues a number series or copies formulas with shifted
references. Dragging the handle back clears cells.

The cell menu holds inserting and deleting rows and columns, conditional formatting, pivot tables,
charts and pictures. Sheets are added, renamed and deleted on their tabs.

### Column widths

Drag the right edge of a column header, or press `Alt` with an arrow on the header. The width is
stored in the book per sheet: `Ctrl+Z` undoes it, XLSX files keep it and co-authors see it. A double
click on the edge returns the default width.

In a read-only book the width changes on screen only, while this sheet is shown.

### Refused actions

An action the sheet did not apply is explained by a note in the bottom corner of the sheet. The
sheet answers this way to a fill across merged cells, an edit of a pivot table cell and a row
inserted past the limit. A note with the `cell-gone` reason also reports an edit whose cell was
removed by someone else.

The note fades after six seconds, after the next edit that goes through, or on a click. It stays
while the pointer is over it. The live region gets the same text.

The `refuse` event carries `{ reason, message }`. The reasons are listed in
`NuiSpreadsheetRefusalReason`: an app uses them to show its own message or to keep a log.

## Accessibility

The sheet is marked up as `role="grid"`. Tab enters it once, and the arrows move focus between
cells. The formula bar is tied to the active cell, and results of edits are announced in a live
region.

On a phone a double tap starts editing and a long press opens the cell menu.

<KeyboardReference name="NuiSpreadsheet" />

## API

<ApiReference name="NuiSpreadsheet" />
