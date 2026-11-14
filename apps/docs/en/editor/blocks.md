# Blocks

Every line of a document is a block that you can turn into another one, move or delete.

<Example name="editor/Blocks" />

Type `/` for the menu of blocks. It holds text, headings, lists, quotes, code, callouts, toggles,
columns and tables, as well as images, files and links.

Hover a block to see its handle. Click the handle to turn the block into another one, duplicate,
move or delete it, or drag the handle to move the block. Ctrl+Shift+↑ and Ctrl+Shift+↓ move the
block with the caret.

Some blocks add their own items to the handle menu: a callout picks its tone, and a toggle can
stay open by default.

## Keep only the blocks you need

Restrict the schema to the blocks and styles the form needs:

<Example name="editor/LimitedBlocks" />

The slash menu and the bars offer only what the schema allows. Pasted content is cut down to the
same blocks and styles.

## Table in a document

Open the menu of a column to sort, filter, rename it or change its type:

<Example name="editor/DocumentTable" />

A column holds text, numbers, dates, checkboxes or a choice from a list. The sort and the filters
are saved in the document, and readers see the rows the way the author left them.

A table pasted from a spreadsheet or a word processor becomes the same block.

## Custom block

Describe the block in the schema and give it a view with `defineBlock`:

<Example name="editor/CustomBlock" />

The schema entry says how the block is stored: its attributes, its HTML and how to read it back
from HTML. That is all NuiContent needs to show the block without the editor.

`defineBlock` adds the editor side: the `view` component, items for the slash and handle menus,
and keys. The view receives the node and changes it with `editor.setAttrs`, as the product picker
does.

Pass the built-in `editorBlocks` along with yours: `blocks` replaces the whole list and is read
once when the editor mounts.

<SignatureReference :names="['defineBlock', 'NuiEditorBlock', 'NuiEditorBlockViewProps']" />
