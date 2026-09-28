<template>
  <NuiSmartForm :form="form" :fields="fields" submit-label="Сохранить" class="max-w-lg">
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
    title: 'Профиль',
    layout: '"kind kind" "name email" "company company"',
    fields: [
      field(NuiRadioGroup, (v) => v.kind, {
        label: 'Тип аккаунта',
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
    fields: [
      array((v) => v.contacts, {
        min: 1,
        max: 3,
        reorderable: true,
        layout: '"name phone"',
        newRow: () => ({ name: '', phone: '' }),
        fields: [
          row.field(NuiInput, (r) => r.name, { label: 'Имя', rules: [required()] }),
          row.field(NuiInput, (r) => r.phone, {
            label: 'Телефон',
            props: { type: 'tel', mask: '+7 (###) ###-##-##' },
          }),
        ],
      }),
    ],
  }),
];

const form = useForm<Profile>({
  initialValues: {
    kind: 'person',
    name: 'Анна Титова',
    email: 'anna@example.com',
    contacts: [{ name: 'Игорь Белов', phone: '' }],
  },
  onSubmit: () => undefined,
});
</script>
