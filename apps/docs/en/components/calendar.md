# Calendar

`NuiCalendar` renders one or more months as a `role="grid"` and works with strings: a date
`YYYY-MM-DD`, a set of dates `string[]` or a range `{ start, end }`. The `mode` prop picks
`single`, `multiple` or `range` and the value lives in a single `v-model`. Week start, day
and month labels, digits and date formats come from the locale through `Intl`; the locale
arrives from `createNuiConfig({ locale })`, `provideNuiConfig` or the `locale` prop.

<script setup>
import { ref } from 'vue'
const date = ref('2026-09-24')
const dates = ref(['2026-09-03', '2026-09-10'])
const range = ref({ start: null, end: null })
const presets = [
  { label: 'Today', range: (today) => ({ start: today, end: today }) },
  { label: 'This week', range: { start: '2026-09-21', end: '2026-09-27' } },
]
const weekend = (value) => ['6', '0'].includes(String(new Date(`${value}T00:00:00Z`).getUTCDay()))
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiCalendar locale="en-US" v-model="date" today="2026-09-24" week-numbers min="2026-09-02" :is-date-disabled="weekend" />
  <NuiCalendar locale="en-US" v-model="dates" mode="multiple" size="sm" today="2026-09-24" />
  <NuiCalendar locale="en-US" v-model="range" mode="range" :months="2" :presets="presets" today="2026-09-24" />
</div>

```vue
<NuiCalendar v-model="date" week-numbers :min="today" :is-date-disabled="isHoliday" />
<NuiCalendar v-model="range" mode="range" :months="2" :presets="presets" />
```

## Behaviour

A click selects a day; `multiple` toggles it and `range` opens a range on the first click
and closes it on the second (reversed ends are swapped), previews the range on hover and
lets a pointer drag pick both ends at once. `presets` appear only in `range` and carry
`aria-pressed` while the value matches. The Today button selects today in `single` and only
moves the view in the other modes. The month and year titles open month and year grids;
Escape returns to the days. Dates outside `min`/`max` or rejected by `isDateDisabled` stay
focusable but cannot be picked. External `v-model` changes move the tab stop and the shown
month without stealing focus.

Today comes from the `today` prop or, without it, from the local clock only after mount, so
server markup never depends on the server's time zone. The month is controlled through
`v-model:month` (`YYYY-MM`).

## Keyboard

Arrows move the focus between days, Home/End go to the start and end of the week,
PageUp/PageDown move by a month and with Shift by a year, shifting the view when the target
leaves the visible months. Enter and Space pick. In the month and year grids the arrows walk
the cells, PageUp/PageDown page a year or twelve years and Escape closes the grid. In RTL the
horizontal arrows swap.

## Accessibility

Each month is a `section` labelled by its caption, the grid is a `table role="grid"`, days
are `button`s inside `gridcell`s with the full date as `aria-label`, `aria-selected` on the
cells, `aria-disabled` on closed days and `aria-current="date"` on today. The single tab stop
is deterministic already on the server.

## API

| Prop              | Type                                         | Default                                 | Description                                          |
| ----------------- | -------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `v-model`         | `string \| string[] \| NuiDateRange \| null` | `null`                                  | Value per `mode`                                     |
| `v-model:month`   | `string`                                     | month of value                          | Shown month `YYYY-MM`                                |
| `mode`            | `'single' \| 'multiple' \| 'range'`          | `'single'`                              | Selection mode                                       |
| `locale`          | `string`                                     | from config                             | Locale for labels and formats                        |
| `weekStart`       | `1…7`                                        | from locale                             | First day of the week (ISO)                          |
| `min` / `max`     | `string`                                     | —                                       | Selection bounds                                     |
| `isDateDisabled`  | `(date: string) => boolean`                  | —                                       | Closed dates                                         |
| `months`          | `number`                                     | `1`                                     | Months to show                                       |
| `weekNumbers`     | `boolean`                                    | `false`                                 | ISO week number column                               |
| `fixedWeeks`      | `boolean`                                    | `true`                                  | Always six rows                                      |
| `showOutsideDays` | `boolean`                                    | `true`                                  | Days of the neighbouring months                      |
| `showToday`       | `boolean`                                    | `true`                                  | Today button                                         |
| `today`           | `string`                                     | local date                              | Today as `YYYY-MM-DD`                                |
| `presets`         | `NuiDatePreset[]`                            | —                                       | Range presets                                        |
| `size`            | `'sm' \| 'md' \| 'lg'`                       | `'md'`                                  | Cell size                                            |
| `disabled`        | `boolean`                                    | `false`                                 | Whole calendar inert                                 |
| `*Label`          | `string`                                     | [dictionary](/en/localization#calendar) | `previous`, `next`, `month`, `year`, `today`, `week` |

Slot `actions` in the footer. Method `focus(date?)` through a ref. Block `nui-calendar`
(modifiers `--size-*`, `--mode-*`, `--view-*`, `--week-numbers`, `--multi`, `--picking`,
`--presets`, `--disabled`; elements `__months`, `__month`, `__caption`, `__nav`, `__title`,
`__title-button`, `__grid`, `__weekday`, `__week`, `__row`, `__cell` with `--range-start`,
`--range-end`, `--range-middle`, `--preview`, `__day` with `--selected`, `--today`,
`--outside`, `--disabled`, `__picker`, `__option`, `__presets`, `__preset`, `__footer`,
`__today`, `__actions`; variables `--_cell`, `--_radius`, `--_selected-bg`, `--_selected-fg`,
`--_range-bg`, `--_range-fg`).
