# Умная форма

`NuiSmartForm` строит форму из конфигурации: поля с любыми контролами кита, секции со своей
раскладкой, условные поля, повторяемые группы и шаги. Конфигурацию собирает
`formConfig<Values>()`: `name` сверяется с путями значений, а `props` — с props самого
контрола. Под капотом те же `useForm`, `NuiForm`, `NuiFormField` и `NuiFieldArray`, что и в
[ручных формах](/components/form).

<script setup>
import { ref } from 'vue'
import { NuiCheckbox, NuiInput, NuiNumberField, NuiRadioGroup } from '@numior/vue'
import { NuiFormError, email, formConfig, min, required, useForm } from '@numior/forms'

const { field, section, array } = formConfig()
const row = formConfig()

const isCompany = (values) => values.kind === 'company'

const profileFields = [
  section({
    title: 'Профиль',
    layout: '"kind kind" "name email" "company vat"',
    fields: [
      field(NuiRadioGroup, { name: 'kind', label: 'Тип аккаунта', group: true }),
      field(NuiInput, { name: 'name', label: 'Имя', required: true, rules: [required()] }),
      field(NuiInput, { name: 'email', label: 'Почта', required: true, rules: [required(), email()], props: { type: 'email' } }),
      field(NuiInput, { name: 'company', label: 'Компания', required: true, when: isCompany, rules: [required()] }),
      field(NuiInput, { name: 'vat', label: 'ИНН', when: isCompany, props: { inputmode: 'numeric' } }),
    ],
  }),
  section({
    title: 'Контакты',
    description: 'От одного до трёх',
    fields: [
      array({
        name: 'contacts',
        min: 1,
        max: 3,
        reorderable: true,
        layout: '"name phone"',
        addLabel: 'Добавить контакт',
        newRow: () => ({ name: '', phone: '' }),
        fields: [
          row.field(NuiInput, { name: 'name', label: 'Имя', required: true, rules: [required()] }),
          row.field(NuiInput, { name: 'phone', label: 'Телефон', props: { type: 'tel', mask: '+7 (###) ###-##-##' } }),
        ],
      }),
    ],
  }),
]

const saved = ref(null)

const profile = useForm({
  initialValues: { kind: 'person', name: '', email: '', company: '', vat: '', contacts: [{ name: '', phone: '' }] },
  onSubmit: (values) => {
    saved.value = values
  },
})

const step = ref()

const wizardSteps = [
  {
    value: 'account',
    label: 'Аккаунт',
    description: 'Почта и пароль',
    fields: [
      field(NuiInput, { name: 'email', label: 'Почта', required: true, rules: [required(), email()], props: { type: 'email' } }),
      field(NuiInput, { name: 'password', label: 'Пароль', required: true, rules: [required(), min(8)], props: { type: 'password' } }),
    ],
  },
  {
    value: 'team',
    label: 'Команда',
    layout: '"team size"',
    fields: [
      field(NuiInput, { name: 'team', label: 'Название', required: true, rules: [required()] }),
      field(NuiNumberField, { name: 'size', label: 'Сколько человек', props: { min: 1 } }),
    ],
  },
  {
    value: 'confirm',
    label: 'Подтверждение',
    fields: [field(NuiCheckbox, { name: 'rules', rules: [required({ message: 'Подтвердите согласие' })] })],
  },
]

const created = ref('')

const wizard = useForm({
  initialValues: { email: '', password: '', team: '', size: 5, rules: false },
  onSubmit: async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    if (values.email.trim() === 'taken@example.com') {
      throw new NuiFormError({ email: 'Этот адрес уже зарегистрирован' })
    }
    created.value = values.team
  },
})
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiSmartForm :form="profile" :fields="profileFields" submit-label="Сохранить">
    <template #kind="{ field }">
      <NuiRadioGroup v-bind="field" orientation="horizontal">
        <NuiRadio value="person">Частное лицо</NuiRadio>
        <NuiRadio value="company">Компания</NuiRadio>
      </NuiRadioGroup>
    </template>
  </NuiSmartForm>
  <pre v-if="saved" style="margin: 0">{{ JSON.stringify(saved, null, 2) }}</pre>
</div>

