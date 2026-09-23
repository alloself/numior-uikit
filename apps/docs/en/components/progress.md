# Progress

`NuiProgress` is a native `<progress>`: the browser provides the `progressbar` role,
value and maximum, while the styles paint the track, the tone color and the
indeterminate animation.

<script setup>
import { ref } from 'vue'
const value = ref(40)
</script>

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiProgress :value="value" label="Upload" :value-text="`${value}%`" />
  <NuiProgress :value="value" tone="success" size="lg" label="Done" />
  <NuiProgress label="Preparing" size="sm" tone="info" />
  <label>Value <input type="range" min="0" max="100" v-model.number="value" /></label>
</div>

```vue
<NuiProgress
  :value="uploaded"
  :max="total"
  label="Upload"
  :value-text="`${uploaded} of ${total}`"
/>
<NuiProgress label="Preparing" />
```

Without `value` the indicator is indeterminate: a bar slides along the track, and under
`prefers-reduced-motion` the animation runs at half speed. `label` gives the accessible
name, `valueText` a human-readable value for screen readers.

## API

| Prop        | Type                   | Default     | Description                           |
| ----------- | ---------------------- | ----------- | ------------------------------------- |
| `value`     | `number`               | —           | Current value; omit for indeterminate |
| `max`       | `number`               | `100`       | Maximum                               |
| `size`      | `'sm' \| 'md' \| 'lg'` | `'md'`      | Thickness 0.25 / 0.5 / 0.75rem        |
| `tone`      | `NuiTone`              | `'primary'` | Fill color                            |
| `label`     | `string`               | —           | `aria-label`                          |
| `valueText` | `string`               | —           | `aria-valuetext`                      |
| `id`        | `string`               | —           | Element id                            |

Block `nui-progress`, modifiers `--size-*`, `--tone-*`, `--indeterminate`; variables
`--_height`, `--_tone`, `--_track`.
