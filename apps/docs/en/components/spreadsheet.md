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

`useCollabWorkbook` from `@numior/collaboration/spreadsheet` connects a book to a server. It needs
`@numior/spreadsheet` installed next to `@numior/collaboration`.

```vue
<template>
  <NuiCollabFailure v-if="failure !== undefined" :failure="failure" @rejoin="rejoin" />
  <NuiSpreadsheet
    v-if="ready"
    :book="book"
    :calculator="calculator"
    :collaboration="document"
    :readonly="readOnly"
    :peers="peers"
    label="Shared book"
    @change="sync"
    @presence="sharePlace"
  />
</template>

<script setup lang="ts">
import { webSocketTransport } from '@numior/collaboration';
import { useCollabWorkbook } from '@numior/collaboration/spreadsheet';
import { NuiCollabFailure } from '@numior/collaboration/vue';
import { NuiSpreadsheet } from '@numior/spreadsheet';
import { createCalculator, createWorkbook } from '@numior/spreadsheet/core';

const book = createWorkbook();
const calculator = createCalculator(book);

const { document, ready, readOnly, peers, failure, sync, sharePlace, rejoin } = useCollabWorkbook({
  doc: 'budget',
  user: { id: 'ann', name: 'Ann' },
  transport: webSocketTransport('wss://example.com/collab'),
  book,
  calculator,
});
</script>
```

`sync` from `change` sends your edits. Edits by other people appear on their own and do not fire
`change`. `ready` turns on once the book has loaded from the server, and `sharePlace` shows the
others the cell you are in.

When someone else inserts or removes rows and columns, the active cell and the selection stay on
their data. An open cell moves with its row: the typed text, the focus and the caret are kept. If
its row or column was removed, the edit closes and the sheet says so in a note.

The references of an unfinished formula follow the data too. After a row is inserted above the
ninth one, `=SUM(A3:A9)` becomes `=SUM(A3:A10)`, and the caret stays at the same character. A
reference to removed cells turns into `#REF!`, as in a saved formula.

While a word is being composed through an IME, the cell and the references of its formula wait.
They move once the word is done, so the input is not broken.

The screen keeps the same data: rows inserted above the window do not push away what you read. A
sheet scrolled to its very start shows rows inserted at the start right away.

Conditional formatting rules that different people add at the same time are all kept. The order of
the rules follows the person who changed it.

Once the connection fails, edits are no longer sent: `readOnly` turns on and `failure` holds the
reason. `NuiCollabFailure` explains it and offers to open the book again, which calls `rejoin`. The
page is not reloaded.

The server then sends the whole book. It replaces the local one together with the unsent edits, and
the sheet stays on the same tab. Until the book arrives, the sheet stays read-only.

Do not show `fileBar` in a shared book: opening a file replaces the book, and the others stop seeing
it. The `readonly` prop turns editing off.

## Behavior

### Formulas

Text that starts with `=` becomes a formula. While the cursor sits where an operand goes, a click, a
drag or the arrows insert a reference, and `F4` cycles its `$` signs.

References in the formula text and range frames on the sheet share a color. Drag a frame by its edge
or corner and the reference in the formula changes. A list of functions appears after letters, and
a hint shows the current argument inside parentheses.

References combine with the operators of Excel. A colon spans two references (`A1:INDEX(A:A,5)`),
and a space intersects them (`A1:C3 B2:D4`). A list in parentheses joins several areas
(`SUM((A1,C1:C3))`).

Areas go to the functions Excel gives them to — `SUM`, `COUNT`, `INDEX`, `AREAS` and others; the
rest return `#VALUE!`.

A large book recalculates in parts. Values still being computed are marked, and the bottom of the
sheet shows the progress with a stop button.

### Selection and fill

The handle in the corner of a selection continues a number series or copies formulas with shifted
references. Dragging the handle back clears cells.

The cell menu holds inserting and deleting rows and columns, merging cells, conditional formatting,
pivot tables, charts and pictures. Sheets are added, renamed and deleted on their tabs.

### Merging cells

"Merge cells" in the cell menu turns the selected range into one cell. Each selected range is merged
on its own, and the merges inside it are replaced by the new one.

The merged cell keeps the value of the first filled cell of the range, counted row by row. The
other values are removed, and the sheet says so in a note. `Ctrl+Z` returns the cells and their
values in one step.

"Unmerge cells" takes apart the merges that the selection meets. The value stays in the first cell.
Whole rows and columns are not merged, and inside a table or a pivot table the sheet refuses with
the `merge-blocked` reason.

Your own toolbar runs the same actions with the `mergeCells()` and `unmergeCells()` methods.

### Column widths and row heights

Drag the right edge of a column header or the bottom edge of a row number. On the keyboard press
`Alt` with an arrow on a column header or on a row number.

A double click on the edge of a column header fits the width to the longest text of its cells. An
empty column returns to the width of the sheet. A double click on the edge of a row number returns
the default height.

The fit reads the cells on screen and the first cells from the top, up to 10,000 per gesture. When
a column has more cells, the sheet says so in a note. Hidden rows and cells merged across several
columns are left out.

The size is stored in the book per sheet: `Ctrl+Z` undoes it, XLSX files keep it and co-authors see
it. The book step is written once, at the end of the gesture.

When several whole rows or columns are selected, the edge of one of them sizes all of them. A
double click fits the width of every selected column.

With the whole sheet selected the default size changes and the sizes of single lines are dropped.
The sheet does not size more than 20,000 rows in one gesture and answers with the `lines-too-many`
reason.

In a read-only book the size changes on screen only, while this sheet is shown.

### Pictures and charts

A picture is selected with a click, or with `Alt+F10` from a cell. `Tab` moves to the next
picture. The arrows move a selected picture and `Delete` removes it.

A picture has its own menu: a right click, a long press on a phone, or `Shift+F10` on a selected
picture. The menu offers «Delete», and a chart also offers «Chart settings». A read-only book shows
no picture menu.

### Refused actions

An action the sheet did not apply is explained by a note in the bottom corner of the sheet. The
sheet answers this way to a fill across merged cells and to a merge of table cells. An edit of a
pivot table cell and a row inserted past the limit get the same note.

A note with the `cell-gone` reason also reports an edit whose cell was removed by someone else.

The note fades after six seconds, after the next edit that goes through, or on a click. It stays
while the pointer is over it. The live region gets the same text.

The `refuse` event carries `{ reason, message }`. The reasons are listed in
`NuiSpreadsheetRefusalReason`: an app uses them to show its own message or to keep a log.

## Accessibility

The sheet is marked up as `role="grid"`. Tab enters it once, and the arrows move focus between
cells. The formula bar is tied to the active cell, and results of edits are announced in a live
region.

On a phone a double tap starts editing and a long press opens the menu of a cell or a picture.

<KeyboardReference name="NuiSpreadsheet" />

## API

<ApiReference name="NuiSpreadsheet" />
