# Code

A code block with a copy button, line numbers and syntax highlighting.

<Example name="code/Basic" />

## Installation

```ts
import { NuiCode } from '@numior/kit';
```

## Usage

Switch on line numbers, wrapping and collapsing for a list of orders.

<Configurator name="NuiCode" />

## Examples

### Collapse a long listing

Set `maxLines` to the number of lines that stay visible.

<Example name="code/Collapsed" />

Add `wrap`, and long lines wrap, so the code does not scroll sideways.

### Highlight lines

List the line numbers in `highlight`.

<Example name="code/Highlight" />

### Name the file

Pass the file name to `title`.

<Example name="code/Title" />

## Highlighting

A block with a `language` colors its syntax on its own. Shiki loads on the first highlight, and
the grammar of a language loads when that language first appears on the page. Until then, and
during server rendering, the code shows in one color.

Pass `highlighter` to give one block its own highlighter, or `:highlighter="false"` to turn
highlighting off. The plugin does the same for the whole app:

```ts
import { createNuiConfig } from '@numior/kit';

app.use(createNuiConfig({ highlighter: false }));
```

Your own highlighter is an object of the `NuiHighlighter` type.

<SignatureReference :names="['useHighlighter', 'highlightCode', 'languageOf', 'NuiHighlighter']" />

## Ready-made tokens

Pass highlighting made at build time in `tokens`, and the block needs no highlighter. Every line
is a list of text fragments with a `scope`, such as `keyword`, `string` or `comment`.

## Accessibility

The copy button is labeled "Copy code", and after a press a screen reader announces "Copied".
The code area takes keyboard focus, so a long line scrolls with the arrow keys. Line numbers stay
out of the selection and of the copied text.

## API

<ApiReference name="NuiCode" />
