# Calendar

`NuiCalendar` is an inline calendar for picking one date, several dates or a range. For a field
with a calendar in a pop-up use a [Date picker](/en/components/date-picker).

<Example name="calendar/Basic" />

## Installation

```ts
import { NuiCalendar } from '@numior/vue';
import '@numior/vue/styles/calendar.css';
```

## Examples

### Several dates

With `mode="multiple"` every click adds a day to the selection or removes it. `v-model` holds an
array of dates. The `sm` size suits narrow panels.

<Example name="calendar/Multiple" />

### A range with presets

With `mode="range"` the first click sets the start of the range and the second the end. A range
can also be dragged with the mouse. `v-model` holds a `{ start, end }` object.

<Example name="calendar/Range" />

The `presets` prop adds buttons with ready-made ranges such as "Last 7 days" on the side. The
button of the currently selected range is highlighted. The `months` prop shows several months
side by side.

## Behaviour

Dates are passed as `YYYY-MM-DD` strings, such as `2026-09-27`. Month and weekday names and the
first day of the week come from the app language; `locale` and `weekStart` override them.

Dates before `min`, after `max` and those for which `isDateDisabled` returns `true` cannot be
picked. A click on the month name or the year opens a list of months or years.

The calendar takes today's date from the browser clock. With server rendering pass it in
`today`, otherwise today is highlighted only after the page loads.

## Accessibility

Days of the month are buttons, and a screen reader announces the full date: "Sunday, September
27, 2026". It also tells which days are selected and which one is today. Arrow keys move between
days.

<KeyboardReference name="NuiCalendar" />

## API

<ApiReference name="NuiCalendar" />
