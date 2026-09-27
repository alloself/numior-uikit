<template>
  <NuiForm :form="form" submit-label="Войти" class="nui-max-w-sm">
    <NuiFormField
      v-slot="{ field }"
      :form="form"
      :name="(v) => v.email"
      :rules="emailRules"
      label="Почта"
      required
    >
      <NuiInput v-bind="field" type="email" autocomplete="email" />
    </NuiFormField>
    <NuiFormField
      v-slot="{ field }"
      :form="form"
      :name="(v) => v.password"
      :rules="passwordRules"
      label="Пароль"
      description="Не короче 8 символов"
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
      throw new NuiFormError({ email: 'Этот адрес уже зарегистрирован' });
    }
  },
});
</script>
