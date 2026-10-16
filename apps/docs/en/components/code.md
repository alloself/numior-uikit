# Code

`NuiCode` is a code block with a header, a copy button, line numbers, highlighted lines and
collapsing of long output. Syntax colours arrive as tokens from any highlighter; these docs
use Shiki at build time. Without tokens the code renders in one colour.

<Example name="code/Basic" />

## Installation

```ts
import { NuiCode } from '@numior/vue';
import '@numior/vue/styles/button.css';
import '@numior/vue/styles/code.css';
```

## Examples

### Long output

`maxLines` collapses the code to the given number of lines and adds an expand button; `wrap`
wraps long lines instead of scrolling horizontally.

<Example name="code/Collapsed" />

## Highlighter

Without `tokens` the block asks the highlighter from `createNuiConfig({ highlighter })` or the
`highlighter` prop; `false` turns highlighting off. The highlighter knows its languages with
aliases and returns tokens at once or as a promise. Until it answers, and on the server, the code
renders in one colour at the same height; answers are cached by language and text.

A ready Shiki highlighter lives in its own entry: Shiki loads on the first highlight and the
grammars load one per language.

```ts
import { createNuiConfig } from '@numior/vue';
import { createShikiHighlighter } from '@numior/vue/shiki';

app.use(createNuiConfig({ highlighter: createShikiHighlighter() }));
```

<SignatureReference :names="['useHighlighter', 'highlightCode', 'languageOf', 'NuiHighlighter']" />

## Behaviour

`tokens` describe the lines in parallel with `code`: every line is a list of pieces with a
scope. The scopes are `keyword`, `string`, `number`, `function`, `type`, `tag`, `attribute`,
`property`, `comment`, `punctuation` and `variable`. The `--nui-syntax-*` theme tokens
colour the scopes.

Copying goes through the clipboard with a fallback for old browsers; without a header the
button floats in the corner.

## Accessibility

The copy button is labelled by the dictionary and the result is announced through
`role="status"`. The code sits in a `<pre>`, so a screen reader reads it line by line; the
line numbers stay out of selection and copying.

## API

<ApiReference name="NuiCode" />
