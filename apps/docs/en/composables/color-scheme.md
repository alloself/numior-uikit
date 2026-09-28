# useColorScheme

`useColorScheme` drives the `data-nui-theme` attribute: it stores the `light`, `dark` or
`system` choice, follows the system scheme and writes changes to `localStorage`. Without
arguments it returns the shared scheme from `createNuiConfig({ colorScheme })`, with
arguments it creates its own for the `scope` area.

<Example name="guide/Scheme" />

## Signature

<SignatureReference :names="['useColorScheme', 'ColorSchemeOptions', 'ColorSchemeControl', 'colorSchemeScript']" />

## Behaviour

`scheme` holds the choice, `resolved` the actual scheme, `systemDark` the system state. `set`,
`toggle` and `cycle` change the choice; `start` runs automatically after mounting.

On the server the attribute is left alone. `colorSchemeScript(storageKey, initial?)` in
`<head>` applies the saved scheme before the first paint. The second argument sets the scheme
when the storage is empty, see [Theming](/en/guide/theming).
