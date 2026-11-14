# Date range picker

One field for the start and end dates of a period.

<Example name="date-range-picker/Basic" />

The model holds the period as a `{ start, end }` object, with each date a `YYYY-MM-DD` string or
`null`.

## Installation

```ts install
import { NuiDateRangePicker } from '@numior/vue';
```

## Usage

Pick a period and change the number of months, the size and the states of the field.

<Configurator name="NuiDateRangePicker" />

## Behavior

- Both dates are typed the same way as in a [Date picker](/en/components/date-picker).
- When the end comes before the start, the field swaps them once the focus leaves the date.
- In the calendar the first click picks the start, and the second picks the end and closes the
  calendar.
- The clear button from `clearable` resets both dates.

## Accessibility

The `label` text names the start date, and a screen reader announces the end date as "End date".
Change that text in `endLabel`. The hint and the error are read out for both dates.

<KeyboardReference name="NuiDateRangePicker" />

## API

<ApiReference name="NuiDateRangePicker" />
