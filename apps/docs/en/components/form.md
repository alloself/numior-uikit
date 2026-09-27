# Forms

`@numior/forms` builds forms from the kit's controls. `useForm` holds the values, errors and
submission, `NuiForm` renders a native `<form>` with an error block and a button,
`NuiFormField` binds a form value to a control through `v-bind="field"`, and `NuiFieldArray`
repeats a group of fields. The package has no outside dependencies: its own engine holds the
values, and vee-validate plugs in on request (see “Engine”). Forms built from a config live on
the [smart form](/en/components/smart-form) page.

<script setup>
import { ref } from 'vue'
import { NuiFormError, email, min, required, useForm } from '@numior/forms'

const signedIn = ref('')

const signIn = useForm({
  initialValues: { email: '', password: '', remember: false },
  onSubmit: async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    if (values.email.trim() === 'taken@example.com') {
      throw new NuiFormError({ email: 'This address is already registered' })
    }
    signedIn.value = values.email
  },
})

const emailRules = [required(), email()]
const passwordRules = [required(), min(8)]

const guests = useForm({
  initialValues: { guests: [{ name: 'Ann' }, { name: 'Bob' }] },
  onSubmit: () => undefined,
})

const newGuest = () => ({ name: '' })
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiForm :form="signIn" submit-label="Sign in" style="max-inline-size: 24rem">
    <NuiFormField v-slot="{ field }" :form="signIn" :name="(v) => v.email" label="Email" :rules="emailRules" required>
      <NuiInput v-bind="field" type="email" autocomplete="email" />
    </NuiFormField>
    <NuiFormField
      v-slot="{ field }"
      :form="signIn"
      :name="(v) => v.password"
      label="Password"
      description="At least 8 characters"
      :rules="passwordRules"
      required
    >
      <NuiInput v-bind="field" type="password" autocomplete="current-password" />
    </NuiFormField>
    <NuiFormField v-slot="{ field }" :form="signIn" :name="(v) => v.remember">
      <NuiCheckbox v-bind="field">Remember me</NuiCheckbox>
    </NuiFormField>
  </NuiForm>
  <p v-if="signedIn">Signed in: {{ signedIn }}</p>
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
      throw new NuiFormError({ email: 'This address is already registered' });
    }
  },
});

const emailRules = [required(), email()];
const passwordRules = [required(), min(8)];
</script>

<template>
  <NuiForm :form="form" submit-label="Sign in">
    <NuiFormField
      v-slot="{ field }"
      :form="form"
      :name="(v) => v.email"
      label="Email"
      :rules="emailRules"
      required
    >
      <NuiInput v-bind="field" type="email" autocomplete="email" />
    </NuiFormField>
    <NuiFormField
      v-slot="{ field }"
      :form="form"
      :name="(v) => v.password"
      label="Password"
      :rules="passwordRules"
      required
    >
      <NuiInput v-bind="field" type="password" autocomplete="current-password" />
    </NuiFormField>
    <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.remember">
      <NuiCheckbox v-bind="field">Remember me</NuiCheckbox>
    </NuiFormField>
  </NuiForm>
