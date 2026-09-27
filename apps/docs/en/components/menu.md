# Menu

`NuiMenu` is a dropdown on a native `popover="auto"` with `role="menu"`. Items come from parts:
`NuiMenuItem`, `NuiMenuCheckboxItem`, `NuiMenuRadioGroup` with `NuiMenuRadioItem`,
`NuiMenuSeparator`, `NuiMenuLabel` and `NuiMenuSub`. The same set can be described as data
through `items`.

<Example name="menu/Basic" />

## Installation

```ts
import { NuiMenu, NuiMenuItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/menu.css';
```

## Examples

### An action menu from data

`items` takes entries `{ label, icon, shortcut, tone, onSelect }`, `{ type: 'checkbox' }`,
`{ type: 'radio-group' }`, `{ type: 'separator' }`, `{ type: 'label' }` and `{ type: 'sub' }`.
The entries render through the same parts.

<Example name="menu/Items" />

## Behaviour

A click opens the menu; a menu opened with the mouse focuses the container, one opened with the
keyboard the first or the last item. Hover moves the focus to an item. An item closes the menu
after being picked, `closeOnSelect="false"` keeps it open; a checkbox item does not close by
default.

A submenu opens on hover after a delay and on the arrow key on its item. A submenu is a nested
native popover: a click outside closes the whole chain, a click in the parent only the submenu.
On close the focus returns to the trigger.

## Accessibility

The trigger gets `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`. Items are native
buttons with `role="menuitem"`, `menuitemcheckbox` and `menuitemradio`; an item with `href` or
`to` is a `NuiLink` with the same role. Disabled items stay in the tree and take the focus but
do not fire.

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
