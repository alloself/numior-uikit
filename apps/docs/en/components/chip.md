# Chip

`NuiChip` is a label for a value the user has picked: a tag, a filter, an email recipient. A chip
can be removable. For a status or a counter use a [Badge](/en/components/badge).

<Example name="chip/Basic" />

## Installation

```ts
import { NuiChip } from '@numior/vue';
import '@numior/vue/styles/chip.css';
```

## Usage

The `tone` prop sets the colour, and `variant` the fill: `soft`, `outline` or `solid`. `icon`
puts an icon before the text.

<Configurator name="NuiChip" />

## Examples

### Removable filters

Add `removable` to show a button with a cross in the chip. Pressing it emits the `remove` event,
and your app removes the chip from the list.

<Example name="chip/Removable" />

### Sizes and disabled state

The `sm` size suits tables and lists, and `md` is the default. With `disabled` the chip fades and
its remove button cannot be pressed.

<Example name="chip/Sizes" />

## Accessibility

The remove button is labelled "Remove". When there are several chips, put the chip name into
`removeLabel`, such as "Remove the Vue filter". Then a screen reader tells the buttons apart.

The remove button can be reached with the Tab key, and `:remove-tabbable="false"` makes Tab skip
it. The [Combobox](/en/components/combobox) does this, because its chips are removed with the
keyboard right from the field.

## API

<ApiReference name="NuiChip" />
