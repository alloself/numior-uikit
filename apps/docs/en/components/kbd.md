# Kbd

`NuiKbd` shows a key or a combo in the same notation as `useHotkey`: `mod+k` becomes ⌘ K on
Mac and Ctrl K everywhere else. Arrows, Enter and Backspace render as glyphs.

<Example name="kbd/Basic" />

## Installation

```ts
import { NuiKbd } from '@numior/vue';
import '@numior/vue/styles/kbd.css';
```

## Usage

<Configurator name="NuiKbd" />

## Examples

### Platform

`platform` pins the modifier glyphs. Without the prop the platform is detected after mounting,
and the server and the pre-hydration frame show Ctrl, Alt and Shift.

<Example name="kbd/Platform" />

## Behaviour

Single letters render in upper case, key names from the hotkey notation are capitalised
(`escape` → Esc, `enter` → ↵). A list in `keys` draws every combo in a row; the slot suits
text that the notation lacks.

## Accessibility

The component renders native `<kbd>` elements: an outer one for the combo and nested ones per
key. A screen reader reads the glyphs by their Unicode names, so spell out the action next to
a combo in hints.

## API

<ApiReference name="NuiKbd" />
