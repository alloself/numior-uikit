# Радиогруппа

`NuiRadioGroup` объединяет нативные `<input type="radio">` общим `name`, поэтому
переключение стрелками, исключительность выбора и участие в форме работают без
JavaScript. Значение любого типа приходит через `v-model`; каждая `NuiRadio` объявляет
свой `value`.

<script setup>
import { ref } from 'vue'
const plan = ref('team')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField group label="Тариф" description="Выбрано: {{ plan }}">
    <NuiRadioGroup v-model="plan">
      <NuiRadio value="free">Бесплатный</NuiRadio>
      <NuiRadio value="team">Команда</NuiRadio>
      <NuiRadio value="business" disabled>Бизнес</NuiRadio>
    </NuiRadioGroup>
  </NuiField>
  <NuiField group label="Горизонтально">
    <NuiRadioGroup v-model="plan" orientation="horizontal" size="sm">
      <NuiRadio value="free">Free</NuiRadio>
      <NuiRadio value="team">Team</NuiRadio>
    </NuiRadioGroup>
  </NuiField>
</div>

```vue
<NuiField group label="Тариф">
  <NuiRadioGroup v-model="plan">
    <NuiRadio value="free">Бесплатный</NuiRadio>
    <NuiRadio value="team">Команда</NuiRadio>
  </NuiRadioGroup>
</NuiField>
```

## Подпись и описание

Оборачивайте группу в `NuiField group`: поле рендерит `fieldset` с `legend`, а группа
получает `role="radiogroup"`, `aria-labelledby` на легенду и `aria-describedby` на
описание и ошибку. `required`, `disabled` и `invalid` поля применяются ко всей группе;
`disabled` у отдельной `NuiRadio` отключает только её.

## API

`NuiRadioGroup`

| Prop          | Тип                          | По умолчанию | Описание                            |
| ------------- | ---------------------------- | ------------ | ----------------------------------- |
| `v-model`     | `T`                          | обязателен   | Выбранное значение                  |
| `name`        | `string`                     | id группы    | Общее нативное имя радиокнопок      |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Раскладка                           |
| `size`        | `'sm' \| 'md' \| 'lg'`       | `'md'`       | Размер радиокнопок внутри           |
| `id`          | `string`                     | из поля      | Id элемента с `role="radiogroup"`   |
| `disabled`    | `boolean`                    | из поля      | Отключает все радиокнопки           |
| `required`    | `boolean`                    | из поля      | `aria-required`                     |
| `invalid`     | `boolean`                    | из поля      | `aria-invalid` и красные индикаторы |

`NuiRadio`

| Prop       | Тип       | По умолчанию | Описание                  |
| ---------- | --------- | ------------ | ------------------------- |
| `value`    | `T`       | обязателен   | Значение этой радиокнопки |
| `id`       | `string`  | генерируется | Явный id                  |
| `disabled` | `boolean` | из группы    | Отключение одной кнопки   |

Слот `NuiRadio` — подпись; `class` и `style` идут на `<label>`, остальное — на
`<input>`. Модификаторы: `nui-radio-group--orientation-horizontal`,
`nui-radio-group--size-sm`, `nui-radio--checked`, `nui-radio--disabled`,
`nui-radio--invalid`.
