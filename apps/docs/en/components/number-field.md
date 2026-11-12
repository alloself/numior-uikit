# Number field

A number input formatted for the locale, with a currency and a step.

<Example name="number-field/Basic" />

Describe the format in `formatOptions`, as for `Intl.NumberFormat`. A typed number reaches the
model when the user leaves the field or presses Enter.

## Installation

```ts
import { NuiNumberField } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/number-field.css';
```

## Usage

Change the bounds, the step and the buttons of the field.

<Configurator name="NuiNumberField" />

## Examples

### Limit the range

Set `min`, `max` and `step`.

<Example name="number-field/Bounds" />

A number outside the range turns into the nearest bound when the user leaves the field.

### Show the number in another format

Pass `locale` to the field.

<Example name="number-field/Locale" />

A field without `locale` follows the [app language](/en/guide/localization).

## Accessibility

The field has the `spinbutton` role, so a screen reader announces the value with the minimum and
the maximum. The plus and minus buttons are hidden from it and never take focus: the arrow keys do
the same.

On iOS the decimal keypad has no minus sign, so pass `inputmode="text"` for negative numbers.

<KeyboardReference name="NuiNumberField" />

## API

<ApiReference name="NuiNumberField" />
