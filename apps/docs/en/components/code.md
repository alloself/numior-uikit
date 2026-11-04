# Code

`NuiCode` is a code block with a copy button, like the ones in these docs. The block can number
lines, highlight single lines and collapse a long listing.

<Example name="code/Basic" />

## Installation

```ts
import { NuiCode } from '@numior/vue';
import '@numior/vue/styles/button.css';
import '@numior/vue/styles/code.css';
```

## Usage

Pass the code in `code` and the language in `language`. The `title` prop shows a header with a
file name above the code; without it the header shows the language name.

`lineNumbers` numbers the lines, and `highlight` highlights the lines with the given numbers,
such as `[3]`. With `:copyable="false"` there is no copy button.

## Examples

### Long output

The `maxLines` prop shows only the first lines of the code and adds a "Show more" button. `wrap`
wraps long lines, so the code does not scroll horizontally.

<Example name="code/Collapsed" />

## Highlighter

Without a highlighter the code renders in one colour. To colour the syntax, add the ready Shiki
highlighter through the plugin:

```ts
import { createNuiConfig } from '@numior/vue';
import { createShikiHighlighter } from '@numior/vue/shiki';

app.use(createNuiConfig({ highlighter: createShikiHighlighter() }));
```

Shiki loads on the first highlight, and the grammar of each language loads when it first appears
on the page. Until highlighting is ready, and during server rendering, the code renders in one
colour and the block keeps its height.

The `highlighter` prop sets a highlighter for one block, and `:highlighter="false"` turns
highlighting off. You can also write your own highlighter; its signature is `NuiHighlighter`.

<SignatureReference :names="['useHighlighter', 'highlightCode', 'languageOf', 'NuiHighlighter']" />

## Behaviour

When the code is already coloured at build time, pass the result in `tokens`, and no highlighter
is needed. Every line in `tokens` is a list of text pieces with a type: `keyword`, `string`,
`comment` and others.

The colour of each type comes from a `--nui-syntax-*` theme variable, such as
`--nui-syntax-keyword`. Without a header the copy button sits in the corner of the block.

## Accessibility

The copy button is labelled "Copy code", and after a press a screen reader announces "Copied".
The code area takes keyboard focus and scrolls with the arrow keys. Line numbers cannot be
selected and stay out of the copied text.

## API

<ApiReference name="NuiCode" />
