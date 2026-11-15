# Date picker

A date field with a calendar.

<Example name="date-picker/Basic" />

The model holds the date as a `YYYY-MM-DD` string.

## Installation

```ts install
import { NuiDatePicker } from '@numior/vue';
```

## Usage

Open the calendar and change the size, the side it opens on and the states of the field.

<Configurator name="NuiDatePicker" />

## Examples

### Pick a date and a time

Add `time`.

<Example name="date-picker/Time" />

Picking a day keeps the calendar open, so the time can be set right away. The model then holds a
string such as `2026-09-29T14:30`.

### Open the calendar on click

Add `openOnClick`.

<Example name="date-picker/OpenOnClick" />

The caret stays in the field, so the date can still be typed.

## Behavior

- An empty field shows the date pattern of the app language, such as `MM/DD/YYYY`. The field
  adds the separators itself.
- A digit that cannot start a day or a month gets a leading zero: 4 becomes 04.
- A date typed as `2026-10-05` is accepted in any language.
- When the field loses the focus with text that is not a date, the previous value comes back.
- A date before `min`, after `max` or rejected by `isDateDisabled` is accepted neither from the
  keyboard nor in the calendar.

<KeyboardReference name="NuiDatePicker" />

## API

<ApiReference name="NuiDatePicker" />
