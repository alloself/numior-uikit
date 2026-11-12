# useHotkey

`useHotkey(combo, handler, options)` calls `handler` when the user presses a key combination,
for example `mod+shift+u`. `mod` matches both Ctrl and ⌘.

Letters and digits are matched by the physical key, so Ctrl+K also works on a Russian layout. The
shortcut stops working when the component unmounts.

<Example name="composables/Hotkey" />

## Signature

<SignatureReference :names="['useHotkey', 'HotkeyOptions', 'parseHotkey', 'Hotkey']" />

## Behaviour

`enabled: false` turns the shortcut off, and `target` listens for keys on a given element
instead of the window. By default the browser action for the combination is canceled;
`preventDefault: false` keeps it.

Shortcuts without Ctrl or ⌘ do not fire while the user types in an input. `inEditable: true`
turns them on there too.

`parseHotkey` parses a combination into a `Hotkey` object. [Kbd](/en/components/kbd) reads the
same notation.
