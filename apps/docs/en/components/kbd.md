# Kbd

A key or a key combination inside text.

<Example name="kbd/Basic" />

Write the combination the way [`useHotkey`](/en/composables/hotkey) takes it: `mod+k` shows ⌘ K
on Mac and Ctrl K on Windows and Linux.

## Installation

```ts install
import { NuiKbd } from '@numior/vue';
```

## Usage

Change the combination and the look of the keys.

<Configurator name="NuiKbd" />

## Examples

### Set the platform

Pass `platform` when the server knows the user's system.

<Example name="kbd/Platform" />

Without it, modifiers show as Ctrl, Alt and Shift until the page loads in the browser.

### Show a sequence of keys

Pass an array to `keys`.

<Example name="kbd/Several" />

## Key notation

| In `keys`                                         | On screen  |
| ------------------------------------------------- | ---------- |
| `arrowup`, `arrowdown`, `arrowleft`, `arrowright` | ↑, ↓, ←, → |
| `enter`                                           | ↵          |
| `backspace`                                       | ⌫          |
| `delete`                                          | ⌦          |
| `tab`                                             | ⇥          |
| `escape`                                          | Esc        |
| `k`                                               | K          |
| `home`                                            | Home       |

Leave `keys` out and put text that is not a key, such as "Scroll wheel", into the default slot.

## Accessibility

Every key is a native `<kbd>` element. Symbols such as ⌘ and ⌫ carry no text label, so say the
action in words next to the keys: "Press ⌘ K to find an order".

## API

<ApiReference name="NuiKbd" />
