# Radio group

`NuiRadioGroup` is a group of radio buttons for picking one option out of a few: a plan, a
delivery method, a warehouse. For a long list of options a [Select](/en/components/select)
works better.

<Example name="radio-group/Basic" />

Every `NuiRadio` gets its own `value`, and the chosen one lives in the `v-model` of the group.
`label` and `description` give the group a label and a hint, as in other fields.

## Installation

```ts
import { NuiRadio, NuiRadioGroup } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/radio.css';
```

## Usage

Lay the options out in a row and change the size and the states of the group.

<Configurator name="NuiRadioGroup" />

## Examples

### In a row

`orientation="horizontal"` puts the radios in one row; by default they stack in a column.
`size` picks the size: `sm`, `md` or `lg`.

<Example name="radio-group/Horizontal" />

### Objects as values

`value` can be an object, and the model gets that same object. A radio is checked when its
`value` is the very object in the model, not a copy with the same fields.

<Example name="radio-group/Objects" />

## Accessibility

The radios are native: arrow keys move the choice, and a form submits the value under the shared
`name`. The label, description and error of the group are linked to it, and a screen reader
reads them on entering the group.

`disabled` on the group turns off every radio, and on a single `NuiRadio` only that one.

<KeyboardReference name="NuiRadioGroup" />

## API

<ApiReference :names="['NuiRadioGroup', 'NuiRadio']" />
