<template>
  <NuiSmartForm :form="form" :fields="fields" submit-label="Сохранить" class="w-full max-w-2xl">
    <template #kind>
      <NuiRadio value="person">Частное лицо</NuiRadio>
      <NuiRadio value="company">Компания</NuiRadio>
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
const contactLabel = (index: number): string => `Контакт ${index}`;

const fields = [
  section({
    title: 'Клиент',
    layout: '"kind kind" "name email" "company company"',
    fields: [
      field(NuiRadioGroup, (v) => v.kind, {
        label: 'Тип клиента',
        group: true,
        props: { orientation: 'horizontal' },
      }),
      field(NuiInput, (v) => v.name, { label: 'Имя', required: true, rules: [required()] }),
      field(NuiInput, (v) => v.email, {
        label: 'Почта',
        required: true,
        rules: [required(), email()],
        props: { type: 'email' },
      }),
      field(NuiInput, (v) => v.company, {
        label: 'Компания',
        required: true,
        when: isCompany,
        rules: [required()],
      }),
    ],
  }),
  section({
    title: 'Контакты',
    description: 'Кому звонить, когда курьер в пути',
    fields: [
      array((v) => v.contacts, {
        min: 1,
        max: 3,
        reorderable: true,
        layout: '"name phone"',
        addLabel: 'Добавить контакт',
        rowLabel: contactLabel,
        newRow: () => ({ name: '', phone: '' }),
        fields: [
          row.field(NuiInput, (r) => r.name, { label: 'Имя', rules: [required()] }),
          row.field(NuiInput, (r) => r.phone, {
            label: 'Телефон',
            rules: [required()],
            props: { type: 'tel', mask: '+7 ### ###-##-##' },
          }),
        ],
      }),
    ],
  }),
];

const form = useForm<Customer>({
  initialValues: {
    kind: 'person',
    name: 'Пётр Волков',
    email: 'volkov@example.com',
    contacts: [{ name: 'Пётр Волков', phone: '+7 900 000-01-01' }],
  },
  onSubmit: () => undefined,
});
</script>