```vue
<script setup lang="ts">
import { NuiInput, NuiRadio, NuiRadioGroup } from '@numior/vue';
import { NuiSmartForm, email, formConfig, required, useForm } from '@numior/forms';

interface Contact {
  name: string;
  phone: string;
}

interface Profile {
  kind: 'person' | 'company';
  name: string;
  email: string;
  company?: string;
  vat?: string;
  contacts: Contact[];
}

const { field, section, array } = formConfig<Profile>();
const row = formConfig<Contact>();

const isCompany = (values: Profile): boolean => values.kind === 'company';

const fields = [
  section({
    title: 'Профиль',
    layout: '"kind kind" "name email" "company vat"',
    fields: [
      field(NuiRadioGroup, { name: 'kind', label: 'Тип аккаунта', group: true }),
      field(NuiInput, { name: 'name', label: 'Имя', required: true, rules: [required()] }),
      field(NuiInput, {
        name: 'email',
        label: 'Почта',
        rules: [required(), email()],
        props: { type: 'email' },
      }),
      field(NuiInput, { name: 'company', label: 'Компания', when: isCompany, rules: [required()] }),
      field(NuiInput, {
        name: 'vat',
        label: 'ИНН',
        when: isCompany,
        props: { inputmode: 'numeric' },
      }),
    ],
  }),
  section({
    title: 'Контакты',
    fields: [
      array({
        name: 'contacts',
        min: 1,
        max: 3,
        reorderable: true,
        layout: '"name phone"',
        newRow: () => ({ name: '', phone: '' }),
        fields: [
          row.field(NuiInput, { name: 'name', label: 'Имя', rules: [required()] }),
          row.field(NuiInput, {
            name: 'phone',
            label: 'Телефон',
            props: { type: 'tel', mask: '+7 (###) ###-##-##' },
          }),
        ],
      }),
    ],
  }),
];

const form = useForm<Profile>({
  initialValues: { kind: 'person', name: '', email: '', contacts: [{ name: '', phone: '' }] },
  onSubmit: (values) => save(values),
});
</script>

<template>
  <NuiSmartForm :form="form" :fields="fields" submit-label="Сохранить">
    <template #kind="{ field }">
      <NuiRadioGroup v-bind="field" orientation="horizontal">
        <NuiRadio value="person">Частное лицо</NuiRadio>
        <NuiRadio value="company">Компания</NuiRadio>
      </NuiRadioGroup>
    </template>
  </NuiSmartForm>
</template>
```

## Конфигурация

`field(Component, options)` описывает поле: `name`, `label`, `description`, `required`,
`disabled`, `group`, `rules`, `validateOn`, `keepValue` — как у `NuiFormField`, плюс `props`
контрола, `when` и `area`. `props` типизированы по компоненту без управляемых формой ключей
(`modelValue`, `id`, `name`, `invalid`, `required`, `disabled`) и с нативными атрибутами; вместо
объекта можно передать функцию значений — `props: (values) => ({ options: citiesOf(values.country) })`.

