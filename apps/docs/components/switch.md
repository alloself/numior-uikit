# Переключатель

`NuiSwitch` — нативный чекбокс с `role="switch"` под анимированным треком. Модель —
`boolean`. Пробел переключает, screen reader объявляет «включено/выключено», а
положение бегунка описано логическими свойствами, поэтому в RTL он движется в
правильную сторону.

<script setup>
import { ref } from 'vue'
const notifications = ref(true)
const compact = ref(false)
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiSwitch v-model="notifications">Уведомления: {{ notifications ? 'включены' : 'выключены' }}</NuiSwitch>
  <NuiSwitch v-model="compact" size="sm">Компактный режим</NuiSwitch>
  <NuiSwitch size="lg" disabled>Недоступен</NuiSwitch>
</div>

```vue
<NuiSwitch v-model="notifications">Уведомления</NuiSwitch>
```

## API

| Prop       | Тип                    | По умолчанию | Описание                      |
| ---------- | ---------------------- | ------------ | ----------------------------- |
| `v-model`  | `boolean`              | `false`      | Состояние                     |
| `size`     | `'sm' \| 'md' \| 'lg'` | `'md'`       | Размер трека и текста         |
| `id`       | `string`               | из поля      | Явный id контрола             |
| `disabled` | `boolean`              | из поля      | Отключение                    |
| `required` | `boolean`              | из поля      | Обязательность                |
| `invalid`  | `boolean`              | из поля      | `aria-invalid` и красный трек |

Слот по умолчанию — подпись. `class` и `style` идут на `<label>`, остальные атрибуты
и обработчики — на `<input>`. Модификаторы: `nui-switch--checked`,
`nui-switch--disabled`, `nui-switch--invalid`, `nui-switch--size-sm`.
