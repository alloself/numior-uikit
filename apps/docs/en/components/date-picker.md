# Date picker

`NuiDatePicker` is a field with typed date input and a button that opens
[Calendar](/en/components/calendar) in a non-modal dialog. The model is a `YYYY-MM-DD` string,
the field text follows the locale format, and ISO is always accepted.

<Example name="date-picker/Basic" />

## Installation

```ts
import { NuiDatePicker } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/calendar.css';
import '@numior/vue/styles/date-picker.css';
```

## Examples

### Date and time

`time` adds a [Time field](/en/components/time-field) under the calendar: picking a day keeps
the dialog open, and the model becomes `YYYY-MM-DDTHH:mm`.

<Example name="date-picker/Time" />

### Opening on click

`openOnClick` opens the calendar on a click in the field, like a select. The focus stays in the
field, so a date can still be typed, and ArrowDown moves the focus into the calendar.

<Example name="date-picker/OpenOnClick" />

## Behaviour

The field keeps the locale format as a mask. Separators appear by themselves, a digit inside a
full date replaces a character, and letters stay out. A first digit that cannot start a day, a
month or an hour gets a leading zero: 4 becomes 04.

The text is parsed as you type: a full date lands in the model at once, partial input leaves
the model alone. Invalid text rolls back on blur. Picking a day writes the model, closes the
dialog and returns the focus to the field.

`name` adds a hidden input with the ISO value. A typed date outside `min` and `max` or rejected
by `isDateDisabled` never reaches the model and rolls back on blur.

<KeyboardReference name="NuiDatePicker" />

## API

<ApiReference name="NuiDatePicker" />
