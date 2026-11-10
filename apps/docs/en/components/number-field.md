# Number field

`NuiNumberField` is a field for numbers: prices, quantities, percent discounts. The number is
shown with the separators and the currency sign of the locale, and the model gets a `number`
or `null`.

<Example name="number-field/Basic" />

The format comes from `formatOptions`, the same options as in `Intl.NumberFormat`: currency,
percent, the number of fraction digits. While the field is focused, the text stays as the user
typed it.

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

The `min` and `max` props set the allowed range. `step` sets how much the arrow keys and the
plus and minus buttons change the number. On blur or Enter the typed number is brought back
into the range and rounded to the precision of `step`.

A value that was not edited in the field stays in the model as it was. That holds even when it
is more precise than the format or out of range.

`:steppers="false"` removes the buttons. In a `readonly` field neither the buttons nor the keys
change the value.

<Example name="number-field/Bounds" />

### Locale

The number format follows the app language, and the `locale` prop sets it for a single field.
Typing accepts plain digits and the digits of the locale, its decimal separator and a minus
sign in any form.

<Example name="number-field/Locale" />

## Accessibility

The field has the `spinbutton` role: a screen reader announces the value, the minimum and the
maximum in the locale format. The plus and minus buttons are hidden from screen readers and
never take focus; on the keyboard the arrow keys do their job.

On iOS the `inputmode="decimal"` keypad has no minus sign. Pass `inputmode="text"` for negative
numbers.

<KeyboardReference name="NuiNumberField" />

## API

<ApiReference name="NuiNumberField" />
