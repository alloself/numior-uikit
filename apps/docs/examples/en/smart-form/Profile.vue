<template>
  <NuiSmartForm :form="form" :fields="fields" submit-label="Save" class="nui-max-w-lg">
    <template #kind>
      <NuiRadio value="person">Individual</NuiRadio>
      <NuiRadio value="company">Company</NuiRadio>
    </template>
  </NuiSmartForm>
</template>

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
  contacts: Contact[];
}

const { field, section, array } = formConfig<Profile>();
const row = formConfig<Contact>();
const isCompany = (values: Profile): boolean => values.kind === 'company';

const fields = [
  section({
    title: 'Profile',
    layout: '"kind kind" "name email" "company company"',
    fields: [
      field(NuiRadioGroup, (v) => v.kind, {
        label: 'Account type',
        group: true,
        props: { orientation: 'horizontal' },
      }),
      field(NuiInput, (v) => v.name, { label: 'Name', required: true, rules: [required()] }),
      field(NuiInput, (v) => v.email, {
        label: 'Email',
        required: true,
        rules: [required(), email()],
        props: { type: 'email' },
      }),
      field(NuiInput, (v) => v.company, {
        label: 'Company',
        required: true,
        when: isCompany,
        rules: [required()],
      }),
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
          row.field(NuiInput, (r) => r.phone, {
            label: 'Phone',
            props: { type: 'tel', mask: '+1 (###) ###-####' },
          }),
        ],
      }),
    ],
  }),
];

const form = useForm<Profile>({
  initialValues: {
    kind: 'person',
    name: 'Anna Titova',
    email: 'anna@example.com',
    contacts: [{ name: 'Igor Belov', phone: '' }],
  },
  onSubmit: () => undefined,
});
</script>
