# Radio group

A choice of one option from a few that are all in view.

<Example name="radio-group/Basic" />

Give every `NuiRadio` a `value`, and the `v-model` of the group holds the value of the checked
one.

## Installation

```ts install
import { NuiRadio, NuiRadioGroup } from '@numior/vue';
```

## Usage

Lay the radios out in a row and change the size and the states of the group.

<Configurator name="NuiRadioGroup" />

## Examples

### Keep an object in the model

Pass an object to `value`.

<Example name="radio-group/Objects" />

The group matches a radio to the model by the key of its value, which is the JSON of the object
by default. When the object comes back from the server with changed fields, return its id from
`getKey`.

## Accessibility

The radios are native, so the arrow keys move the choice and a form submits the value under the
shared `name`. A screen reader reads the label, the hint and the error of the group when the
focus enters it.

`disabled` on the group turns off every radio, and on a `NuiRadio` only that one.

<KeyboardReference name="NuiRadioGroup" />

## API

<ApiReference :names="['NuiRadioGroup', 'NuiRadio']" />
