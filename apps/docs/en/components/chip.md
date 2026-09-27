# Chip

`NuiChip` is a compact label on the role tokens: `tone` sets the colour, `variant` the look,
`size` the height. The same chip shows the selected values in `NuiCombobox`.

<Example name="chip/Basic" />

## Installation

```ts
import { NuiChip } from '@numior/vue';
import '@numior/vue/styles/chip.css';
```

## Usage

<Configurator name="NuiChip" />

## Examples

### Removable filters

`removable` adds a remove button with the `remove` event; `removeLabel` names what gets removed.

<Example name="chip/Removable" />

### Sizes and disabled chips

`size="sm"` suits tables and lists, `disabled` dims the chip and disables removal.

<Example name="chip/Sizes" />

## Accessibility

A chip is a `<span>` without a role and is not interactive on its own. The remove button is a
plain `<button>` outside the tab order, because in chip lists removal is reachable from the
field with the keyboard. For a standalone chip pass a `removeLabel` that names the item.

## API

<ApiReference name="NuiChip" />
