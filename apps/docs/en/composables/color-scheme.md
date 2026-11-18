# useColorScheme

`useColorScheme` keeps the theme the user picked and sets it as the `nui-theme--light`,
`nui-theme--dark` or `nui-theme--system` class. Use it for a theme switcher.

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

The composable starts after the component mounts, so you do not call `start()`. It removes the
other two theme classes and leaves the rest of the element's classes alone. On the server the
class is not changed.

Until the component mounts, `scheme`, `resolved` and `systemDark` hold the server values. Markup
then hydrates without mismatches, even when another component already started the shared theme.

Add `colorSchemeScript(storageKey, initial?)` to `<head>` so the class of the saved theme lands on
`<html>` before the first paint. `initial` is the theme for a first visit, when nothing is saved yet, see
[Theming](/en/guide/theming).
