# Date picker

`NuiDatePicker` is a date field: the date can be typed or picked in
[Calendar](/en/components/calendar), which opens from a button inside the field. The model holds
the date as a `YYYY-MM-DD` string.

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

The `time` prop adds a [Time field](/en/components/time-field) under the calendar, and the model
receives a string such as `2026-09-29T10:30`. Picking a day keeps the calendar open so the time
can be set too. `timeStep` sets the minute step, 15 by default.

<Example name="date-picker/Time" />

### Opening on click

With `openOnClick`, a click on the field opens the calendar, as in a dropdown. The caret stays in
the field, so the date can still be typed, and ArrowDown moves the focus into the calendar.

<Example name="date-picker/OpenOnClick" />

## Behaviour

An empty field shows the date pattern of the page language, for example `MM/DD/YYYY`. The field
inserts separators itself and ignores letters. A digit that cannot start a day or a month gets a
leading zero: 4 becomes 04.

A complete date goes to the model as soon as it is typed, a partial one leaves the model alone.
If the text is not a date when the field loses focus, the previous value comes back. A date in
the `2026-10-05` form is accepted in any language.

A date before `min`, after `max` or rejected by `isDateDisabled` is accepted neither from the
keyboard nor in the calendar. Picking a day closes the calendar and returns the focus to the
field. Set `name` to submit the date with a form in the `YYYY-MM-DD` format.

<KeyboardReference name="NuiDatePicker" />

## API

<ApiReference name="NuiDatePicker" />
