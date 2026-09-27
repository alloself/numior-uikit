# useHotkey

`useHotkey(combo, handler, options)` calls the handler on a key combo in the `mod+shift+u`
notation. `mod` is Ctrl or ⌘; letters and digits are matched by the physical key, so the
combo works on any layout. The listener lives as long as the component.

<Example name="composables/Hotkey" />

## Signature

<SignatureReference :names="['useHotkey', 'HotkeyOptions', 'parseHotkey', 'Hotkey']" />

## Behaviour

`enabled` switches the combo off, `target` attaches the listener elsewhere than the window,
`preventDefault` cancels the browser action. Combos without Ctrl and Meta stay silent inside
inputs by default; `inEditable: true` enables them there too. `parseHotkey` parses the
notation into a `Hotkey` object, the same format [Kbd](/components/kbd) reads.
