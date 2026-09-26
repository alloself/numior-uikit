# Поле формы

`NuiField` связывает контрол с подписью, описанием и ошибкой. Поле создаёт общий `id`,
а контрол внутри через provide/inject получает `id`, `aria-describedby`, `aria-invalid`,
`required` и `disabled`. Контролы работают и без `NuiField`; явные props контрола
всегда перекрывают контекст поля.

<script setup>
import { ref } from 'vue'
const email = ref('')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField
    label="Рабочая почта"
    description="Письма приходят только на подтверждённые адреса"
    :error="email && !email.includes('@') ? 'Укажите адрес с символом @' : undefined"
    required
  >
    <NuiInput v-model="email" type="email" placeholder="name@company.ru" />
  </NuiField>
</div>

```vue
<NuiField
  label="Рабочая почта"
  description="Письма приходят только на подтверждённые адреса"
  :error="error"
  required
>
  <NuiInput v-model="email" type="email" />
</NuiField>
```

Разметка результата: `<label for="…">`, контрол с тем же `id`, описание и ошибка с
`id="…-description"` и `id="…-error"`, перечисленными в `aria-describedby`. Если
передан `error`, поле и контрол становятся `invalid`. Все связи вычисляются на сервере,
поэтому SSR и гидратация дают одинаковую разметку.

## Группы контролов

`group` превращает поле в `<fieldset>` с `<legend>`: так подписываются группы radio и
наборы чекбоксов. Контролы внутри группы сохраняют собственные `id`, а `disabled`
применяется нативно ко всему `fieldset`.

```vue
<NuiField group label="Тариф" description="Можно изменить позже">
  <NuiRadioGroup v-model="plan">…</NuiRadioGroup>
</NuiField>
```

## Место под ошибку

`reserve-error` держит под контролом пустую строку высотой в одну строку ошибки. Ошибка
занимает её, поэтому соседние поля и кнопки не сдвигаются, когда после отправки появляются
сообщения; ошибка длиннее строки всё же добавит высоту. В формах проп берут `NuiForm` и
`NuiSmartForm`, и он доходит до всех полей внутри.

```vue
<NuiField label="Почта" :error="error" reserve-error>
  <NuiInput v-model="email" type="email" />
</NuiField>
```

## Слоты и части

Подпись, описание и ошибку можно передать слотами `label`, `description` и `error`,
когда нужна разметка сложнее текста. Части `NuiFieldLabel`, `NuiFieldDescription`
и `NuiFieldError` экспортируются для собственных обёрток поверх `provideField`
из `@numior/primitives`; внутри `NuiField` предпочитайте props и именованные слоты,
чтобы `aria-describedby` был известен уже при серверном рендере.

## API

| Prop           | Тип       | По умолчанию | Описание                                         |
| -------------- | --------- | ------------ | ------------------------------------------------ |
| `id`           | `string`  | генерируется | Id контрола; от него образуются остальные id     |
| `label`        | `string`  | —            | Подпись; альтернатива — слот `label`             |
| `description`  | `string`  | —            | Описание под контролом; слот `description`       |
| `error`        | `string`  | —            | Текст ошибки; делает поле и контрол `invalid`    |
| `invalid`      | `boolean` | `false`      | Пометить поле недействительным без текста ошибки |
| `required`     | `boolean` | `false`      | Маркер обязательности и атрибут `required`       |
| `disabled`     | `boolean` | `false`      | Отключает контрол; для группы — весь `fieldset`  |
| `group`        | `boolean` | `false`      | `fieldset` + `legend` вместо `label`             |
| `reserveError` | `boolean` | `false`      | Держит строку под ошибку, даже пока её нет       |

Состояния отражаются модификаторами `nui-field--invalid`, `nui-field--required`,
`nui-field--disabled`, `nui-field--group` и `nui-field--reserve-error` (пустая строка —
элемент `nui-field__reserve`). Внутри доступны `useFieldContext()` и
`useFieldControl()` из `@numior/vue`.
