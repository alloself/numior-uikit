# useClipboard

`useClipboard(options)` copies text through the Clipboard API with an `execCommand` fallback
for old browsers. `copy(text)` resolves to `true` on success, `copied` stays on for
`copiedDuration` milliseconds, `supported` tells whether copying is available.

<Example name="composables/Clipboard" />

## Signature

<SignatureReference
  :names="['useClipboard', 'ClipboardOptions', 'ClipboardControl', 'ClipboardPayload']"
/>

## Behaviour

`copyRich({ text, html })` puts text and HTML on the clipboard together and copies only the text
when the browser refuses HTML. This is how [Table](/en/components/table) hands selected cells over
as a table.

On the server `supported` is `false` and `copy` does nothing. The [Code](/en/components/code)
buttons and the copy actions of these docs are built on this composable.
