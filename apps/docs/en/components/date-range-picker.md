# Date range picker

`NuiDateRangePicker` holds two date fields in one frame and opens
[Calendar](/en/components/calendar) in the `range` mode with two months and presets. The model is
`{ start, end }` with `YYYY-MM-DD` strings or `null`.

<Example name="date-range-picker/Basic" />

## Installation

```ts
import { NuiDateRangePicker } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/calendar.css';
import '@numior/vue/styles/date-picker.css';
```

## Behaviour

Each field keeps the mask and is parsed like in [Date picker](/en/components/date-picker); an end
before the start swaps them. `openOnClick` opens the calendar on a click in either field.

In the calendar the first click opens the range, the second closes it and the
dialog, a preset does the same with one press. The clear button resets both ends, `startName`
and `endName` add hidden form fields.

A typed date outside `min` and `max` never reaches the model.

## Accessibility

The field label sits on the start field, the end field is named through `endLabel`. The
description and the error are linked to both through `aria-describedby`.

<KeyboardReference name="NuiDateRangePicker" />

## API

<ApiReference name="NuiDateRangePicker" />
