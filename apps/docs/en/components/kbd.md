# Kbd

`NuiKbd` shows a key or a key combination in a hint, a menu or a button. Combinations use the same
notation as `useHotkey`: `mod+k` looks like ⌘ K on a Mac and like Ctrl K on Windows and Linux.

<Example name="kbd/Basic" />

`variant="plain"` renders the key as plain text without a frame.

## Installation

```ts
import { NuiKbd } from '@numior/vue';
import '@numior/vue/styles/kbd.css';
```

## Usage

<Configurator name="NuiKbd" />

## Examples

### Platform

The `platform` prop, `mac` or `other`, sets how modifiers look: ⌘ ⌥ ⇧ or Ctrl, Alt and Shift.
Without it, the platform is detected in the browser after the page loads. On the server and
until then, Ctrl, Alt and Shift are shown.

<Example name="kbd/Platform" />

## Behaviour

Arrows, Enter, Backspace, Delete and Tab render as symbols: ↑, ↵, ⌫, ⌦, ⇥. Letters are shown in
upper case and key names are capitalized, so `escape` becomes Esc.

Pass an array to `keys` to show several combinations in a row. Put text that is not a key, such as
"Middle mouse button", into the default slot.

## Accessibility

Screen readers read the symbols by their Unicode names, such as "upwards arrow". So describe the
action in words next to the combination: "Press ⌘ K to search".

## API

<ApiReference name="NuiKbd" />