</template>
```

Styles are opt-in: the whole package through `@numior/forms/styles.css`, single components
through `@numior/forms/styles/form.css`, `field-array.css` and `smart-form.css`. Controls need
their own styles from `@numior/vue`.

## Fields

`NuiFormField` wraps [`NuiField`](/en/components/field): the label, description, error,
`aria-invalid`, `aria-describedby` and the required mark go through the field context, so the
control inside knows nothing about the form. A field gets the form in `form` and a selector in
`name` — a function that reads the value: `:name="(v) => v.address.city"`. TypeScript infers
the value type from the selector, and the rules, `value`, `setValue` and the `field` binding
(`{ name, modelValue, 'onUpdate:modelValue' }` for `v-bind`) are typed by it: a control that
emits a value of another type fails type checking. The slot also gets `error`, `invalid`,
`touched` and `pending`.

A selector reads one chain of properties, through indexes and `?.` too:
`(v) => v.contacts[i]?.name`. The form records the field path (`contacts.0.name`) by calling the
selector on a proxy and checks every read against the value stored at that path. A selector with
a branch, a method call or a substitute (`v.nickname ?? v.name`) throws instead of silently
reading another field. `byPath('contacts.0.name')` gives an untyped selector for a string path,
and such a field holds an `unknown` value; bracket paths from a server (`contacts[0].name`) are
normalised to dots in `byPath`, `setFieldError` and `NuiFormError`. The form is passed
explicitly because the value type does not travel through inject: `useFormContext()` gives
descendants a `FormHandle` — everything but the values.

A field counts as touched when focus leaves the whole field rather than the control, so a
select list or the time segments never leave it.

## When errors show

By default (`validateOn: 'submit'`) the form stays quiet until the first submit attempt; after
it every change and every leave revalidates the field. `validateOn: 'blur'` or `'change'` on the
form or on a field starts checking earlier. Form errors without a field appear after a full
attempt.

## Rules and schemas

| Rule                 | Checks                                                                       |
| -------------------- | ---------------------------------------------------------------------------- |
| `required()`         | Empty: `undefined`, `null`, a whitespace string, `[]` and `false`            |
| `min(n)`, `max(n)`   | String length in characters, a number by value, the length of an array       |
| `email()`            | An email address                                                             |
| `pattern(re)`        | A string against a regular expression                                        |
| `custom(check)`      | `check(value, { values, name, label })` returns `true`, `false` or a message |
| `customAsync(check)` | An asynchronous check, see below                                             |

Every rule except `required` lets an empty value through. Messages come from the
[dictionary](/en/guide/localization#formrules) in the configured language, and a rule's
`{ message }` option wins. Field rules go to `rules` on `NuiFormField`; form rules go to
`useForm({ rules })` by path or pattern, where `*` stands for a row index:

```ts
useForm<Signup>({
  initialValues,
  rules: {
    confirm: [
      required(),
      custom((value, { values }) => value === values.password || 'Passwords do not match'),
    ],
    'contacts.*.name': [required()],
  },
  onSubmit,
});
```

Rules, `validateOn`, `debounce` and `keepValue` are reactive: a field takes them from its props
(or from a ref or a getter in `useField`), and new rules recheck the field at once when its errors
are already showing. Lists are compared rule by rule rather than as arrays: `[required(), min(3)]`
created anew on every render stays the same, and so does `custom(check)` with the same `check`.
Declare the function of an asynchronous check in `<script setup>`: written inline in the template
it is new on every render and restarts the check. A rule that depends on other values reads them
from its context — `custom((value, { values }) => …)`: after a submit attempt every change
revalidates the whole form, so “Passwords do not match” disappears as soon as the password is
fixed. `values` in the context are all current form values typed `V`, hidden fields included: a
hidden field itself drops out of validation, but its value stays in the form and the rule of a
neighbouring field sees it. The schema and the submission do not get hidden fields.

`schema` takes any Standard Schema v1 — zod, valibot, arktype — with no adapter. A schema issue
goes to the nearest visible field on its path; an issue without a path becomes a form error; an
issue on a path the user cannot see does not block submission and comes back in
`validate().ignored`. When the schema passes without a single issue, its output reaches
`onSubmit` as `output`.

## Asynchronous checks

```ts
const loginRules = [
  required(),
  customAsync(async (value, { signal }) => {
    const response = await fetch(`/api/logins/${value}`, { signal });
    return response.ok ? 'This login is taken' : undefined;
  }),
];
```

`customAsync` runs only once the field's synchronous rules pass. After a change it waits for
`debounce` (300 ms, a field prop), after a leave it runs at once, and on submit and
`validate()` it runs at once and is awaited. The latest run wins, earlier ones get `abort()`
through `signal`. The answer is remembered for the field value and for every form value the
check read from `values`: when, say, the country a document number depends on changes after the
answer, submission asks again, and a field that was already attempted is rechecked after
`debounce`. While a check runs, `pending` in the field slot is true — show an indicator in the
control's `suffix`.

## Submission

`NuiForm` renders `<form novalidate>`, so Enter in a text field and a button click submit the
form while the browser keeps its own bubbles away. The form owns submission:
`onSubmit(values, helpers)` gets a copy of the entered values without hidden fields, and
`helpers` holds `output`, `signal`, `setErrors`, `setFieldError`, `setFormErrors` and
`resetForm`. Since hidden fields are cut out, `values` are typed `SubmittedValues<V>` — a deep
partial copy in which list items may be `undefined` too; the copy is checked against the form
values before the call. The fully validated form in the schema's type comes in
`helpers.output`, present only when neither the schema nor the rules found an error. While the handler runs the form is marked `aria-busy`, the button keeps its focus
and its width, and a second submission is ignored. After a success the submitted values become
the initial ones, and edits made while waiting stay dirty.

Server errors are thrown as `NuiFormError`: `throw new NuiFormError({ email: 'Taken' },
'Service unavailable')`. A field error lives until the field value changes; errors without a
field, or on a path without a visible field, go to the block above the fields. After a failed
submission focus moves to the first invalid field in document order, otherwise to the error
block. Other exceptions propagate.

`form.submit()` returns `{ status, invalid, formErrors }`, where `status` is `submitted`,
`invalid`, `rejected`, `ignored` (a submission is already running) or `aborted` (the form was
reset meanwhile). A native `type="reset"` button and `resetForm()` reset the form and cancel
unfinished work; `resetForm({ values })` loads a new document.

## Hidden and disabled fields

A field that is not rendered (`v-if`, a smart form condition, an inactive container) drops out
of validation and submission, yet its value stays: a field that comes back shows the old text.
`:keep-value="false"` clears the value when the field hides. A value no field ever showed is
submitted as is. A disabled field is submitted but not validated; `NuiForm disabled` disables
every field and the button.

## Control drafts

The number field, the time field, the combobox's own text and `v-model.lazy` on text fields keep
unconfirmed input until Enter or leave. `NuiFormField` commits it before submission, so a
`requestSubmit()` from a shortcut never loses what was typed.

## Repeated groups

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiForm :form="guests" submit-label="Save" style="max-inline-size: 28rem">
    <NuiFieldArray v-slot="{ row }" :form="guests" :name="(v) => v.guests" label="Guests" :min="1" :max="4" :new-row="newGuest" reorderable>
      <NuiFormField v-slot="{ field }" :form="guests" :name="(v) => v.guests[row.index]?.name" label="Name" :rules="[required()]">
        <NuiInput v-bind="field" :model-value="field.modelValue ?? ''" />
      </NuiFormField>
    </NuiFieldArray>
  </NuiForm>
</div>

```vue
<NuiFieldArray
  v-slot="{ row }"
  :form="form"
  :name="(v) => v.guests"
  label="Guests"
  :min="1"
  :max="4"
  :new-row="() => ({ name: '' })"
  reorderable
