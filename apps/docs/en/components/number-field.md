# Number field

`NuiNumberField` holds `number | null` and shows the number in the locale format: separators,
currency, percent. While the field is focused the text stays as the user typed it.

<Example name="number-field/Basic" />

## Installation

```ts
import { NuiNumberField } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/number-field.css';
```

## Usage

<Configurator name="NuiNumberField" />

## Examples

### Bounds and step

On blur or Enter the value is parsed, clamped between `min` and `max` and snapped to the step
grid. `steppers="false"` removes the plus and minus buttons.

<Example name="number-field/Bounds" />

### Locale

The locale comes from the app configuration, `locale` changes it for one field. Parsing
accepts local and ASCII digits, the locale's decimal separator and a minus in any form.

<Example name="number-field/Locale" />

## Accessibility

The only accessible element is `<input role="spinbutton" inputmode="decimal">` with
`aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext` in the locale format.
The steppers are hidden from assistive technology and never take the focus. On iOS the
`decimal` keyboard has no minus sign: pass `inputmode="text"` for negative values.

<KeyboardReference name="NuiNumberField" />

## API

<ApiReference name="NuiNumberField" />
