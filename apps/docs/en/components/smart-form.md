# Smart form

`NuiSmartForm` builds a form from a config: fields with any of the kit's controls, sections
with their own layout, conditional fields, repeated groups and steps. `formConfig<Values>()`
assembles the config: a field reads its value with a selector, `props` are checked against the
props of the control itself, and the value type against what the control accepts and emits. Underneath sit the same `useForm`, `NuiForm`, `NuiFormField`
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
      field(NuiRadioGroup, (v) => v.kind, { label: 'Account type', group: true, props: { orientation: 'horizontal' } }),
      field(NuiInput, (v) => v.name, { label: 'Name', required: true, rules: [required()] }),
      field(NuiInput, (v) => v.email, { label: 'Email', required: true, rules: [required(), email()], props: { type: 'email' } }),
      field(NuiInput, (v) => v.company, { label: 'Company', required: true, when: isCompany, rules: [required()] }),
      field(NuiInput, (v) => v.vat, { label: 'VAT number', when: isCompany }),
    ],
  }),
  section({
    title: 'Contacts',
    description: 'One to three',
    fields: [
      array((v) => v.contacts, {
        min: 1,
        max: 3,
        reorderable: true,
        layout: '"name phone"',
        addLabel: 'Add contact',
        newRow: () => ({ name: '', phone: '' }),
        fields: [
          row.field(NuiInput, (r) => r.name, { label: 'Name', required: true, rules: [required()] }),
          row.field(NuiInput, (r) => r.phone, { label: 'Phone', props: { type: 'tel' } }),
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
      field(NuiInput, (v) => v.email, { label: 'Email', required: true, rules: [required(), email()], props: { type: 'email' } }),
      field(NuiInput, (v) => v.password, { label: 'Password', required: true, rules: [required(), min(8)], props: { type: 'password' } }),
    ],
  },
  {
    value: 'team',
    label: 'Team',
    layout: '"team size"',
    fields: [
      field(NuiInput, (v) => v.team, { label: 'Name', required: true, rules: [required()] }),
      field(NuiNumberField, (v) => v.size, { label: 'People', props: { min: 1 } }),
    ],
  },
  {
    value: 'confirm',
    label: 'Confirmation',
    fields: [field(NuiCheckbox, (v) => v.rules, { rules: [required({ message: 'Accept the rules to go on' })] })],
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
    <template #kind>
      <NuiRadio value="person">Person</NuiRadio>
      <NuiRadio value="company">Company</NuiRadio>
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
      field(NuiRadioGroup, (v) => v.kind, {
        label: 'Account type',
        group: true,
        props: { orientation: 'horizontal' },
      }),
      field(NuiInput, (v) => v.name, { label: 'Name', required: true, rules: [required()] }),
      field(NuiInput, (v) => v.email, {
        label: 'Email',
        rules: [required(), email()],
        props: { type: 'email' },
      }),
      field(NuiInput, (v) => v.company, { label: 'Company', when: isCompany, rules: [required()] }),
      field(NuiInput, (v) => v.vat, { label: 'VAT number', when: isCompany }),
    ],
  }),
  section({
    title: 'Contacts',
    fields: [
      array((v) => v.contacts, {
        min: 1,
        max: 3,
        reorderable: true,
        layout: '"name phone"',
        newRow: () => ({ name: '', phone: '' }),
        fields: [
          row.field(NuiInput, (r) => r.name, { label: 'Name', rules: [required()] }),
          row.field(NuiInput, (r) => r.phone, { label: 'Phone', props: { type: 'tel' } }),
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
    <template #kind>
      <NuiRadio value="person">Person</NuiRadio>
      <NuiRadio value="company">Company</NuiRadio>
    </template>
  </NuiSmartForm>
</template>
```

## Config

`field(Component, (v) => v.email, options)` describes a field: the control, the value selector
and optional `label`, `description`, `required`, `disabled`, `group`, `rules`, `validateOn`,
`keepValue` — as on `NuiFormField` — plus the control's `props`, `when` and `area`. The selector
is the second argument so that TypeScript infers the value type before the rules. The value type
must fit the control: `field(NuiCheckbox, (v) => v.name)` for a string `name` fails the type
check, and so does a control that emits a value wider than the field type in
`update:modelValue`. `props` are typed from the component without the keys the
form controls (`modelValue`, `id`, `name`, `invalid`, `required`, `disabled`) and with native
attributes; instead of an object you can pass a function of the values —
`props: (values) => ({ options: citiesOf(values.country) })`. `rules` are typed by the field
value: a `custom((value, { values }) => …)` rule written in the config gets `value` of the field's
type and `values` of the config's type, and a typo such as `value.lenght` fails the type check.

A control with a named model connects through `model`: multiple `NuiSelect`, `NuiCombobox`,
`NuiList` and `NuiTree` keep their array in `v-model:values`, so
`field(NuiSelect, (v) => v.topics, { model: 'values', props: { multiple: true, options } })`
passes the value to `values` and listens to `update:values`. The value type and the event check
come from that model, and `props` do not accept it.

`section({ title, description, layout, fields })` renders a `fieldset` with a legend, and a
divider runs between neighbouring sections. `array((v) => v.contacts, { label, description, min,
max, reorderable, newRow, layout, fields })` renders a
[`NuiFieldArray`](/en/components/form#repeated-groups): `formConfig<Row>()` describes the row
fields, and their selectors read the row — `row.field(NuiInput, (r) => r.phone)`.

## Conditions

`when(values, row)` shows a field, a section or a group while it returns `true`. A hidden field
drops out of validation and submission even if it was never shown, yet its value stays: a field
that comes back shows the old text. `keepValue: false` deletes the value when the field hides, so
it is allowed only when the value type admits `undefined` (`company?: string`): otherwise
`values` would lie about their type after the field hides, and the type check rejects it. A
row field's `when` also gets the row's value, and in the rules of a row field `values` is the row
itself, so a rule like “the phone is required once an email is set” lives in the row config. The condition is recomputed in the same render as
the value change. Fields come and go through the motion tokens in both directions: a new field
fades in, a hidden one fades out where it stood, the neighbours slide to their new places and the
grid height eases to the new one, so nothing below the form jumps. Fields above the change stay
where they are, and appearing or fading fields show only inside their section: the grid edge
clips them while its height changes. With `reduced motion` it all happens at once.

## Layout

`layout` uses the `grid-template-areas` syntax: `'"name email" "about about"'`. Area names are
field paths relative to the form or the row (dots become hyphens) or the `area` from the
config. The DOM follows the reading
order of the layout, so Tab walks the fields left to right and top to bottom; rows whose
fields are all hidden drop out, and a hidden field inside a row leaves an empty cell. A field
without a place in the layout takes the first free cell after it, and a form without `layout`
is one column. When the form is narrower than `36rem` (a container query, not the window
width), the layout collapses into a column, so the same form works in a dialog and on a phone.

`inline` puts the fields in a row — for filters above a table; `inline="grow"` stretches them
across the width. The button lines up with the controls, and on a narrow container it moves
below the fields.

## Slots

A slot named after a field path is the content of the control, that is its default slot: the
radios of a group, the label of a checkbox. It gets `error`, `invalid`, `touched`, `pending`, and
inside a group `row`. The slot gets no value or binding: the control from the config is already
bound to the field, and a whole custom control goes to `field()` as a component, where its model
type is checked the same way. A `path:after` slot adds content to the cell under the field — a
character counter, a link, a hint. Row field paths drop the index (`contacts.phone`); a dotted
name is written as a dynamic slot in a template: `<template #[PHONE_AFTER]>` with
`const PHONE_AFTER = 'contacts.phone:after'`.

Slot names come from the type of the values: a typo such as `#emial`, or reaching for `pending`
in an `:after` slot, fails the type check. The `actions` (`{ pending, dirty, submit, reset,
step, first, last, back }`) and `form-errors` slots replace the buttons and the error block.

## Steps

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiSmartForm v-model:step="step" :form="wizard" :steps="wizardSteps" submit-label="Create team" style="max-inline-size: 36rem">
    <template #rules>I accept the team rules</template>
  </NuiSmartForm>
  <p v-if="created">Team “{{ created }}” created.</p>
</div>

```vue
<NuiSmartForm v-model:step="step" :form="form" :steps="steps" submit-label="Create team">
  <template #rules>I accept the team rules</template>
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

| Prop           | Type                          | Default                                                | Description                                |
| -------------- | ----------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| `form`         | `FormContext<Values>`         | —                                                      | Context from `useForm`                     |
| `fields`       | `NuiSmartFormEntry<Values>[]` | —                                                      | Fields, sections and groups                |
| `steps`        | `NuiSmartFormStep<Values>[]`  | —                                                      | Steps instead of `fields`                  |
| `v-model:step` | `string`                      | the first step                                         | Current step                               |
| `layout`       | `string`                      | —                                                      | Layout in the `grid-template-areas` syntax |
| `inline`       | `boolean \| 'grow'`           | —                                                      | Fields in a row                            |
| `disabled`     | `boolean`                     | `false`                                                | Disables fields and buttons                |
| `reserveError` | `boolean`                     | `false`                                                | Room for errors in every field             |
| `submitLabel`  | `string`                      | [dictionary](/en/guide/localization#form): “Submit”    | Submit button                              |
| `nextLabel`    | `string`                      | [dictionary](/en/guide/localization#smartform): “Next” | Next step button                           |
| `backLabel`    | `string`                      | [dictionary](/en/guide/localization#smartform): “Back” | Previous step button                       |

Slots: `[path]`, `[path]:after`, `actions`, `form-errors`. Methods `requestSubmit()` and
`back()`. Types `NuiSmartFormSlots<Values>`, `NuiSmartFormFieldScope`,
`NuiSmartFormAfterScope`, `NuiSmartFormActionsScope`, `FormSlotPath<Values>`.

Block `nui-smart-form` (modifiers `--inline`, `--grow`, `--steps`, `--back`, `--navigated`;
elements `__grid` with `--layout`, `__cell` with `--appearing` and `--entering`, `__section`,
`__legend`, `__section-description`, `__stepper`, `__step`, `__back`, `__next`, `__live`).
Variables: `--_columns`, `--_layout-columns`, `--_areas`, `--_area`, `--_slide`.
