<template>
  <NuiSmartForm
    v-model:step="step"
    :form="form"
    :steps="steps"
    submit-label="Создать команду"
    class="nui-max-w-lg"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCheckbox, NuiInput, NuiNumberField } from '@numior/vue';
import { NuiSmartForm, email, formConfig, min, required, useForm } from '@numior/forms';

interface Team {
  email: string;
  password: string;
  team: string;
  size: number | null;
  agreed: boolean;
}

const { field } = formConfig<Team>();

const steps = [
  {
    value: 'account',
    label: 'Аккаунт',
    description: 'Почта и пароль',
    fields: [
      field(NuiInput, (v) => v.email, {
        label: 'Почта',
        required: true,
        rules: [required(), email()],
        props: { type: 'email' },
      }),
      field(NuiInput, (v) => v.password, {
        label: 'Пароль',
        required: true,
        rules: [required(), min(8)],
        props: { type: 'password' },
      }),
    ],
  },
  {
    value: 'team',
    label: 'Команда',
    layout: '"team size"',
    fields: [
      field(NuiInput, (v) => v.team, { label: 'Название', required: true, rules: [required()] }),
      field(NuiNumberField, (v) => v.size, { label: 'Сколько человек', props: { min: 1 } }),
    ],
  },
  {
    value: 'confirm',
    label: 'Подтверждение',
    fields: [
      field(NuiCheckbox, (v) => v.agreed, {
        rules: [required({ message: 'Подтвердите согласие' })],
      }),
    ],
  },
];

const step = ref<string>();

const form = useForm<Team>({
  initialValues: { email: '', password: '', team: '', size: 5, agreed: false },
  onSubmit: () => undefined,
});
</script>
