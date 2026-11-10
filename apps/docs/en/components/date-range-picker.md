# Date range picker

`NuiDateRangePicker` is a field for a period: the start and end dates sit side by side in one
frame. The calendar shows two months at once. The model is a `{ start, end }`
object where each date is a `YYYY-MM-DD` string or `null`.

<Example name="date-range-picker/Basic" />

## Installation

```ts
import { NuiDateRangePicker } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/calendar.css';
import '@numior/vue/styles/date-picker.css';
```

## Behaviour

Both dates are typed the same way as in [Date picker](/en/components/date-picker). When the end
comes before the start, the field swaps them once focus leaves the date or Enter is pressed. With `openOnClick`, a click on either date opens the
calendar.

In the calendar the first click picks the start, the second picks the end and closes the
calendar. A ready-made range from `presets`, such as "Last 7 days", takes one click. A date before
`min` or after `max` does not reach the model.

The clear button from `clearable` resets both dates. Set `startName` and `endName` to submit the
start and the end as separate form fields.

## Accessibility

The `label` text names the start date. Screen readers announce the end field as "End date", and
the `endLabel` prop changes that text. The description and the error are read out for both dates.

<KeyboardReference name="NuiDateRangePicker" />

## API

<ApiReference name="NuiDateRangePicker" />
