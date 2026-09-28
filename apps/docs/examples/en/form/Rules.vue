<template>
  <NuiForm :form="form" submit-label="Sign in" class="max-w-sm">
    <NuiFormField
      v-slot="{ field }"
      :form="form"
      :name="(v) => v.email"
      :rules="emailRules"
      label="Email"
      required
    >
      <NuiInput v-bind="field" type="email" autocomplete="email" />
    </NuiFormField>
    <NuiFormField
      v-slot="{ field }"
      :form="form"
      :name="(v) => v.password"
      :rules="passwordRules"
      label="Password"
      description="At least 8 characters"
      required
    >
      <NuiInput v-bind="field" type="password" autocomplete="current-password" />
    </NuiFormField>
  </NuiForm>
</template>

<script setup lang="ts">
import { NuiInput } from '@numior/vue';
import { NuiForm, NuiFormError, NuiFormField, email, min, required, useForm } from '@numior/forms';

const emailRules = [required(), email()];
const passwordRules = [required(), min(8)];

const form = useForm({
  initialValues: { email: '', password: '' },
  onSubmit: async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (values.email === 'taken@example.com') {
      throw new NuiFormError({ email: 'This address is already registered' });
    }
  },
});
</script>
