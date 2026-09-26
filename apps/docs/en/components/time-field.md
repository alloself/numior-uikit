# Time field

`NuiTimeField` edits a time as segments: hours, minutes, optional seconds and AM/PM. The
segment order, separators, digits and the 12- or 24-hour cycle come from the locale
through `Intl`, while the model stays a plain `HH:mm` string (or `HH:mm:ss` with `seconds`)
without a time zone. The clock button opens iOS-style wheels: a column per segment, with
minutes spaced by `step`.

<script setup>
import { ref } from 'vue'
const start = ref('09:30')
const meeting = ref(null)
const precise = ref('13:05:09')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Start" description="From 09:00 to 18:00, 30-minute steps">
    <NuiTimeField locale="en-US" v-model="start" min="09:00" max="18:00" :step="30" />
  </NuiField>
  <NuiField label="Termin" description="24-hour cycle from the locale">
    <NuiTimeField locale="de-DE" v-model="meeting" />
  </NuiField>
  <NuiField label="الوقت" description="Arabic digits and periods">
    <NuiTimeField locale="ar-EG" v-model="precise" seconds />
  </NuiField>
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
the whole time by `step` minutes within `min`/`max`, and Alt+↓ opens the wheels. A click
on the empty part of the field focuses the first empty segment, or the hours when all are
filled. The
model is `null` while any segment is empty, and a complete value outside `min`/`max` is
clamped when focus leaves the field. The locale comes from the config or the `locale` prop,
`hourCycle` forces 12 or 24 hours, `seconds` adds the seconds segment; changing the locale
or the cycle rebuilds the draft from the model.

## Wheels

The columns follow the locale's segments: hours and minutes, seconds with `seconds`, AM/PM on
a 12-hour cycle, and the locale's separator between numeric columns. Minutes are spaced by the
greatest common divisor of `step` and 60 (`15` → 00, 15, 30, 45; `7` → every minute); a minute
off the step typed into the segments gets its own row until another one is picked. Hours
outside `min`/`max` stay out of the column, while minutes and seconds the chosen hour cannot
reach show dimmed and are skipped: a wheel stopped on one springs back to the nearest
available value. Every pick joins the other columns into a full time clamped into the bounds,
so 18:30 with `max="18:00"` becomes 18:00.

A column turns with the mouse wheel, a touchpad and a finger (scrolling that snaps to rows),
drags with the mouse and takes a click on a value. From the keyboard ↑/↓ move by one value,
PageUp/PageDown by five, Home/End to the ends, ←/→ switch columns, Enter confirms and closes
(an empty field takes the shown time) and Escape closes; focus returns to the segment of the
column it was in. The wheels render only while the panel is open.

## Accessibility

Segments are native `<input role="spinbutton">` elements with `aria-valuenow`, bounds and
`aria-valuetext`, named through `Intl.DisplayNames`. The `role="group"` takes its label and
description from `NuiField`, the field id lands on the hour segment and one segment stays in
the Tab order. The segment row and the wheels always run left to right, even under RTL. The
panel is a `role="group"` named like the button, every column is a `role="spinbutton"` named
after its segment with `aria-valuenow`, `aria-valuetext` and bounds, one column stays in the
Tab order, and the column rows are hidden from screen readers, which hear the value. The panel
closes when focus leaves it.

## API

| Prop         | Type                   | Default                                                 | Description                        |
| ------------ | ---------------------- | ------------------------------------------------------- | ---------------------------------- |
| `v-model`    | `string \| null`       | `null`                                                  | `HH:mm` or `HH:mm:ss`              |
| `seconds`    | `boolean`              | `false`                                                 | Seconds segment                    |
| `hourCycle`  | `'h12' \| 'h23'`       | from locale                                             | Forced hour cycle                  |
| `locale`     | `string`               | from config                                             | Locale for layout and labels       |
| `min`, `max` | `string`               | —                                                       | Bounds for clamping and the wheels |
| `step`       | `number`               | `15`                                                    | Minute and PageUp/PageDown step    |
| `readonly`   | `boolean`              | `false`                                                 | Read-only                          |
| `name`       | `string`               | —                                                       | Hidden `input` with the value      |
| `placement`  | `FloatingPlacement`    | `'bottom-start'`                                        | Side of the wheel panel            |
| `clockLabel` | `string`               | [dictionary](/en/localization#timefield): “Choose time” | Label of the clock button          |
| `emptyLabel` | `string`               | [dictionary](/en/localization#timefield): “No times”    | Text when no time is available     |
| `size`       | `'sm' \| 'md' \| 'lg'` | `'md'`                                                  | Size step                          |
| `id`         | `string`               | from field                                              | Explicit id (placed on the hours)  |
| `disabled`   | `boolean`              | from field                                              | Disabled state                     |
| `required`   | `boolean`              | from field                                              | `aria-required` on the segments    |
| `invalid`    | `boolean`              | from field                                              | `aria-invalid` and an error border |

`focus()` focuses the hours. Block `nui-time-field` (modifiers `--size-*`, `--open`,
`--invalid`, `--disabled`, `--readonly`; elements `__segments`, `__segment` with `--type-*`,
`__literal`, `__clock`, `__panel`, `__wheels`, `__wheel`, `__wheel-item` with `--selected` and
`--disabled`, `__wheel-separator`, `__empty`; variables `--_height`, `--_padding`, `--_font-size`,
`--_segment-radius`).
