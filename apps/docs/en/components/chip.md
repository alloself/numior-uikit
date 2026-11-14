# Chip

A label for a picked value that the user can remove.

<Example name="chip/Basic" />

For a status or a count, use a [Badge](/en/components/badge).

## Installation

```ts install
import { NuiChip } from '@numior/vue';
```

## Usage

Change the tone, the fill and the size of the chip, or add a remove button.

<Configurator name="NuiChip" />

## Examples

### Remove a filter with a cross

Add `removable` and take the value out of your list in the `remove` handler.

<Example name="chip/Removable" />

## Accessibility

A screen reader reads every remove button as "Remove". Put the value into `removeLabel`, such as
"Remove the Boston filter", so the user can tell the buttons apart.

Tab reaches the remove button. Turn off `remove-tabbable` when chips sit in a field that removes
them with Backspace, as a [Combobox](/en/components/combobox) does.

## API

<ApiReference name="NuiChip" />
