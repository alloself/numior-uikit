# Calendar

A calendar for one date, several dates or a period.

<Example name="calendar/Basic" />

For a field that opens a calendar in a popover, use a [Date picker](/en/components/date-picker).

## Installation

```ts
import { NuiCalendar } from '@numior/kit';
```

## Usage

Show several months side by side, turn on week numbers and change the cell size.

<Configurator name="NuiCalendar" />

## Examples

### Pick several dates

Set `mode="multiple"`.

<Example name="calendar/Multiple" />

### Pick a period

Set `mode="range"` and add ready-made periods in `presets`.

<Example name="calendar/Range" />

Drag across the days to pick a period in one move, and set `months` to show several months side
by side.

## Behavior

Dates are `YYYY-MM-DD` strings, such as `2026-09-27`. Month and weekday names and the first day
of the week follow the app language; `locale` and `weekStart` change them.

Dates before `min`, after `max` and those for which `isDateDisabled` returns `true` cannot be
picked. A click on the month or the year opens a list of months or years.

The calendar takes today's date from the browser clock once the page loads. With server
rendering, pass `today` to highlight it from the first frame. Without `today` or a selected date
the server draws the UTC month, so a page cached for over a day needs `today` or `month`.

## Accessibility

Days of the month are buttons, and a screen reader announces the full date, such as "Sunday,
September 27, 2026". It also says which days are selected and which one is today. The arrow keys
move between the days.

<KeyboardReference name="NuiCalendar" />

## API

<ApiReference name="NuiCalendar" />
