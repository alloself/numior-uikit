# Date picker

`NuiDatePicker` is a field with a text input for a date and a button that opens the
[calendar](/en/components/calendar) in a non-modal dialog. The model is a `YYYY-MM-DD`
string (`YYYY-MM-DDTHH:mm` with `time`), the text follows the locale's numeric pattern
(`24.09.2026`, `09/24/2026`, `2026/09/24`) and ISO is always accepted.

<script setup>
import { ref } from 'vue'
const trip = ref('2026-09-24')
const meeting = ref('2026-09-24T09:30')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Trip date" description="Type or pick in the calendar">
    <NuiDatePicker locale="en-US" v-model="trip" clearable today="2026-09-24" />
  </NuiField>
  <NuiField label="Meeting" description="Date and time">
    <NuiDatePicker locale="en-US" v-model="meeting" time :time-step="30" today="2026-09-24" />
  </NuiField>
</div>

```vue
<NuiField label="Trip date">
  <NuiDatePicker v-model="trip" clearable :min="today" />
</NuiField>
<NuiField label="Meeting">
  <NuiDatePicker v-model="meeting" time :time-step="30" />
</NuiField>
```

## Behaviour

The text is parsed while typing: a complete date in the locale format or ISO reaches the
model immediately, partial input leaves the model alone and invalid text rolls back to the
current value on blur. An empty field yields `null`. The calendar opens from the button or
ArrowDown in the field, focuses the selected day, and picking a day writes the model, closes
the dialog and returns focus to the field. Escape and focus leaving close the dialog.
`clearable` adds a clear button and `name` a hidden input with the ISO value for forms.

With `time` a [time field](/en/components/time-field) appears under the calendar: picking a
day keeps the dialog open, the time is edited through segments or in the text after the
date (`HH:mm`), and Enter in the time field closes the dialog.

## API

| Prop          | Type                | Default                                                  | Description                                          |
| ------------- | ------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| `v-model`     | `string \| null`    | `null`                                                   | Date `YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` with `time` |
| `time`        | `boolean`           | `false`                                                  | Date and time                                        |
| `timeStep`    | `number`            | `15`                                                     | Step of the time suggestions in minutes              |
| `placeholder` | `string`            | locale pattern                                           | Field placeholder                                    |
| `clearable`   | `boolean`           | `false`                                                  | Clear button                                         |
| `readonly`    | `boolean`           | `false`                                                  | Read-only                                            |
| `name`        | `string`            | —                                                        | Hidden input for forms                               |
| `placement`   | `FloatingPlacement` | `'bottom-start'`                                         | Dialog side                                          |
| `openLabel`   | `string`            | [dictionary](/en/localization#datepicker): “Choose date” | Name of the calendar button                          |
| `clearLabel`  | `string`            | [dictionary](/en/localization#datepicker): “Clear”       | Name of the clear button                             |
| `dialogLabel` | `string`            | [dictionary](/en/localization#datepicker): “Calendar”    | Dialog name outside a `NuiField`                     |
| `timeLabel`   | `string`            | [dictionary](/en/localization#timefield): “Choose time”  | Name of the clock button                             |

Plus `id`, `size`, `disabled`, `required`, `invalid` like every field control and the
calendar props `locale`, `weekStart`, `min`, `max`, `isDateDisabled`, `weekNumbers`,
`months`, `today`, `todayLabel`, `previousLabel`, `nextLabel`, `monthLabel`, `yearLabel`,
`weekLabel`. The `actions` slot lands in the calendar footer; `focus()`, `open()` and
`close()` are exposed through a ref. Block `nui-date-picker` (modifiers `--size-*`, `--open`,
`--invalid`, `--disabled`, `--readonly`, `--clearable`; elements `__input`, `__clear`,
`__open`, `__panel`, `__time`).
