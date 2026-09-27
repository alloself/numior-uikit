# useClipboard

`useClipboard(options)` copies text through the Clipboard API with an `execCommand` fallback
for old browsers. `copy(text)` resolves to `true` on success, `copied` stays on for
`copiedDuration` milliseconds, `supported` tells whether copying is available.

<Example name="composables/Clipboard" />

## Signature

<SignatureReference :names="['useClipboard', 'ClipboardOptions', 'ClipboardControl']" />

## Behaviour

On the server `supported` is `false` and `copy` does nothing. The [Code](/en/components/code)
buttons and the copy actions of these docs are built on this composable.