>
  <NuiFormField
    v-slot="{ field }"
    :form="form"
    :name="(v) => v.guests[row.index]?.name"
    label="Name"
    :rules="[required()]"
  >
    <NuiInput v-bind="field" :model-value="field.modelValue ?? ''" />
  </NuiFormField>
</NuiFieldArray>
```

A row field reads its row by index, so its type includes `undefined`: while a row is being
removed it is already gone. `?? ''` hands the text field an empty string, and the rule types stay
honest.

`NuiFieldArray` is a `fieldset` of row cards. Field state, errors and focus follow the row
rather than its index. `min` hides removal, `max` switches adding off and shows the limit text.
`reorderable` adds a grip: with a mouse a compact opaque ghost with the row number stays
centred under the pointer and the insertion line between rows shows beside it; with the keyboard Space or Enter grabs and drops, the arrows move and Escape
cancels. The grip shows on hover and focus (always on touch screens) and hides when the row has
nowhere to go. A row error (`guests.1`) shows inside the row, a list error below the list.
`useFieldArray` gives the same without markup: `fields`, `push`, `prepend`, `insert`,
`remove`, `move`, `swap`, `replace`, `update`.

## Engine

The form engine holds the values, the field state and the row keys. By default it is the
package's own engine. If your app already runs on vee-validate, plug in its engine from a
separate entry point — the main entry never loads vee-validate:

```ts
import { useForm } from '@numior/forms';
import { veeValidateEngine } from '@numior/forms/vee-validate';

