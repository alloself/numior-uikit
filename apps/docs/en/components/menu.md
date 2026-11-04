# Menu

`NuiMenu` is a dropdown menu of actions that opens from a button: "New document", "Duplicate",
"Delete". Put the button into the `trigger` slot and the items inside the menu.

<Example name="menu/Basic" />

A regular item is `NuiMenuItem`, an item with a checkbox is `NuiMenuCheckboxItem`, and a choice of
one option is `NuiMenuRadioGroup` with `NuiMenuRadioItem`. `NuiMenuSub` adds a nested menu,
`NuiMenuLabel` a group heading and `NuiMenuSeparator` a line between groups.

## Installation

```ts
import { NuiMenu, NuiMenuItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/menu.css';
```

## Examples

### Menu from an array

The same menu can be described with the `items` array. A regular item is a
`{ label, icon, shortcut, tone, onSelect }` entry, the others are entries with a `type` field:
`checkbox`, `radio-group`, `separator`, `label` or `sub`.

<Example name="menu/Items" />

## Behaviour

A click on the button opens the menu. When it is opened from the keyboard, the focus goes straight
to the first item, or to the last one when opened with ArrowUp. Hovering an item with the mouse
moves the focus to it.

Choosing an item closes the menu, and `:close-on-select="false"` keeps it open. A checkbox item
keeps the menu open by default, so several options can be checked.

A nested menu opens on hover after a short delay, or with Enter or ArrowRight from the keyboard.
A click outside closes all levels at once, and the focus returns to the button.

## Accessibility

Screen readers announce that the button opens a menu and whether it is open. Checkbox and radio
items are announced as checked or not checked.

An item with `href` or `to` works as a link. A disabled item stays in the menu and takes the focus
so it can be read, but it cannot be chosen.

<KeyboardReference name="NuiMenu" />

## API

<ApiReference
  :names="[
    'NuiMenu',
    'NuiMenuItem',
    'NuiMenuCheckboxItem',
    'NuiMenuRadioGroup',
    'NuiMenuRadioItem',
    'NuiMenuLabel',
    'NuiMenuSeparator',
    'NuiMenuSub',
  ]"
/>
