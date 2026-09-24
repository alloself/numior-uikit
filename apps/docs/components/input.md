# Текстовое поле

`NuiInput` — нативный `<input>` для текстовых типов внутри обёртки, которая держит
рамку, кольцо фокуса и слоты `prefix`/`suffix`. Значение синхронизируется через
`v-model` с модификаторами `.lazy` и `.trim`; ввод через IME и составные символы
работают как у обычного `<input v-model>`.

<script setup>
import { ref } from 'vue'
const login = ref('')
const site = ref('')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Логин">
    <NuiInput v-model.trim="login" placeholder="alexey" autocomplete="username">
      <template #prefix>@</template>
    </NuiInput>
  </NuiField>
  <NuiField label="Сайт" description="Домен без протокола">
    <NuiInput v-model.lazy="site" type="url" size="sm">
      <template #suffix>.ru</template>
    </NuiInput>
  </NuiField>
  <NuiField label="Только чтение">
    <NuiInput model-value="Фиксированное значение" readonly />
  </NuiField>
</div>

```vue
<NuiField label="Логин">
  <NuiInput v-model.trim="login" autocomplete="username">
    <template #prefix>@</template>
  </NuiInput>
</NuiField>
```

## Атрибуты и события

`class` и `style` попадают на обёртку; все остальные атрибуты (`placeholder`, `name`,
`autocomplete`, `aria-*`, `inputmode`, `maxlength`) и обработчики событий — на нативный
`<input>`. Метод `focus()` доступен через template ref.

## Состояния

`disabled`, `required` и `invalid` по умолчанию берутся из окружающего `NuiField`;
явное значение на контроле перекрывает поле. `readonly` оставляет текст доступным для
выделения. `size` (`sm`, `md`, `lg`) выбирает ступень внутри текущей плотности.

## API

| Prop       | Тип                                                             | По умолчанию | Описание                       |
| ---------- | --------------------------------------------------------------- | ------------ | ------------------------------ |
| `v-model`  | `string`                                                        | `''`         | Значение; `.lazy`, `.trim`     |
| `type`     | `'text' \| 'email' \| 'password' \| 'search' \| 'tel' \| 'url'` | `'text'`     | Тип нативного поля             |
| `size`     | `'sm' \| 'md' \| 'lg'`                                          | `'md'`       | Ступень размера                |
| `id`       | `string`                                                        | из поля      | Явный id контрола              |
| `disabled` | `boolean`                                                       | из поля      | Отключение                     |
| `required` | `boolean`                                                       | из поля      | Обязательность                 |
| `invalid`  | `boolean`                                                       | из поля      | `aria-invalid` и красная рамка |
| `readonly` | `boolean`                                                       | `false`      | Только чтение                  |

Слоты: `prefix`, `suffix`. Числовые поля, даты и загрузка файлов — отдельные компоненты
следующих волн.
