# Radio group

`NuiRadioGroup` joins native `<input type="radio">` elements with a shared `name`: arrow keys,
single choice and form participation work without JavaScript. Every `NuiRadio` declares its
`value`.

<Example name="radio-group/Basic" />

## Installation

```ts
import { NuiRadio, NuiRadioGroup } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/radio.css';
```

## Examples

### In a row

`orientation="horizontal"` lays the radios out in a row, `size` changes the step.

<Example name="radio-group/Horizontal" />

### Object values

The model takes any type: the `value` of a radio is compared with the model by reference.

<Example name="radio-group/Objects" />

## Accessibility

The group is a `fieldset` with a `legend` and `role="radiogroup"`; the description and the
error are linked through `aria-describedby`. `disabled` on the group switches every radio off,
`disabled` on one `NuiRadio` only that one.

<KeyboardReference name="NuiRadioGroup" />

## API

<ApiReference :names="['NuiRadioGroup', 'NuiRadio']" />
