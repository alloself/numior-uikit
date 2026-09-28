<template>
  <NuiSmartForm
    v-model:step="step"
    :form="form"
    :steps="steps"
    submit-label="Create team"
    class="max-w-lg"
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
    label: 'Account',
    description: 'Email and password',
    fields: [
      field(NuiInput, (v) => v.email, {
        label: 'Email',
        required: true,
        rules: [required(), email()],
        props: { type: 'email' },
      }),
      field(NuiInput, (v) => v.password, {
        label: 'Password',
        required: true,
        rules: [required(), min(8)],
        props: { type: 'password' },
      }),
    ],
  },
  {
    value: 'team',
    label: 'Team',
    layout: '"team size"',
    fields: [
      field(NuiInput, (v) => v.team, { label: 'Name', required: true, rules: [required()] }),
      field(NuiNumberField, (v) => v.size, { label: 'How many people', props: { min: 1 } }),
    ],
  },
  {
    value: 'confirm',
    label: 'Confirmation',
    fields: [
      field(NuiCheckbox, (v) => v.agreed, {
        rules: [required({ message: 'Confirm your consent' })],
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
