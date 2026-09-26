# Smart form

`NuiSmartForm` builds a form from a config: fields with any of the kit's controls, sections
with their own layout, conditional fields, repeated groups and steps. `formConfig<Values>()`
assembles the config: `name` is checked against the paths of the values and `props` against
the props of the control itself. Underneath sit the same `useForm`, `NuiForm`, `NuiFormField`
and `NuiFieldArray` as in [hand-made forms](/en/components/form).

<script setup>
import { ref } from 'vue'
import { NuiCheckbox, NuiInput, NuiNumberField, NuiRadioGroup } from '@numior/vue'
import { NuiFormError, email, formConfig, min, required, useForm } from '@numior/forms'

const { field, section, array } = formConfig()
const row = formConfig()

const isCompany = (values) => values.kind === 'company'

const profileFields = [
  section({
    title: 'Profile',
    layout: '"kind kind" "name email" "company vat"',
    fields: [
      field(NuiRadioGroup, { name: 'kind', label: 'Account type', group: true }),
      field(NuiInput, { name: 'name', label: 'Name', required: true, rules: [required()] }),
      field(NuiInput, { name: 'email', label: 'Email', required: true, rules: [required(), email()], props: { type: 'email' } }),
      field(NuiInput, { name: 'company', label: 'Company', required: true, when: isCompany, rules: [required()] }),
      field(NuiInput, { name: 'vat', label: 'VAT number', when: isCompany }),
    ],
  }),
  section({
    title: 'Contacts',
    description: 'One to three',
    fields: [
      array({
        name: 'contacts',
        min: 1,
        max: 3,
        reorderable: true,
        layout: '"name phone"',
        addLabel: 'Add contact',
        newRow: () => ({ name: '', phone: '' }),
        fields: [
          row.field(NuiInput, { name: 'name', label: 'Name', required: true, rules: [required()] }),
          row.field(NuiInput, { name: 'phone', label: 'Phone', props: { type: 'tel' } }),
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
    label: 'Account',
    description: 'Email and password',
    fields: [
      field(NuiInput, { name: 'email', label: 'Email', required: true, rules: [required(), email()], props: { type: 'email' } }),
      field(NuiInput, { name: 'password', label: 'Password', required: true, rules: [required(), min(8)], props: { type: 'password' } }),
    ],
  },
  {
    value: 'team',
    label: 'Team',
    layout: '"team size"',
    fields: [
      field(NuiInput, { name: 'team', label: 'Name', required: true, rules: [required()] }),
      field(NuiNumberField, { name: 'size', label: 'People', props: { min: 1 } }),
    ],
  },
  {
    value: 'confirm',
    label: 'Confirmation',
    fields: [field(NuiCheckbox, { name: 'rules', rules: [required({ message: 'Accept the rules to go on' })] })],
  },
]

const created = ref('')

const wizard = useForm({
  initialValues: { email: '', password: '', team: '', size: 5, rules: false },
  onSubmit: async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    if (values.email.trim() === 'taken@example.com') {
      throw new NuiFormError({ email: 'This address is already registered' })
    }
    created.value = values.team
  },
})
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiSmartForm :form="profile" :fields="profileFields" submit-label="Save">
    <template #kind="{ field }">
      <NuiRadioGroup v-bind="field" orientation="horizontal">
        <NuiRadio value="person">Person</NuiRadio>
        <NuiRadio value="company">Company</NuiRadio>
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
    title: 'Profile',
    layout: '"kind kind" "name email" "company vat"',
    fields: [
      field(NuiRadioGroup, { name: 'kind', label: 'Account type', group: true }),
      field(NuiInput, { name: 'name', label: 'Name', required: true, rules: [required()] }),
      field(NuiInput, {
        name: 'email',
        label: 'Email',
        rules: [required(), email()],
        props: { type: 'email' },
      }),
      field(NuiInput, { name: 'company', label: 'Company', when: isCompany, rules: [required()] }),
      field(NuiInput, { name: 'vat', label: 'VAT number', when: isCompany }),
    ],
  }),
  section({
    title: 'Contacts',
    fields: [
      array({
        name: 'contacts',
        min: 1,
        max: 3,
        reorderable: true,
        layout: '"name phone"',
        newRow: () => ({ name: '', phone: '' }),
        fields: [
          row.field(NuiInput, { name: 'name', label: 'Name', rules: [required()] }),
          row.field(NuiInput, { name: 'phone', label: 'Phone', props: { type: 'tel' } }),
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
  <NuiSmartForm :form="form" :fields="fields" submit-label="Save">
    <template #kind="{ field }">
      <NuiRadioGroup v-bind="field" orientation="horizontal">
        <NuiRadio value="person">Person</NuiRadio>
        <NuiRadio value="company">Company</NuiRadio>
      </NuiRadioGroup>
    </template>
  </NuiSmartForm>
</template>
```

## Config

`field(Component, options)` describes a field: `name`, `label`, `description`, `required`,
`disabled`, `group`, `rules`, `validateOn`, `keepValue` — as on `NuiFormField` — plus the
control's `props`, `when` and `area`. `props` are typed from the component without the keys the
form controls (`modelValue`, `id`, `name`, `invalid`, `required`, `disabled`) and with native
attributes; instead of an object you can pass a function of the values —
`props: (values) => ({ options: citiesOf(values.country) })`. `rules` are typed by the field
value: a `custom((value, { values }) => …)` rule written in the config gets `value` of the field's
type and `values` of the config's type, and a typo such as `value.lenght` fails the type check.

`section({ title, description, layout, fields })` renders a `fieldset` with a legend, and a
divider runs between neighbouring sections. `array({ name, label, description, min, max,
reorderable, newRow, layout, fields })` renders a
[`NuiFieldArray`](/en/components/form#repeated-groups): `formConfig<Row>()` describes the row
fields, and their paths are relative to the row.

## Conditions

`when(values, row)` shows a field, a section or a group while it returns `true`. A hidden field
drops out of validation and submission even if it was never shown, yet its value stays: a field
that comes back shows the old text. `keepValue: false` clears the value when the field hides. A
row field's `when` also gets the row's value, and in the rules of a row field `values` is the row
itself, so a rule like “the phone is required once an email is set” lives in the row config. The condition is recomputed in the same render as
the value change, and an appearing field moves through the motion tokens.

## Layout

`layout` uses the `grid-template-areas` syntax: `'"name email" "about about"'`. Area names are
field names (dots become hyphens) or the `area` from the config. The DOM follows the reading
order of the layout, so Tab walks the fields left to right and top to bottom; rows whose
fields are all hidden drop out, and a hidden field inside a row leaves an empty cell. A field
without a place in the layout takes the first free cell after it, and a form without `layout`
is one column. When the form is narrower than `36rem` (a container query, not the window
width), the layout collapses into a column, so the same form works in a dialog and on a phone.

`inline` puts the fields in a row — for filters above a table; `inline="grow"` stretches them
across the width. The button lines up with the controls, and on a narrow container it moves
below the fields.

## Slots

A slot named after a field path replaces the control and gets what the `NuiFormField` slot
gets: `field` for `v-bind`, `value`, `setValue`, `error`, `invalid`, `touched`, `pending`, and
inside a group `row`. A `path:after` slot adds content to the cell under the field — a
character counter, a link, a hint. Row field paths drop the index (`contacts.phone`); a dotted
name is written as a dynamic slot in a template: `<template #[PHONE_AFTER]>` with
`const PHONE_AFTER = 'contacts.phone:after'`.

Slot names come from the type of the values: a typo such as `#emial`, or reaching for `field`
in an `:after` slot, fails the type check. The `actions` (`{ pending, dirty, submit, reset,
step, first, last, back }`) and `form-errors` slots replace the buttons and the error block.

## Steps

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiSmartForm v-model:step="step" :form="wizard" :steps="wizardSteps" submit-label="Create team" style="max-inline-size: 36rem">
    <template #rules="{ field }">
      <NuiCheckbox v-bind="field">I accept the team rules</NuiCheckbox>
    </template>
  </NuiSmartForm>
  <p v-if="created">Team “{{ created }}” created.</p>
</div>

```vue
<NuiSmartForm v-model:step="step" :form="form" :steps="steps" submit-label="Create team">
  <template #rules="{ field }">
    <NuiCheckbox v-bind="field">I accept the team rules</NuiCheckbox>
  </template>
</NuiSmartForm>
```

`steps` is a list of `{ value, label, description?, layout?, fields }`, and `v-model:step`
holds the value of the current step; without the model the form starts at the first one. A
[`NuiStepper`](/en/components/stepper) sits above the fields. Every panel stays mounted, so
values and errors of past steps are kept and only the inactive panels are hidden.

Next, and Enter in a field of an intermediate step, check only that step's fields: on an error
focus goes to the first invalid field, otherwise to the first field of the next step, and a
live region announces “Step 2 of 3: Team”. Back and a click on a completed step of the stepper
do not check anything. The last button submits the whole form; if an error — a server one too,
like the taken@example.com address in the example — lands on another step, the form opens that
step and focuses the field. The stepper marks as failed only the steps that were checked. A
reset returns to the first step.

## Accessibility

Sections are a `fieldset` with a `legend`, groups a `fieldset` with their own live region, and
steps are groups named after the step below the stepper's navigation. The DOM order matches the
reading order of the layout. Everything else — errors, focus after a failure, `aria-busy`, the
waiting button — works as on [`NuiForm`](/en/components/form#accessibility).

## API

| Prop           | Type                          | Default                                          | Description                                |
| -------------- | ----------------------------- | ------------------------------------------------ | ------------------------------------------ |
| `form`         | `FormContext<Values>`         | —                                                | Context from `useForm`                     |
| `fields`       | `NuiSmartFormEntry<Values>[]` | —                                                | Fields, sections and groups                |
| `steps`        | `NuiSmartFormStep<Values>[]`  | —                                                | Steps instead of `fields`                  |
| `v-model:step` | `string`                      | the first step                                   | Current step                               |
| `layout`       | `string`                      | —                                                | Layout in the `grid-template-areas` syntax |
| `inline`       | `boolean \| 'grow'`           | —                                                | Fields in a row                            |
| `disabled`     | `boolean`                     | `false`                                          | Disables fields and buttons                |
| `submitLabel`  | `string`                      | [dictionary](/en/localization#form): “Submit”    | Submit button                              |
| `nextLabel`    | `string`                      | [dictionary](/en/localization#smartform): “Next” | Next step button                           |
| `backLabel`    | `string`                      | [dictionary](/en/localization#smartform): “Back” | Previous step button                       |

Slots: `[path]`, `[path]:after`, `actions`, `form-errors`. Methods `requestSubmit()` and
`back()`. Types `NuiSmartFormSlots<Values>`, `NuiSmartFormFieldScope`,
`NuiSmartFormAfterScope`, `NuiSmartFormActionsScope`, `FormSlotPath<Values>`.

Block `nui-smart-form` (modifiers `--inline`, `--grow`, `--steps`, `--back`, `--navigated`;
elements `__grid` with `--layout`, `__cell` with `--appearing` and `--entering`, `__section`,
`__legend`, `__section-description`, `__stepper`, `__step`, `__back`, `__next`, `__live`).
Variables: `--_columns`, `--_layout-columns`, `--_areas`, `--_area`, `--_slide`.
