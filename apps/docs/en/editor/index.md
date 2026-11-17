# Editor

A document editor with blocks, tables and files that saves the text as HTML or JSON.

<Example name="editor/Basic" />

Type `/` at the start of a line to turn it into another block, or press + in the top bar to insert one below.

## Installation

```ts install:packages
import { NuiEditor } from '@numior/kit/editor';
import type { DocJSON } from '@numior/kit/editor-core';
```

`@numior/kit/editor-core` holds the document model: the `DocJSON` type and functions such as `fromHTML`.
`@numior/kit/content` describes the blocks and renders a finished document, and `@numior/kit/table` draws
the tables inside it.

## Save the document

Bind the document with `v-model`. By default the model holds an HTML string.

Set `format="json"` to keep the document as an object:

<Example name="editor/Json" />

An HTML model updates 300 ms after the last edit, and a JSON model after every edit. Both update
at once when the editor loses focus or its form is submitted.

The `change` event fires after every edit with the document as JSON, whatever the format of the
model.

## Choose the toolbar

Pick a mode above the editor to compare the bars:

<Example name="editor/Toolbar" />

By default the editor shows both bars: formatting on top and a bar over the selected text. The
block type, such as a heading or a code block, is picked in the bar over the selection.

Touch screens have no bar over the selection, so there the block type moves to the top bar. It
sits there with `toolbar="fixed"` as well. On a phone, the top bar docks above the on-screen
keyboard while you type.

With `none`, there are no bars: text is styled with shortcuts, Markdown and the slash menu.

## Mention a teammate

Pass a search function to `mentions`:

<Example name="editor/Mentions" />

Typing @ opens the list at the caret. The editor waits for a short pause before it calls the
function and aborts a stale call through `signal`. A mention keeps the person's id and name in
the document.

<SignatureReference :names="['NuiEditorMentions', 'NuiEditorMention']" />

## Markdown shortcuts

Type a marker and a space at the start of a line to change the block:

| You type        | You get                                                  |
| --------------- | -------------------------------------------------------- |
| `#` to `######` | Heading of levels 1 to 6                                 |
| `>`             | Quote                                                    |
| `-` or `*`      | Bulleted list                                            |
| `1.`            | Numbered list that starts from this number               |
| `[ ]` or `[x]`  | To-do list, with the item checked after `x`              |
| Three backticks | Code block; a language name after them sets its language |

Typing `---` at the start of a line adds a divider. A style applies when you type the closing
marker after a word:

| You type     | You get       |
| ------------ | ------------- |
| `**bold**`   | Bold          |
| `*italic*`   | Italic        |
| `~~strike~~` | Strikethrough |
| `` `code` `` | Inline code   |

## Read only

Set `readonly` to show the document without editing: the text can still be selected and copied.
To show a finished document on a page, render it with [NuiContent](/en/editor/content), which
loads no editor code.

During server rendering, the editor outputs the document as plain content. It turns into an
editor once it mounts in the browser.

## Control the editor from code

Take the `editor` object from a template ref to call the editor from your code:

```vue
<template>
  <NuiEditor ref="editor" v-model="document" aria-label="Product description" />
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useHotkey } from '@numior/kit';
import { NuiEditor, type NuiEditorApi } from '@numior/kit/editor';
import { saveDescription } from './api';

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const document = ref('<p>A soft armchair on a solid oak frame.</p>');

const save = () => {
  editor.value?.editor.flush();
  void saveDescription(document.value);
};

useHotkey('mod+s', save);
</script>
```

`flush()` writes the latest edits to the model at once, so the shortcut saves what is on the
screen. `run` applies a command from `@numior/kit/editor-core`, and `revealNode` scrolls to a block
by its id.

`coordsAt`, `posAt`, `contentBox` and `watchLayout` help you draw your own layer in the `overlay`
slot, such as the carets of co-authors.

<SignatureReference :names="['NuiEditorApi']" />

## Accessibility

The text area is a multiline text box named by `label` or `aria-label`. Alt+F10 moves the focus
into the formatting bar, the arrow keys walk its buttons, and Escape returns to the text.

In the slash and @ menus the focus stays in the text, and screen readers announce the highlighted
option. On a Mac, press ⌘ in place of Ctrl.

<KeyboardReference name="NuiEditor" />

## API

<ApiReference name="NuiEditor" />
