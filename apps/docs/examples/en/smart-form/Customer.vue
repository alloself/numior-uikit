<template>
  <NuiSmartForm :form="form" :fields="fields" submit-label="Save" class="w-full max-w-2xl">
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

interface Customer {
  kind: 'person' | 'company';
  name: string;
  email: string;
  company?: string;
  contacts: Contact[];
}

const { field, section, array } = formConfig<Customer>();
const row = formConfig<Contact>();
const isCompany = (values: Customer): boolean => values.kind === 'company';
const contactLabel = (index: number): string => `Contact ${index}`;

const fields = [
  section({
    title: 'Customer',
    layout: '"kind kind" "name email" "company company"',
    fields: [
      field(NuiRadioGroup, (v) => v.kind, {
        label: 'Customer type',
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
    description: 'Who to call while the courier is on the way',
    fields: [
      array((v) => v.contacts, {
        min: 1,
        max: 3,
        reorderable: true,
        layout: '"name phone"',
        addLabel: 'Add contact',
        rowLabel: contactLabel,
        newRow: () => ({ name: '', phone: '' }),
        fields: [
          row.field(NuiInput, (r) => r.name, { label: 'Name', rules: [required()] }),
          row.field(NuiInput, (r) => r.phone, {
            label: 'Phone',
            rules: [required()],
            props: { type: 'tel', mask: '(###) ###-####' },
          }),
        ],
      }),
    ],
  }),
];

const form = useForm<Customer>({
  initialValues: {
    kind: 'person',
    name: 'Peter Wolfe',
    email: 'peter.wolfe@example.com',
    contacts: [{ name: 'Peter Wolfe', phone: '(617) 555-0101' }],
  },
  onSubmit: () => undefined,
});
</script>
