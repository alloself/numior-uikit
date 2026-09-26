# Чекбокс

`NuiCheckbox` — нативный `<input type="checkbox">` под собственным индикатором с моделью
`boolean`. Набор значений выбирает `NuiCheckboxGroup`: он получает опции и держит массив
выбранных значений в `v-model` в порядке выбора, так что тип модели всегда совпадает с тем,
что компонент отдаёт.

<script setup>
import { ref } from 'vue'
const terms = ref(false)
const channels = ref(['email'])
const channelOptions = [
  { value: 'email', label: 'Почта' },
  { value: 'sms', label: 'SMS' },
  { value: 'push', label: 'Push', disabled: true },
]
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiCheckbox v-model="terms">Принимаю условия использования</NuiCheckbox>
  <NuiField group label="Каналы уведомлений" description="Выбрано: {{ channels.join(', ') || 'ничего' }}">
    <NuiCheckboxGroup v-model="channels" :options="channelOptions" />
  </NuiField>
  <NuiCheckbox indeterminate>Частично выбрано</NuiCheckbox>
</div>

```vue
<NuiCheckbox v-model="terms">Принимаю условия использования</NuiCheckbox>

<NuiField group label="Каналы уведомлений">
  <NuiCheckboxGroup v-model="channels" :options="channelOptions" />
</NuiField>
```

## Состояние indeterminate

`indeterminate` — только визуальное состояние «частично выбрано» для родительских
чекбоксов. Оно выставляется как DOM-свойство после рендера и не участвует в модели;
клик снимает его и переключает значение как обычно. Индикатор показывает алиас `minus`
из реестра иконок вместо `check`.

## Доступность

Контрол остаётся нативным: пробел переключает, screen reader читает подпись из слота.
Одиночный чекбокс внутри поля наследует `disabled`, `required` и `invalid`, если они не
заданы явно. `NuiCheckboxGroup` — `role="group"` с именем из подписи поля `NuiField group`
и описанием поля; чекбоксы внутри получают общее нативное `name`, состояние группы и не
забирают себе id поля. Кольцо фокуса рисуется на индикаторе при `:focus-visible` контрола.

## API

`NuiCheckbox`

| Prop            | Тип                    | По умолчанию | Описание                                |
| --------------- | ---------------------- | ------------ | --------------------------------------- |
| `v-model`       | `boolean`              | `false`      | Отмечен ли чекбокс                      |
| `value`         | `string`               | —            | Нативное значение для отправки формы    |
| `indeterminate` | `boolean`              | `false`      | Визуальное состояние «частично выбрано» |
| `size`          | `'sm' \| 'md' \| 'lg'` | `'md'`       | Размер индикатора и текста              |
| `id`            | `string`               | из поля      | Явный id контрола                       |
| `disabled`      | `boolean`              | из поля      | Отключение                              |
| `required`      | `boolean`              | из поля      | Обязательность                          |
| `invalid`       | `boolean`              | из поля      | `aria-invalid` и красная рамка          |

Слот по умолчанию — подпись. `class` и `style` попадают на корневой `<label>`,
остальные атрибуты и обработчики — на `<input>`. Модификаторы: `nui-checkbox--checked`,
`nui-checkbox--indeterminate`, `nui-checkbox--invalid`, `nui-checkbox--disabled`,
`nui-checkbox--size-sm`.

`NuiCheckboxGroup`

| Prop                                    | Тип                          | По умолчанию | Описание                             |
| --------------------------------------- | ---------------------------- | ------------ | ------------------------------------ |
| `v-model`                               | `T[]`                        | `[]`         | Выбранные значения                   |
| `options`                               | `NuiOption<T>[]`             | —            | Опции (`value`, `label`, `disabled`) |
| `name`                                  | `string`                     | id группы    | Общее нативное имя чекбоксов         |
| `orientation`                           | `'vertical' \| 'horizontal'` | `'vertical'` | Раскладка                            |
| `getKey`                                | `(value: T) => string`       | по значению  | Ключ объектных значений              |
| `size`                                  | `'sm' \| 'md' \| 'lg'`       | `'md'`       | Размер чекбоксов                     |
| `id`, `disabled`, `required`, `invalid` | —                            | из поля      | Как у остальных контролов поля       |

Слот `option="{ option }"` заменяет подпись опции. Блок `nui-checkbox-group`, модификаторы
`--orientation-*`, `--invalid`, `--disabled`.
