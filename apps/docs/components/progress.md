# Прогресс

`NuiProgress` — нативный `<progress>`: браузер даёт роль `progressbar`, значение и
максимум, а стили задают трек, цвет тона и анимацию неопределённого состояния.

<script setup>
import { ref } from 'vue'
const value = ref(40)
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiProgress :value="value" label="Загрузка" :value-text="`${value}%`" />
  <NuiProgress :value="value" tone="success" size="lg" label="Готово" />
  <NuiProgress label="Подготовка" size="sm" tone="info" />
  <label>Значение <input type="range" min="0" max="100" v-model.number="value" /></label>
</div>

```vue
<NuiProgress
  :value="uploaded"
  :max="total"
  label="Загрузка"
  :value-text="`${uploaded} из ${total}`"
/>
<NuiProgress label="Подготовка" />
```

Без `value` индикатор неопределённый: полоса скользит по треку, под
`prefers-reduced-motion` анимация замедляется вдвое. `label` даёт доступное имя,
`valueText` — человекочитаемое значение для screen reader.

## API

| Prop        | Тип                    | По умолчанию | Описание                                   |
| ----------- | ---------------------- | ------------ | ------------------------------------------ |
| `value`     | `number`               | —            | Текущее значение; без него — indeterminate |
| `max`       | `number`               | `100`        | Максимум                                   |
| `size`      | `'sm' \| 'md' \| 'lg'` | `'md'`       | Толщина 0.25 / 0.5 / 0.75rem               |
| `tone`      | `NuiTone`              | `'primary'`  | Цвет заполнения                            |
| `label`     | `string`               | —            | `aria-label`                               |
| `valueText` | `string`               | —            | `aria-valuetext`                           |
| `id`        | `string`               | —            | Id элемента                                |

Блок `nui-progress`, модификаторы `--size-*`, `--tone-*`, `--indeterminate`; переменные
`--_height`, `--_tone`, `--_track`.