const form = useForm({ initialValues, engine: veeValidateEngine, onSubmit });
```

Checks, submission, errors and focus stay with `@numior/forms`, while vee-validate keeps the
values and the field state. Your own components built on vee-validate's `useField` read and write
the same values inside such a form, and vee-validate's devtools show it; the rules of such fields
do not join the checks of `@numior/forms` — give them through `NuiFormField` or the package's
`useField`. It needs `vee-validate` 5 (an optional peer dependency); the adapter is tested against
`5.0.0-beta.1`. Your own engine — a store in Pinia, say — plugs in the same way, as a factory
typed `FormEngineFactory`.

## Accessibility

Errors are tied to the control through `aria-describedby` and `aria-invalid`; the form error
block is an `NuiAlert` with `role="alert"`, recreated on each attempt so it is announced again.
Focus after a failed submission is visible from the keyboard too (`:focus-visible`), and the
submit button keeps focus while waiting. In groups, adding, removing and each reorder step are
announced in a live region, and focus moves into the new row, to a neighbour after removal or
to the grip after a move.

## API

`useForm<Values, Output = Values>(options)`:

| Option          | Type                             | Default    | Description                     |
| --------------- | -------------------------------- | ---------- | ------------------------------- |
| `initialValues` | `Values`                         | —          | Initial values                  |
| `onSubmit`      | `(values, helpers) => unknown`   | —          | Submit handler                  |
| `schema`        | Standard Schema v1               | —          | Schema of the values            |
| `rules`         | `Record<path \| pattern, rules>` | —          | Form rules                      |
| `validateOn`    | `'submit' \| 'blur' \| 'change'` | `'submit'` | When fields start being checked |
| `engine`        | `FormEngineFactory`              | own engine | The value engine, see “Engine”  |

The form context: `values`, `errors`, `errorBag`, `formErrors`, `touched`, `meta` (`valid`,
`dirty`, `touched`, `pending`, `submitCount`, `submitted`), `setFieldValue`, `setValues`,
`setFieldError`, `setErrors`, `setFormErrors`, `isFieldDirty`, `isFieldTouched`,
`hasErrors(prefix?)`, `errorsUnder(prefix)`, `firstInvalidPath(prefix?)`, `focusField(path)`,
`validate({ paths?, silent? })`, `validateField(path)`, `resetForm({ values?, keepErrors? })`,
`submit()` and `settled()`. `useField(selector, { form, … })` and
`useFieldArray(selector, { form, … })` bind your own controls without the components, and
`byPath(path)` is an untyped selector. `provideForm(form)` and `useFormContext()` pass
descendants a `FormHandle` without the value type.

`NuiForm`:

| Prop           | Type                          | Default                                                                | Description                    |
| -------------- | ----------------------------- | ---------------------------------------------------------------------- | ------------------------------ |
| `form`         | `FormContext<T>`              | —                                                                      | Context from `useForm`         |
| `disabled`     | `boolean`                     | `false`                                                                | Disables fields and submit     |
| `reserveError` | `boolean`                     | `false`                                                                | Room for errors in every field |
| `submitAction` | `() => Promise<SubmitResult>` | `form.submit`                                                          | Your own submit action         |
| `submitLabel`  | `string`                      | [dictionary](/en/guide/localization#form): “Submit”                    | Label of the default button    |
| `errorTitle`   | `string`                      | [dictionary](/en/guide/localization#form): “Could not submit the form” | Title of the error block       |

Slots: default — the fields; `form-errors` (`{ errors }`) replaces the error block; `actions`
(`{ pending, dirty, submit, reset }`) replaces the button. Event `reset`. Methods
`requestSubmit()` and `reset()`.

`NuiFormField`:

| Prop                                              | Type                             | Default        | Description                            |
| ------------------------------------------------- | -------------------------------- | -------------- | -------------------------------------- |
| `form`                                            | `FormContext<T>`                 | —              | The form of the value                  |
| `name`                                            | `(values: T) => R`               | —              | Selector of the value                  |
| `label`, `description`, `required`, `group`, `id` | as on `NuiField`                 | —              | Field markup                           |
| `disabled`                                        | `boolean`                        | —              | Submitted, not validated               |
| `rules`                                           | rules                            | —              | Field rules                            |
| `validateOn`                                      | `'submit' \| 'blur' \| 'change'` | as on the form | When the field starts being checked    |
| `debounce`                                        | `number`                         | `300`          | Delay of an async check after typing   |
| `keepValue`                                       | `KeepValue<R>`                   | `true`         | `false` clears the value when hidden   |
| `reserveError`                                    | `boolean`                        | as on the form | Room for the error while there is none |

`NuiFieldArray`:

| Prop                       | Type                   | Default                                                        | Description                            |
| -------------------------- | ---------------------- | -------------------------------------------------------------- | -------------------------------------- |
| `form`                     | `FormContext<T>`       | —                                                              | The form of the value                  |
| `name`                     | `(values: T) => Row[]` | —                                                              | Selector of the array                  |
| `label`, `description`     | `string`               | —                                                              | Legend and description of the fieldset |
| `newRow`                   | `() => Row`            | —                                                              | A new row; without it there is no add  |
| `min`, `max`               | `number`               | —                                                              | Limits of the row count                |
| `reorderable`              | `boolean`              | `false`                                                        | Mouse and keyboard reordering          |
| `disabled`                 | `boolean`              | —                                                              | Disables rows and actions              |
| `rules`, `validateOn`      | list rules             | —                                                              | Rules for the count and the rows       |
| `addLabel`                 | `string`               | [dictionary](/en/guide/localization#fieldarray): “Add row”     | Add button                             |
| `emptyLabel`               | `string`               | [dictionary](/en/guide/localization#fieldarray): “No rows yet” | Empty list                             |
| `removeLabel`, `moveLabel` | `(index) => string`    | [dictionary](/en/guide/localization#fieldarray)                | `aria-label` of remove and the grip    |

Slots: default (`{ row, remove, first, last }`, where `row` is `{ key, index, path, value }`),
`row-actions` (`{ row, remove, canRemove }`), `add` (`{ push, canAdd }`), `empty`. Methods
`push(row)`, `remove(index)`, `move(from, to)`.

Blocks `nui-form` (modifiers `--pending`, `--disabled`; elements `__errors`, `__error-list`,
`__actions`) and `nui-field-array` (modifiers `--reorderable`, `--reordering`, `--disabled`,
`--invalid`; elements `__label`, `__description`, `__list`, `__rows`, `__row` with
`--dragging`, `--invalid`, `__grip`, `__content`, `__remove`, `__row-error`, `__indicator`,
`__ghost`, `__error`, `__empty`, `__footer`, `__add`, `__limit`, `__live`).
