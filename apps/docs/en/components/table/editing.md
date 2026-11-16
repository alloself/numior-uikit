# Editing

People type into cells and paste from the clipboard, and your app applies each change to its data.

## Selection and clipboard

The `cellSelection` prop turns on cell selection; without it the table selects text like a
regular page.

Dragging with the mouse selects a rectangle of cells. Shift+click selects a rectangle from the
last clicked cell, and Ctrl+click adds a single cell. Shift or Ctrl on a selected cell removes it
from the selection.

After a double click on a cell that does not open an editor, a drag that starts in that cell
selects its text. A click on another cell, the arrow keys or Escape bring cell
selection back.

Escape clears the selection, and a click outside the table clears it too. Elements listed in
`keepEditing`, such as a formula bar, keep the selection. Selected ranges are kept in
`v-model:ranges`.

Ctrl+C copies the selection as tab-separated text and as an HTML table, so pasting into Excel or
Google Sheets keeps the cells.

The right mouse button, Shift+F10 or a long press open the cell menu. The `contextMenu` function
adds its own items after the copy item.

<Example name="table/Ranges" />

## Editing cells

A column with `editable: true` can be edited, and an `editable(row)` function decides it for each
row. Delete and Backspace clear the selected cells, and Ctrl+X cuts them to the clipboard.

The table never changes `rows` itself: it emits an `edit` event with the list of changes, and the
application applies them. Ctrl+Z undoes the last edit, Ctrl+Shift+Z and Ctrl+Y redo it.

After an edit the row stays in place even when the column is sorted or filtered. Totals update
right away. Without `getKey` the edit history resets when `rows` change.

When new `rows` arrive, the open editor, the active cell and the selection stay on their rows.
The table finds a row by `getKey`, or by the object itself without it. When the new data no
longer has the row, the editor closes without saving and the table sends `editRefused` with the
reason `row-gone`.

A word composed through an IME is finished in the editor's own cell. The editor moves to its row
once the word is done, because a move to another cell would break the input.

The draft, the focus and the caret stay in the editor while it follows its row. Equal `sort`,
`filters`, `groupBy` and `expanded` change nothing. The editor and the selection stay, and the
query does not run again.

The `undo` and `redo` methods on the table ref undo and redo edits from code. To keep the history
in the application, pass `commands`, and every edit arrives in its `push`. Ctrl+Z and Ctrl+Y then
call its `undo()` and `redo()`.

Ctrl+V pastes tab-separated text starting at the active cell, and the pasted area becomes the
selection. A single value fills the whole selection, and whatever does not fit in the table is
dropped.

When the selection is a whole multiple of the pasted block, the block repeats over it. Numbers,
dates and booleans are parsed by the column type. `parse(text, row)` sets custom parsing, and
returning `undefined` skips the cell.

Enter, F2 or a double click opens the editor in the active cell, and typing starts the edit right
away. The editor depends on the column type: a text input, a number field or a date picker. A
boolean value toggles at once, without an editor.

Enter saves the value and moves down, Tab moves right, and Escape cancels the edit. On a phone a
double tap opens the editor. Pinned rows and group rows cannot be edited.

The `rules` from [forms](/en/guide/forms-validation) check the value before it is saved. The error
shows in the editor, and moving the focus away from an invalid value cancels the edit. Pasting and
clearing skip the cells that fail the rules.

<Example name="table/Edits" />

## Custom clipboard format

The `clipboard` prop defines what goes to the clipboard on copy and how a paste is parsed. The
`serialize` function receives the ranges, the block to copy, the rows and the column keys and
returns text and HTML.

The block lists row and column positions in `rows` and `cols`. It is the union of the selected
ranges that share rows or columns, cut to `lastCell` and to `copyLimit`.

The `parse` function receives the text and HTML from the clipboard and the top left target cell,
and returns rows of cell values. The paste then goes on as usual: parsing by column type, rule
checks and a single undo step for the whole paste.

When `parse` returns `undefined`, the table parses the paste itself.

