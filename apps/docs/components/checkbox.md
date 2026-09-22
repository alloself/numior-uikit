# Чекбокс

`NuiCheckbox` — нативный `<input type="checkbox">` под собственным индикатором. Модель
может быть `boolean` или массивом выбранных значений: с массивом чекбокс добавляет и
удаляет свой `value`, сохраняя остальные элементы и их порядок.

<script setup>
import { ref } from 'vue'
const terms = ref(false)
const channels = ref(['email'])
</script>

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiCheckbox v-model="terms">Принимаю условия использования</NuiCheckbox>
  <NuiField group label="Каналы уведомлений" description="Выбрано: {{ channels.join(', ') || 'ничего' }}">
    <NuiCheckbox v-model="channels" value="email">Почта</NuiCheckbox>
    <NuiCheckbox v-model="channels" value="sms">SMS</NuiCheckbox>
    <NuiCheckbox v-model="channels" value="push" disabled>Push</NuiCheckbox>
  </NuiField>
  <NuiCheckbox indeterminate>Частично выбрано</NuiCheckbox>
</div>

```vue
<NuiCheckbox v-model="terms">Принимаю условия использования</NuiCheckbox>

<NuiField group label="Каналы уведомлений">
  <NuiCheckbox v-model="channels" value="email">Почта</NuiCheckbox>
  <NuiCheckbox v-model="channels" value="sms">SMS</NuiCheckbox>
</NuiField>
```

## Состояние indeterminate

`indeterminate` — только визуальное состояние «частично выбрано» для родительских
чекбоксов. Оно выставляется как DOM-свойство после рендера и не участвует в модели;
клик снимает его и переключает значение как обычно. Индикатор показывает алиас `minus`
из реестра иконок вместо `check`.

## Доступность

Контрол остаётся нативным: пробел переключает, screen reader читает подпись из слота,
а группа под `NuiField group` получает `fieldset` с `legend`. Внутри поля чекбокс
наследует `disabled`, `required` и `invalid`, если они не заданы явно. Кольцо фокуса
рисуется на индикаторе при `:focus-visible` контрола.

## API

| Prop            | Тип                    | По умолчанию | Описание                                     |
| --------------- | ---------------------- | ------------ | -------------------------------------------- |
| `v-model`       | `boolean \| T[]`       | —            | Значение или массив выбранных значений       |
| `value`         | `T`                    | —            | Элемент, которым чекбокс управляет в массиве |
| `indeterminate` | `boolean`              | `false`      | Визуальное состояние «частично выбрано»      |
| `size`          | `'sm' \| 'md' \| 'lg'` | `'md'`       | Размер индикатора и текста                   |
| `id`            | `string`               | из поля      | Явный id контрола                            |
| `disabled`      | `boolean`              | из поля      | Отключение                                   |
| `required`      | `boolean`              | из поля      | Обязательность                               |
| `invalid`       | `boolean`              | из поля      | `aria-invalid` и красная рамка               |

Слот по умолчанию — подпись. `class` и `style` попадают на корневой `<label>`,
остальные атрибуты и обработчики — на `<input>`. Модификаторы: `nui-checkbox--checked`,
`nui-checkbox--indeterminate`, `nui-checkbox--invalid`, `nui-checkbox--disabled`,
`nui-checkbox--size-sm`.
