# Текстовое поле

`NuiInput` — нативный `<input>` для текстовых типов внутри обёртки, которая держит
рамку, кольцо фокуса и слоты `prefix`/`suffix`. Значение синхронизируется через
`v-model` с модификаторами `.lazy` и `.trim`; ввод через IME и составные символы
работают как у обычного `<input v-model>`.

<script setup>
import { ref } from 'vue'
const login = ref('')
const site = ref('')
const phone = ref('')
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
  <NuiField label="Телефон" :description="`В модели: ${phone || '—'}`">
    <NuiInput v-model.unmasked="phone" type="tel" mask="+7 (###) ###-##-##" />
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

## Маска

`mask` задаёт шаблон ввода: `#` — цифра, `A` — буква, `*` — буква или цифра, остальные
символы — литералы, которые подставляются сами (`\#` экранирует литерал). Текст
форматируется на каждом вводе, лишние символы отбрасываются, курсор остаётся после
последнего принятого символа, а Backspace перед литералом удаляет символ перед ним. По
умолчанию в модель попадает отформатированная строка; модификатор `v-model.unmasked`
оставляет в ней только значимые символы (`9991234567` вместо `+7 (999) 123-45-67`).

```vue
<NuiInput v-model.unmasked="phone" type="tel" mask="+7 (###) ###-##-##" />
```

## Состояния

`disabled`, `required` и `invalid` по умолчанию берутся из окружающего `NuiField`;
явное значение на контроле перекрывает поле. `readonly` оставляет текст доступным для
выделения. `size` (`sm`, `md`, `lg`) выбирает ступень внутри текущей плотности.

## API

| Prop       | Тип                                                             | По умолчанию | Описание                                |
| ---------- | --------------------------------------------------------------- | ------------ | --------------------------------------- |
| `v-model`  | `string`                                                        | `''`         | Значение; `.lazy`, `.trim`, `.unmasked` |
| `type`     | `'text' \| 'email' \| 'password' \| 'search' \| 'tel' \| 'url'` | `'text'`     | Тип нативного поля                      |
| `size`     | `'sm' \| 'md' \| 'lg'`                                          | `'md'`       | Ступень размера                         |
| `id`       | `string`                                                        | из поля      | Явный id контрола                       |
| `disabled` | `boolean`                                                       | из поля      | Отключение                              |
| `required` | `boolean`                                                       | из поля      | Обязательность                          |
| `invalid`  | `boolean`                                                       | из поля      | `aria-invalid` и красная рамка          |
| `readonly` | `boolean`                                                       | `false`      | Только чтение                           |
| `mask`     | `string`                                                        | —            | Шаблон ввода (`#`, `A`, `*`)            |

Слоты: `prefix`, `suffix`. Числа и время — отдельные компоненты:
[числовое поле](/components/number-field) и [поле времени](/components/time-field); даты и
загрузка файлов появятся в следующих шагах.