<Example name="table/Clipboard" />

## Custom editors

The `editor` field of a column sets a custom editor. The `tableEditor(NuiSelect, isString,
{ props })` helper checks the props against the component types, and `isString` checks that the
cell value suits the editor.

An editor can also be a key from the [control registry](/en/composables/controls), such as
`'select'` or `{ control, props }`. Such an editor is checked when it opens. The registry is set in
`createNuiConfig({ controls })` or in the `controls` prop of the table.

A list opens at once, and a picked value is saved without Enter. A date column passes and
receives an ISO string, like `NuiDatePicker`.

When the registry lacks the control or its props and value do not fit, the cell stays closed.
The table then emits the `editRefused` event.

<Example name="table/Editors" />

## Formula bar

The `active` and `draft` models connect the table to a field outside it. `active` holds the
active cell, and `draft` holds the cell and the value of the open editor. Writing a new value to
`draft` changes the text in the cell too.

The `startEdit('append', { focus: false })` method on the table ref opens the editor and leaves
the focus in the field. `startEdit('replace')` opens it with an empty value.
`commitEdit('down')` saves the edit, `cancelEdit()` cancels it, and the focus returns to the
table.

`focusCell({ row, col })` moves the focus into a cell from outside, for example from a name box.
It returns `false` for a position outside the table.

`moveActive({ row, col })` is for rows or columns of a source that shifted under the table, for
example when someone else inserted a row above. The active cell moves to the new position, and an
editor open in it keeps its text, focus and caret.

The table does not scroll and does not take the focus from a field outside it. The method returns
`false` when the position is outside the table or its cell cannot be edited: the editor then stays
where it was.

To keep the same data on the screen, take `scrollAnchor()` before the shift. It answers with the
row and column at the top and start edges of the window and how far they went past the edge. After
the shift, pass the new positions of the same row and column to
`scrollToAnchor({ row, rowOffset, col, colOffset })`.

A table without a row window (`height: 'auto'`) answers `undefined` and does not scroll.

`fitWidth(text, style)` answers with the column width in pixels at which a cell shows this text on
one line. It counts the font of the cell style, the cell paddings, the grid line and the room of an
icon. The method returns `undefined` until the table is mounted.

List in `keepEditing` the elements that can take the focus without ending the edit. Ctrl+Enter in
the editor writes the value to every selected cell in columns of the same type.

With `growEditor` the editor sits exactly on the bounds of its cell and wears the selection
frame. It keeps the fill and text color of the cell.

Once the text stops fitting, the editor grows over the neighboring cells by whole columns, as in
Excel. End-aligned cells grow toward the start, the rest toward the end. The editor stops at
the edge of the visible area, and the text scrolls inside the field.

<Example name="table/FormulaBar" />

## Cell references

The `picking(draft)` function tells whether the draft is waiting for a cell reference, for
example when it ends with `=`, a bracket or an operator. Clicks and drags over cells, taps on a
phone and arrows in the editor then pick cells instead of ending the edit.

Every pick arrives as the `pick` event with a range, and the application inserts the reference
into the draft. The `cellName` and `rangeName` helpers turn a range into an address such as `B2`
or `B2:C4`.

The table does not compute formulas. The `overlay` layer can highlight the cells a formula refers
to.

<Example name="table/Picking" />

## Export to CSV

The `exportCsv` method on the table ref exports to CSV the rows of all pages with filters and
sorting applied, in the visible columns only. Cells get the same text as on screen.

`separator` sets the delimiter, and `headers: false` removes the header line. A long export runs
in chunks, shows a progress bar and stops on `signal`.

Text that Excel would run as a formula is exported with a leading apostrophe. Such text starts
with `=`, `@`, a tab, or with `+` or `-` and is not a number. `formulas: true` turns this
protection off for files read by a program instead of a person in a spreadsheet editor.

For Excel to open the file without garbled text, add a byte order mark at the start. Locales
with a decimal comma also expect the `;` delimiter, as in the example.

<Example name="table/Export" />
