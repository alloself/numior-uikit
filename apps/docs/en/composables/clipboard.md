# useClipboard

`useClipboard(options)` copies text to the clipboard. In browsers without the Clipboard API it
uses `document.execCommand('copy')`.

`copy(text)` resolves to `true` when the text is copied. After copying, `copied` is `true` for
`copiedDuration` milliseconds, 2 seconds by default, which is handy for showing "Copied".
`supported` tells whether copying works in this browser.

<Example name="composables/Clipboard" />

## Signature

<SignatureReference
  :names="['useClipboard', 'ClipboardOptions', 'ClipboardControl', 'ClipboardPayload']"
/>

## Behaviour

`copyRich({ text, html })` puts both text and HTML on the clipboard. A document or spreadsheet
editor pastes the markup, a plain input pastes the text. This is how
[Table](/en/components/table/editing) copies selected cells.

`copy` also takes a promise of the text. The request for the text runs after the click, and Safari
still allows the clipboard write.

When the browser does not accept HTML, only the text is copied. On the server `supported` is
`false` and `copy` resolves to `false`.
