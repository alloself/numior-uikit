# Формы

`@numior/forms` собирает формы из контролов кита. `useForm` держит значения, ошибки и отправку,
`NuiForm` рендерит нативный `<form>` с блоком ошибок и кнопкой, `NuiFormField` связывает путь
формы с любым контролом через `v-bind="field"`, `NuiFieldArray` повторяет группу полей. У пакета
нет внешних зависимостей: значения держит собственный движок, а vee-validate подключается по
желанию (см. «Движок»). Формы из конфигурации — на странице [умной формы](/components/smart-form).

<script setup>
import { ref } from 'vue'
import { NuiFormError, email, min, required, useForm } from '@numior/forms'

const signedIn = ref('')

const signIn = useForm({
  initialValues: { email: '', password: '', remember: false },
  onSubmit: async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    if (values.email.trim() === 'taken@example.com') {
      throw new NuiFormError({ email: 'Этот адрес уже зарегистрирован' })
    }
    signedIn.value = values.email
  },
})

const emailRules = [required(), email()]
const passwordRules = [required(), min(8)]

const guests = useForm({
  initialValues: { guests: [{ name: 'Анна' }, { name: 'Борис' }] },
  onSubmit: () => undefined,
})

const newGuest = () => ({ name: '' })
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiForm :form="signIn" submit-label="Войти" style="max-inline-size: 24rem">
    <NuiFormField v-slot="{ field }" name="email" label="Почта" :rules="emailRules" required>
      <NuiInput v-bind="field" type="email" autocomplete="email" />
    </NuiFormField>
    <NuiFormField
      v-slot="{ field }"
      name="password"
      label="Пароль"
      description="Не короче 8 символов"
      :rules="passwordRules"
      required
    >
      <NuiInput v-bind="field" type="password" autocomplete="current-password" />
    </NuiFormField>
    <NuiFormField v-slot="{ field }" name="remember">
      <NuiCheckbox v-bind="field">Запомнить меня</NuiCheckbox>
    </NuiFormField>
  </NuiForm>
  <p v-if="signedIn">Вход выполнен: {{ signedIn }}</p>
</div>

```vue
<script setup lang="ts">
import { NuiCheckbox, NuiInput } from '@numior/vue';
import { NuiForm, NuiFormError, NuiFormField, email, min, required, useForm } from '@numior/forms';
import '@numior/vue/styles.css';
import '@numior/forms/styles.css';

interface SignIn {
  email: string;
  password: string;
  remember: boolean;
}

const form = useForm<SignIn>({
  initialValues: { email: '', password: '', remember: false },
  onSubmit: async (values, { signal }) => {
    const response = await fetch('/api/sign-in', {
      method: 'POST',
      body: JSON.stringify(values),
      signal,
    });

    if (response.status === 409) {
      throw new NuiFormError({ email: 'Этот адрес уже зарегистрирован' });
    }
  },
});

const emailRules = [required(), email()];
const passwordRules = [required(), min(8)];
</script>

<template>
  <NuiForm :form="form" submit-label="Войти">
    <NuiFormField
      v-slot="{ field }"
      :form="form"
      name="email"
      label="Почта"
      :rules="emailRules"
      required
    >
      <NuiInput v-bind="field" type="email" autocomplete="email" />
    </NuiFormField>
    <NuiFormField
      v-slot="{ field }"
      :form="form"
      name="password"
      label="Пароль"
      :rules="passwordRules"
      required
    >
      <NuiInput v-bind="field" type="password" autocomplete="current-password" />
    </NuiFormField>
    <NuiFormField v-slot="{ field }" :form="form" name="remember">
      <NuiCheckbox v-bind="field">Запомнить меня</NuiCheckbox>
    </NuiFormField>
  </NuiForm>
</template>
```

Стили подключаются явно: весь пакет — `@numior/forms/styles.css`, отдельные компоненты —
`@numior/forms/styles/form.css`, `field-array.css` и `smart-form.css`. Контролам нужны свои
стили из `@numior/vue`.

## Поля

`NuiFormField` оборачивает [`NuiField`](/components/field): подпись, описание, ошибка,
`aria-invalid`, `aria-describedby` и отметка обязательности идут через контекст поля, поэтому
контрол внутри ничего не знает о форме. Слот получает `field` — привязку
`{ name, modelValue, 'onUpdate:modelValue' }` для `v-bind` — и состояние: `value`,
`setValue`, `error`, `invalid`, `touched`, `pending`. С `:form="form"` путь сверяется с
путями значений, а значение типизировано; без него поле берёт ближайшую форму, которую
открывают `useForm` и `NuiForm`, и привязка подходит любому контролу.

