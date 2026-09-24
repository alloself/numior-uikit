# Многострочное поле

`NuiTextarea` — нативный `<textarea>` без обёртки: атрибуты, классы и обработчики
попадают прямо на него. Значение синхронизируется через `v-model` с модификаторами
`.lazy` и `.trim`.

<script setup>
import { ref } from 'vue'
const bio = ref('')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="О себе" description="Несколько предложений">
    <NuiTextarea v-model="bio" :rows="4" />
  </NuiField>
  <NuiField label="Без изменения размера">
    <NuiTextarea resize="none" size="sm" placeholder="Компактное поле" />
  </NuiField>
</div>

```vue
<NuiField label="О себе" description="Несколько предложений">
  <NuiTextarea v-model="bio" :rows="4" />
</NuiField>
```

## API

| Prop       | Тип                              | По умолчанию | Описание                          |
| ---------- | -------------------------------- | ------------ | --------------------------------- |
| `v-model`  | `string`                         | `''`         | Значение; `.lazy`, `.trim`        |
| `rows`     | `number`                         | `3`          | Видимые строки                    |
| `resize`   | `'none' \| 'vertical' \| 'both'` | `'vertical'` | Разрешённое изменение размера     |
| `size`     | `'sm' \| 'md' \| 'lg'`           | `'md'`       | Ступень размера (отступы и шрифт) |
| `id`       | `string`                         | из поля      | Явный id                          |
| `disabled` | `boolean`                        | из поля      | Отключение                        |
| `required` | `boolean`                        | из поля      | Обязательность                    |
| `invalid`  | `boolean`                        | из поля      | `aria-invalid` и красная рамка    |
| `readonly` | `boolean`                        | `false`      | Только чтение                     |

Метод `focus()` доступен через template ref. Модификаторы `nui-textarea--size-sm`,
`nui-textarea--resize-none` и `nui-textarea--invalid` управляют стилями и доступны для
собственных правил.
