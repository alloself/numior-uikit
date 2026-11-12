# useColorScheme

`useColorScheme` keeps the theme the user picked and sets it in the `data-nui-theme`
attribute. Use it for a theme switcher.

Without arguments the composable returns the theme from `createNuiConfig({ colorScheme })`, one
for the whole app. With arguments it creates a separate theme for the `scope` element. When
`storageKey` is set, the choice is saved in `localStorage`.

Nothing is written to the storage until the user changes the theme. The default `system` theme
follows the system setting.

<Example name="guide/Scheme" />

## Signature

<SignatureReference :names="['useColorScheme', 'ColorSchemeOptions', 'ColorSchemeControl', 'colorSchemeScript']" />

## Behaviour

`scheme` is the user's choice: `light`, `dark` or `system`. `resolved` is the theme on screen,
`systemDark` tells whether the system uses the dark theme. `set`, `toggle` and `cycle` change the
choice.

The composable starts after the component mounts, so you do not call `start()`. On the server
the attribute is not changed.

Add `colorSchemeScript(storageKey, initial?)` to `<head>` so the saved theme applies before the
first paint. `initial` is the theme for a first visit, when nothing is saved yet, see
[Theming](/en/guide/theming).