Пути пишутся через точку: `address.city`, `contacts.0.name`; скобочные пути сервера
(`contacts[0].name`) приводятся к ним сами. Поле считается тронутым, когда фокус уходит из всего
поля, а не из контрола: список select или сегменты времени поле не покидают.

## Когда видны ошибки

По умолчанию (`validateOn: 'submit'`) форма молчит до первой попытки отправки, а после неё
каждое изменение и уход с поля перепроверяют его. `validateOn: 'blur'` или `'change'` на форме
или на поле начинает проверку раньше. Ошибки формы без поля появляются после полной попытки.

## Правила и схема

| Правило              | Проверяет                                                                    |
| -------------------- | ---------------------------------------------------------------------------- |
| `required()`         | Пусто: `undefined`, `null`, строка из пробелов, `[]` и `false`               |
| `min(n)`, `max(n)`   | Длину строки в символах, число по значению, число элементов массива          |
| `email()`            | Адрес почты                                                                  |
| `pattern(re)`        | Строку по регулярному выражению                                              |
| `custom(check)`      | `check(value, { values, name, label })` возвращает `true`, `false` или текст |
| `customAsync(check)` | Асинхронную проверку, см. ниже                                               |

Все правила, кроме `required`, пропускают пустое значение. Тексты берутся из
[словаря](/localization#formrules) на языке конфигурации, опция `{ message }` правила
побеждает. Правила поля передаются в `rules` у `NuiFormField`; правила формы — в
`useForm({ rules })` по пути или шаблону, где `*` означает индекс строки:

```ts
useForm<Signup>({
  initialValues,
  rules: {
    confirm: [
      required(),
      custom((value, { values }) => value === values.password || 'Пароли не совпадают'),
    ],
    'contacts.*.name': [required()],
  },
  onSubmit,
});
```

Правила, `validateOn`, `debounce` и `keepValue` поле читает при монтировании. Правило,
которое зависит от других значений, берёт их из контекста — `custom((value, { values }) => …)`:
после попытки отправки каждое изменение перепроверяет всю форму, поэтому «Пароли не совпадают»
пропадёт, как только пароль исправят. Чтобы сменить сами правила, пересоздайте поле
через `key`.

`schema` принимает любую схему Standard Schema v1 — zod, valibot, arktype — без адаптеров.
Issue схемы достаётся ближайшему видимому полю на своём пути; issue без пути — ошибка формы;
issue на пути, которого пользователь не видит, не блокирует отправку и возвращается в
`validate().ignored`. Если схема прошла без единого issue, её вывод приходит в `onSubmit`
как `output`.

## Асинхронные проверки

```ts
const loginRules = [
  required(),
  customAsync(async (value, { signal }) => {
    const response = await fetch(`/api/logins/${value}`, { signal });
    return response.ok ? 'Этот логин уже занят' : undefined;
  }),
];
```

`customAsync` запускается, только когда синхронные правила поля прошли. После изменения —
через `debounce` (300 мс, проп поля), после ухода с поля — сразу, при отправке и `validate()` —
сразу и с ожиданием результата. Побеждает последний запуск, прежние получают `abort()` в
`signal`; ответ запоминается для значения. Пока проверка идёт, `pending` в слоте поля истинен —
покажите индикатор в `suffix` контрола.

## Отправка

`NuiForm` рендерит `<form novalidate>`, поэтому Enter в текстовом поле и клик по кнопке
отправляют форму, а браузер не показывает свои подсказки. Форма владеет отправкой:
`onSubmit(values, helpers)` получает копию введённых значений без скрытых полей, а `helpers` —
`output`, `signal`, `setErrors`, `setFieldError`, `setFormErrors` и `resetForm`. Пока обработчик
работает, форма помечена `aria-busy`, кнопка остаётся в фокусе и в прежней ширине, повторная
отправка игнорируется. После успеха отправленные значения становятся начальными, правки,
сделанные во время ожидания, остаются изменёнными.

Серверные ошибки бросаются как `NuiFormError`: `throw new NuiFormError({ email: 'Занят' },
'Сервис недоступен')`. Ошибка поля живёт, пока значение поля не изменится; ошибки без поля и на
путях без видимого поля попадают в блок над полями. После неудачной отправки фокус идёт на первое
невалидное поле в порядке документа, иначе на блок ошибок. Другие исключения пробрасываются
дальше.

`form.submit()` возвращает `{ status, invalid, formErrors }`, где `status` — `submitted`,
`invalid`, `rejected`, `ignored` (отправка уже идёт) или `aborted` (форму сбросили во время
отправки). Нативная кнопка `type="reset"` и `resetForm()` сбрасывают форму и отменяют
незавершённую работу; `resetForm({ values })` загружает новый документ.

## Скрытые и отключённые поля

Поле, которое не отрендерено (`v-if`, условие умной формы, неактивный шаг-контейнер), выпадает
из проверки и из отправки, но его значение остаётся: вернувшееся поле покажет прежний текст.
`:keep-value="false"` очищает значение при скрытии. Значение, которое не показывало ни одно
поле, отправляется как есть. Отключённое поле отправляется, но не проверяется;
`NuiForm disabled` отключает все поля и кнопку.

## Черновики контролов

Числовое поле, поле времени, свой текст комбобокса и `v-model.lazy` у текстовых полей держат
неподтверждённый ввод до Enter или ухода с поля. `NuiFormField` подтверждает его перед
отправкой, поэтому `requestSubmit()` из горячей клавиши не теряет набранное.

## Повторяемые группы

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiForm :form="guests" submit-label="Сохранить" style="max-inline-size: 28rem">
    <NuiFieldArray v-slot="{ row }" name="guests" label="Гости" :min="1" :max="4" :new-row="newGuest" reorderable>
      <NuiFormField v-slot="{ field }" :name="`${row.path}.name`" label="Имя" :rules="[required()]">
        <NuiInput v-bind="field" />
      </NuiFormField>
    </NuiFieldArray>
  </NuiForm>
</div>

```vue
<NuiFieldArray
  v-slot="{ row }"
  :form="form"
  name="guests"
  label="Гости"
  :min="1"
  :max="4"
  :new-row="() => ({ name: '' })"
  reorderable
>
  <NuiFormField v-slot="{ field }" :name="`${row.path}.name`" label="Имя" :rules="[required()]">
    <NuiInput v-bind="field" />
  </NuiFormField>
</NuiFieldArray>
```

`NuiFieldArray` — `fieldset` со строками-карточками. Состояние полей, их ошибки и фокус идут
за строкой, а не за индексом. `min` прячет удаление, `max` выключает добавление и показывает
текст предела. `reorderable` добавляет грип: мышью строку ведёт «призрак», линия вставки
встаёт между строками; с клавиатуры пробел или Enter захватывает и отпускает, стрелки двигают,
Escape отменяет. Грип виден при наведении и фокусе (на тач-экранах всегда) и скрыт, когда
строку некуда двигать. Ошибка строки (`guests.1`) показывается в строке, ошибка списка — под
ним. `useFieldArray` даёт то же без разметки: `fields`, `push`, `prepend`, `insert`, `remove`,
`move`, `swap`, `replace`, `update`.

## Движок

Значения, состояние полей и ключи строк держит движок формы. По умолчанию это собственный движок
пакета. Если приложение уже живёт на vee-validate, подключите его движок из отдельной точки
входа — основная точка входа vee-validate не загружает:

```ts
import { useForm } from '@numior/forms';
import { veeValidateEngine } from '@numior/forms/vee-validate';

const form = useForm({ initialValues, engine: veeValidateEngine, onSubmit });
```

Проверки, отправка, ошибки и фокус остаются за `@numior/forms`, а vee-validate хранит значения и
состояние полей. Ваши компоненты на `useField` из vee-validate внутри такой формы читают и пишут
те же значения, devtools vee-validate её показывают; собственные правила таких полей в проверки
`@numior/forms` не входят — задайте их через `NuiFormField` или `useField` пакета. Нужен
`vee-validate` 5 (необязательная peer-зависимость); адаптер проверен на `5.0.0-beta.1`. Свой
движок — например, хранилище в Pinia — подключается так же: фабрика с типом `FormEngineFactory`.

## Доступность

Ошибки связаны с контролом через `aria-describedby` и `aria-invalid`; блок ошибок формы —
`NuiAlert` с `role="alert"`, который пересоздаётся на каждой попытке, чтобы его объявили снова.
Фокус после неудачной отправки видим и с клавиатуры (`:focus-visible`), кнопка отправки не
теряет фокус во время ожидания. В группах добавление, удаление и каждый шаг перестановки
объявляются в live-регионе, а фокус переходит в новую строку, в соседнюю после удаления или
на грип после перестановки.

## API

`useForm<Values, Output = Values>(options)`:

| Опция           | Тип                               | По умолчанию | Описание                        |
| --------------- | --------------------------------- | ------------ | ------------------------------- |
| `initialValues` | `Values`                          | —            | Начальные значения              |
| `onSubmit`      | `(values, helpers) => unknown`    | —            | Обработчик отправки             |
| `schema`        | Standard Schema v1                | —            | Схема значений                  |
| `rules`         | `Record<путь \| шаблон, правила>` | —            | Правила формы                   |
| `validateOn`    | `'submit' \| 'blur' \| 'change'`  | `'submit'`   | Когда поля начинают проверяться |
| `engine`        | `FormEngineFactory`               | свой движок  | Движок значений, см. «Движок»   |

Контекст формы: `values`, `errors`, `errorBag`, `formErrors`, `touched`, `meta` (`valid`,
`dirty`, `touched`, `pending`, `submitCount`, `submitted`), `setFieldValue`, `setValues`,
`setFieldError`, `setErrors`, `setFormErrors`, `isFieldDirty`, `isFieldTouched`,
`hasErrors(prefix?)`, `errorsUnder(prefix)`, `firstInvalidPath(prefix?)`, `focusField(path)`,
`validate({ paths?, silent? })`, `validateField(path)`, `resetForm({ values?, keepErrors? })`,
`submit()` и `settled()`. `useField(path, options)` связывает свой контрол без `NuiFormField`.

`NuiForm`:

| Prop           | Тип                           | По умолчанию                                                | Описание                    |
| -------------- | ----------------------------- | ----------------------------------------------------------- | --------------------------- |
| `form`         | `FormContext`                 | —                                                           | Контекст из `useForm`       |
| `disabled`     | `boolean`                     | `false`                                                     | Отключает поля и отправку   |
| `submitAction` | `() => Promise<SubmitResult>` | `form.submit`                                               | Своё действие отправки      |
| `submitLabel`  | `string`                      | [словарь](/localization#form): «Отправить»                  | Подпись кнопки по умолчанию |
| `errorTitle`   | `string`                      | [словарь](/localization#form): «Не удалось отправить форму» | Заголовок блока ошибок      |

Слоты: default — поля; `form-errors` (`{ errors }`) заменяет блок ошибок; `actions`
(`{ pending, dirty, submit, reset }`) заменяет кнопку. Событие `reset`. Методы
`requestSubmit()` и `reset()`.

`NuiFormField`:

| Prop                                              | Тип                              | По умолчанию | Описание                                  |
| ------------------------------------------------- | -------------------------------- | ------------ | ----------------------------------------- |
| `name`                                            | путь формы                       | —            | Путь значения                             |
| `form`                                            | `FormContext`                    | ближайшая    | Типизирует путь и значение                |
| `label`, `description`, `required`, `group`, `id` | как у `NuiField`                 | —            | Разметка поля                             |
| `disabled`                                        | `boolean`                        | —            | Отправляется, но не проверяется           |
| `rules`                                           | правила                          | —            | Правила поля                              |
| `validateOn`                                      | `'submit' \| 'blur' \| 'change'` | как у формы  | Когда поле начинает проверяться           |
| `debounce`                                        | `number`                         | `300`        | Задержка асинхронной проверки после ввода |
| `keepValue`                                       | `boolean`                        | `true`       | `false` очищает значение при скрытии      |

`NuiFieldArray`:

| Prop                       | Тип                 | По умолчанию                                           | Описание                              |
| -------------------------- | ------------------- | ------------------------------------------------------ | ------------------------------------- |
| `name`                     | путь массива        | —                                                      | Путь значения                         |
| `form`                     | `FormContext`       | ближайшая                                              | Форма                                 |
| `label`, `description`     | `string`            | —                                                      | Подпись и описание `fieldset`         |
| `newRow`                   | `() => Row`         | —                                                      | Новая строка; без него нет добавления |
| `min`, `max`               | `number`            | —                                                      | Пределы числа строк                   |
| `reorderable`              | `boolean`           | `false`                                                | Перестановка мышью и клавиатурой      |
| `disabled`                 | `boolean`           | —                                                      | Отключает строки и действия           |
| `rules`, `validateOn`      | правила списка      | —                                                      | Правила числа и состава строк         |
| `addLabel`                 | `string`            | [словарь](/localization#fieldarray): «Добавить строку» | Кнопка добавления                     |
| `emptyLabel`               | `string`            | [словарь](/localization#fieldarray): «Строк пока нет»  | Пустой список                         |
| `removeLabel`, `moveLabel` | `(index) => string` | [словарь](/localization#fieldarray)                    | `aria-label` удаления и грипа         |

Слоты: default (`{ row, remove, first, last }`, `row` — `{ key, index, path, value }`),
`row-actions` (`{ row, remove, canRemove }`), `add` (`{ push, canAdd }`), `empty`. Методы
`push(row)`, `remove(index)`, `move(from, to)`.

Блоки `nui-form` (модификаторы `--pending`, `--disabled`; элементы `__errors`, `__error-list`,
`__actions`) и `nui-field-array` (модификаторы `--reorderable`, `--reordering`, `--disabled`,
`--invalid`; элементы `__label`, `__description`, `__list`, `__rows`, `__row` с `--dragging`,
`--invalid`, `__grip`, `__content`, `__remove`, `__row-error`, `__indicator`, `__ghost`, `__error`,
`__empty`, `__footer`, `__add`, `__limit`, `__live`).
