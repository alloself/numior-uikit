<template>
  <NuiForm :form="form" submit-label="Создать аккаунт" class="nui-max-w-sm">
    <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.email" label="Почта" required>
      <NuiInput v-bind="field" type="email" autocomplete="email" />
    </NuiFormField>
    <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.age" label="Возраст" required>
      <NuiInput v-bind="field" inputmode="numeric" />
    </NuiFormField>
    <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.newsletter">
      <NuiCheckbox v-bind="field">Присылать новости раз в месяц</NuiCheckbox>
    </NuiFormField>
  </NuiForm>
  <p v-if="created" class="nui-text-sm nui-text-muted">Создан аккаунт для {{ created }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { z } from 'zod';
import { NuiCheckbox, NuiInput } from '@numior/vue';
import { NuiForm, NuiFormField, useForm } from '@numior/forms';

const signup = z.object({
  email: z.email('Укажите адрес почты'),
  age: z.coerce.number().min(18, 'Только для совершеннолетних'),
  newsletter: z.boolean(),
});

const created = ref('');

const form = useForm({
  initialValues: { email: '', age: '', newsletter: true },
  schema: signup,
  onSubmit: (_values, { output }) => {
    created.value = output?.email ?? '';
  },
});
</script>
