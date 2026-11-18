# Menu

A dropdown menu of actions behind a button.

<Example name="menu/Basic" />

Put the button into the `trigger` slot and bind the slot's `attrs` to it. Build the menu from these
parts:

- `NuiMenuItem` runs an action or opens a link.
- `NuiMenuCheckboxItem` turns an option on and off.
- `NuiMenuRadioGroup` with `NuiMenuRadioItem` picks one option of several.
- `NuiMenuSub` opens a nested menu.
- `NuiMenuLabel` names a group of items.
- `NuiMenuSeparator` draws a line between groups.

## Installation

```ts
import { NuiMenu, NuiMenuItem } from '@numior/kit';
```

## Usage

Open the menu and change its side, its distance from the button and closing after a choice.

<Configurator name="NuiMenu" />

## Examples

### Describe a menu with an array

Pass the items in `items`.

<Example name="menu/Items" />

Each entry is an object, and its `type` field sets the kind of the entry:

| `type`         | Entry                  | Fields                                                        |
| -------------- | ---------------------- | ------------------------------------------------------------- |
| none or `item` | An action or a link    | `label`, `icon`, `shortcut`, `tone`, `href`, `to`, `onSelect` |
| `checkbox`     | An option with a check | `label`, `icon`, `checked`, `onCheckedChange`                 |
| `radio-group`  | A choice of one option | `value`, `items`, `onChange`                                  |
| `sub`          | A nested menu          | `label`, `icon`, `items`                                      |
| `label`        | A group heading        | `label`                                                       |
| `separator`    | A line between groups  | none                                                          |

## Behavior

- A click on the button opens the menu with no item highlighted. ArrowDown then goes to the first
  item and ArrowUp to the last one.
- Enter, Space or ArrowDown on the button open the menu at the first item, and ArrowUp at the
  last one.
- The pointer highlights the item under it without the focus ring, which comes back with the
  first key press.
- Choosing an item closes the menu, and `:close-on-select="false"` keeps it open. A checkbox item
  keeps the menu open by default, so the user can check several options.
- A nested menu opens on hover after a short delay, or with Enter or ArrowRight. A click outside
  closes every level at once.

## Accessibility

A screen reader announces that the button opens a menu and whether the menu is open. Checkbox
and radio items are announced as checked or not checked.

When the menu closes from the keyboard, the focus returns to the button. Arrow keys skip disabled
items, and an item with `href` or `to` is a link.

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