`section({ title, description, layout, fields })` рендерит `fieldset` с заголовком; между
соседними секциями проходит разделитель. `array({ name, label, description, min, max,
reorderable, newRow, layout, fields })` рендерит [`NuiFieldArray`](/components/form#повторяемые-группы):
поля строки описывает `formConfig<Row>()`, их пути пишутся относительно строки.

## Условия

`when(values, row)` показывает поле, секцию или группу, пока возвращает `true`. Скрытое поле
выпадает из проверки и из отправки, даже если его ни разу не показывали, но значение остаётся:
вернувшееся поле покажет прежний текст. `keepValue: false` очищает значение при скрытии. У поля
строки `when` получает и значение строки. Условие пересчитывается в том же рендере, что и
изменение значения, а появление поля проходит через токены движения.

## Раскладка

`layout` пишется в синтаксисе `grid-template-areas`: `'"name email" "about about"'`. Имена
областей — имена полей (точки заменяются дефисами) или `area` из конфигурации. DOM идёт в
порядке чтения макета, поэтому Tab проходит поля слева направо и сверху вниз; строки, где все
поля скрыты, выпадают, скрытое поле в строке оставляет пустую ячейку. Поле без места в макете
встаёт в первую свободную ячейку после него, форма без `layout` идёт одной колонкой. Когда форма
уже `36rem` (контейнерный запрос, а не ширина окна), макет складывается в колонку, поэтому та же
форма работает в диалоге и на телефоне.

`inline` ставит поля в строку — для фильтров над таблицей; `inline="grow"` растягивает их на
всю ширину. Кнопка встаёт вровень с контролами, а на узком контейнере уходит под поля.

## Слоты

Слот с путём поля заменяет контрол и получает то же, что слот `NuiFormField`: `field` для
`v-bind`, `value`, `setValue`, `error`, `invalid`, `touched`, `pending`, а в группе — `row`.
Слот `путь:after` добавляет содержимое в ячейку под полем — счётчик символов, ссылку, подсказку.
Пути полей строки пишутся без индекса (`contacts.phone`); имя с точкой в шаблоне задаётся
динамически: `<template #[PHONE_AFTER]>` с `const PHONE_AFTER = 'contacts.phone:after'`.

Имена слотов выводятся из типа значений: опечатка в `#emial` или обращение к `field` в слоте
`:after` не проходит проверку типов. Слоты `actions` (`{ pending, dirty, submit, reset, step,
first, last, back }`) и `form-errors` заменяют кнопки и блок ошибок.

## Шаги

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiSmartForm v-model:step="step" :form="wizard" :steps="wizardSteps" submit-label="Создать команду" style="max-inline-size: 36rem">
    <template #rules="{ field }">
      <NuiCheckbox v-bind="field">Согласен с правилами команды</NuiCheckbox>
    </template>
  </NuiSmartForm>
  <p v-if="created">Команда «{{ created }}» создана.</p>
</div>

```vue
<NuiSmartForm v-model:step="step" :form="form" :steps="steps" submit-label="Создать команду">
  <template #rules="{ field }">
    <NuiCheckbox v-bind="field">Согласен с правилами команды</NuiCheckbox>
  </template>
</NuiSmartForm>
```

`steps` — список `{ value, label, description?, layout?, fields }`, `v-model:step` хранит
значение текущего шага; без модели форма начинает с первого. Над полями стоит
[`NuiStepper`](/components/stepper). Все панели смонтированы, поэтому значения и ошибки
прошлых шагов не теряются, а скрыта только неактивная панель.

«Далее» и Enter в поле промежуточного шага проверяют только поля шага: при ошибке фокус идёт на
первое невалидное поле, иначе — на первое поле следующего шага, а live-регион объявляет «Шаг 2
из 3: Команда». «Назад» и клик по пройденному шагу степпера не проверяют. Финальная кнопка
отправляет всю форму; если ошибка — в том числе серверная, как у адреса taken@example.com в
примере, — оказалась на другом шаге, форма открывает его и фокусирует поле. Степпер отмечает
ошибкой только шаги, которые уже проверялись. Сброс возвращает к первому шагу.

## Доступность

Секции — `fieldset` с `legend`, группы — `fieldset` со своим live-регионом, шаги — группы с
именем шага под навигацией степпера. Порядок DOM совпадает с порядком чтения макета. Всё
остальное — ошибки, фокус после неудачи, `aria-busy`, кнопка в ожидании — как у
[`NuiForm`](/components/form#доступность).

## API

| Prop           | Тип                           | По умолчанию                                | Описание                                 |
| -------------- | ----------------------------- | ------------------------------------------- | ---------------------------------------- |
| `form`         | `FormContext<Values>`         | —                                           | Контекст из `useForm`                    |
| `fields`       | `NuiSmartFormEntry<Values>[]` | —                                           | Поля, секции и группы                    |
| `steps`        | `NuiSmartFormStep<Values>[]`  | —                                           | Шаги вместо `fields`                     |
| `v-model:step` | `string`                      | первый шаг                                  | Текущий шаг                              |
| `layout`       | `string`                      | —                                           | Макет в синтаксисе `grid-template-areas` |
| `inline`       | `boolean \| 'grow'`           | —                                           | Поля в строку                            |
| `disabled`     | `boolean`                     | `false`                                     | Отключает поля и кнопки                  |
| `submitLabel`  | `string`                      | [словарь](/localization#form): «Отправить»  | Кнопка отправки                          |
| `nextLabel`    | `string`                      | [словарь](/localization#smartform): «Далее» | Кнопка следующего шага                   |
| `backLabel`    | `string`                      | [словарь](/localization#smartform): «Назад» | Кнопка предыдущего шага                  |

Слоты: `[путь]`, `[путь]:after`, `actions`, `form-errors`. Методы `requestSubmit()` и `back()`.
Типы `NuiSmartFormSlots<Values>`, `NuiSmartFormFieldScope`, `NuiSmartFormAfterScope`,
`NuiSmartFormActionsScope`, `FormSlotPath<Values>`.

Блок `nui-smart-form` (модификаторы `--inline`, `--grow`, `--steps`, `--back`, `--navigated`;
элементы `__grid` с `--layout`, `__cell` с `--appearing` и `--entering`, `__section`,
`__legend`, `__section-description`, `__stepper`, `__step`, `__back`, `__next`, `__live`).
Переменные: `--_columns`, `--_layout-columns`, `--_areas`, `--_area`, `--_slide`.
