# Calendar

`NuiCalendar` shows one or more months as a `role="grid"`. It works with strings: a
`YYYY-MM-DD` date, a set of dates or a `{ start, end }` range. `mode` sets the mode, the value
lives in one `v-model`, the labels and the week start come from the locale.

<Example name="calendar/Basic" />

## Installation

```ts
import { NuiCalendar } from '@numior/vue';
import '@numior/vue/styles/calendar.css';
```

## Examples

### Several dates

`mode="multiple"` toggles days on click; `size="sm"` suits compact panels.

<Example name="calendar/Multiple" />

### A range with presets

In `range` the first click opens the range, the second closes it, and dragging selects both ends
at once. `presets` show ready-made ranges and highlight the matching one.

<Example name="calendar/Range" />

## Behaviour

Dates outside `min` and `max` and those rejected by `isDateDisabled` stay focusable but cannot
be selected. The month and year heading opens the month and year grids. Today comes from
`today`, or from the clock only after mounting, so the server markup does not depend on the
server time zone.

## Accessibility

Every month is a labelled `section`, the grid a `table role="grid"`. The days are buttons
inside `gridcell` elements with the full date in `aria-label`; the cells carry `aria-selected`
and today `aria-current="date"`. One tab stop is deterministic on the server already.

<KeyboardReference name="NuiCalendar" />

## API

<ApiReference name="NuiCalendar" />
