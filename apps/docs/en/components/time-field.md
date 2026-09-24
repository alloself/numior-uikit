# Time field

`NuiTimeField` edits a time as segments: hours, minutes, optional seconds and AM/PM. The
segment order, separators, digits and the 12- or 24-hour cycle come from the locale
through `Intl`, while the model stays a plain `HH:mm` string (or `HH:mm:ss` with `seconds`)
without a time zone. The clock button opens a list of suggestions spaced by `step`.

<script setup>
import { ref } from 'vue'
const start = ref('09:30')
const meeting = ref(null)
const precise = ref('13:05:09')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiConfigProvider locale="en-US">
    <NuiField label="Start" description="From 09:00 to 18:00, 30-minute steps">
      <NuiTimeField v-model="start" min="09:00" max="18:00" :step="30" />
    </NuiField>
  </NuiConfigProvider>
  <NuiConfigProvider locale="de-DE">
    <NuiField label="Termin" description="24-hour cycle from the locale">
      <NuiTimeField v-model="meeting" />
    </NuiField>
  </NuiConfigProvider>
  <NuiConfigProvider locale="ar-EG">
    <NuiField label="الوقت" description="Arabic digits and periods">
      <NuiTimeField v-model="precise" seconds />
    </NuiField>
  </NuiConfigProvider>
</div>

```vue
<NuiField label="Start">
  <NuiTimeField v-model="start" min="09:00" max="18:00" :step="30" />
</NuiField>
```

## Behaviour

Digits are typed per segment: a segment fills and moves on as soon as the next digit could
not continue the number (`1` waits, `3` advances at once), and a pasted `0930` spreads over
the segments. The letters `a`/`p` and the first letters of the localized periods set AM/PM.
↑/↓ step a segment with wrap-around (`23` → `00`), Home/End jump to the segment bounds,
Backspace and Delete clear it, ←/→ and Enter move between segments, PageUp/PageDown shift
the whole time by `step` minutes within `min`/`max`, and Alt+↓ opens the suggestions. The
model is `null` while any segment is empty, and a complete value outside `min`/`max` is
clamped when focus leaves the field. The locale comes from the config or the `locale` prop,
`hourCycle` forces 12 or 24 hours, `seconds` adds the seconds segment; changing the locale
or the cycle rebuilds the draft from the model.

## Accessibility

Segments are native `<input role="spinbutton">` elements with `aria-valuenow`, bounds and
`aria-valuetext`, named through `Intl.DisplayNames`. The `role="group"` takes its label and
description from `NuiField`, the field id lands on the hour segment and one segment stays in
the Tab order. The segment row always runs left to right, even under RTL. The suggestion
list is the same `listbox` as in select: arrows, Enter, Escape, closing when focus leaves
and focus returning to the hours.

## API

| Prop         | Type                   | Default          | Description                         |
| ------------ | ---------------------- | ---------------- | ----------------------------------- |
| `v-model`    | `string \| null`       | `null`           | `HH:mm` or `HH:mm:ss`               |
| `seconds`    | `boolean`              | `false`          | Seconds segment                     |
| `hourCycle`  | `'h12' \| 'h23'`       | from locale      | Forced hour cycle                   |
| `locale`     | `string`               | from config      | Locale for layout and labels        |
| `min`, `max` | `string`               | —                | Bounds for clamping and suggestions |
| `step`       | `number`               | `15`             | Suggestion and PageUp/PageDown step |
| `readonly`   | `boolean`              | `false`          | Read-only                           |
| `name`       | `string`               | —                | Hidden `input` with the value       |
| `placement`  | `FloatingPlacement`    | `'bottom-start'` | Side of the suggestion list         |
| `clockLabel` | `string`               | `'Choose time'`  | Label of the clock button           |
| `emptyLabel` | `string`               | `'No times'`     | Text of the empty list              |
| `size`       | `'sm' \| 'md' \| 'lg'` | `'md'`           | Size step                           |
| `id`         | `string`               | from field       | Explicit id (placed on the hours)   |
| `disabled`   | `boolean`              | from field       | Disabled state                      |
| `required`   | `boolean`              | from field       | `aria-required` on the segments     |
| `invalid`    | `boolean`              | from field       | `aria-invalid` and an error border  |

`focus()` focuses the hours. Block `nui-time-field` (modifiers `--size-*`, `--open`,
`--invalid`, `--disabled`, `--readonly`; elements `__segments`, `__segment` with `--type-*`,
`__literal`, `__clock`, `__listbox`; variables `--_height`, `--_padding`, `--_font-size`,
`--_segment-radius`).
