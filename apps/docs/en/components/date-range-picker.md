# Date range picker

`NuiDateRangePicker` keeps two date fields in one frame and opens the
[calendar](/en/components/calendar) in `range` mode with two months and presets. The model
is `{ start, end }` with `YYYY-MM-DD` strings or `null`.

<script setup>
import { ref } from 'vue'
const period = ref({ start: '2026-09-21', end: '2026-09-27' })
const presets = [
  { label: 'Today', range: (today) => ({ start: today, end: today }) },
  { label: 'This week', range: { start: '2026-09-21', end: '2026-09-27' } },
]
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Report period" description="Two months and presets">
    <NuiDateRangePicker locale="en-US" v-model="period" :presets="presets" clearable today="2026-09-24" />
  </NuiField>
</div>

```vue
<NuiField label="Report period">
  <NuiDateRangePicker v-model="period" :presets="presets" clearable />
</NuiField>
```

## Behaviour

Each field is parsed like the [date picker](/en/components/date-picker); an end before the
start swaps them. In the calendar the first click opens the range, the second closes it and
the dialog, and a preset does the same in one press. The clear button resets both ends and
`startName`/`endName` add hidden inputs for forms. The field id from `NuiField` sits on the
start input, the end input is named by `endLabel`.

## API

| Prop                                  | Type              | Default          | Description                 |
| ------------------------------------- | ----------------- | ---------------- | --------------------------- |
| `v-model`                             | `NuiDateRange`    | `{ start, end }` | Range                       |
| `months`                              | `number`          | `2`              | Months in the calendar      |
| `presets`                             | `NuiDatePreset[]` | —                | Presets beside the calendar |
| `startPlaceholder` / `endPlaceholder` | `string`          | locale pattern   | Field placeholders          |
| `startName` / `endName`               | `string`          | —                | Hidden inputs for forms     |
| `endLabel`                            | `string`          | `'End date'`     | Name of the end input       |
| `clearable`                           | `boolean`         | `false`          | Clear button                |
| `openLabel`                           | `string`          | `'Choose dates'` | Name of the calendar button |

The remaining props, the `actions` slot, the methods and the block match the
[date picker](/en/components/date-picker); the root carries the `nui-date-picker--range`
modifier and a `__separator` sits between the fields.
