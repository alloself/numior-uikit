<template>
  <NuiForm :form="form" submit-label="Create account" class="max-w-sm">
    <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.email" label="Email" required>
      <NuiInput v-bind="field" type="email" autocomplete="email" />
    </NuiFormField>
    <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.age" label="Age" required>
      <NuiInput v-bind="field" inputmode="numeric" />
    </NuiFormField>
    <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.newsletter">
      <NuiCheckbox v-bind="field">Send the monthly newsletter</NuiCheckbox>
    </NuiFormField>
  </NuiForm>
  <p v-if="created" class="text-sm text-muted-foreground">Account created for {{ created }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { z } from 'zod';
import { NuiCheckbox, NuiInput } from '@numior/vue';
import { NuiForm, NuiFormField, useForm } from '@numior/forms';

const signup = z.object({
  email: z.email('Enter an email address'),
  age: z.coerce.number().min(18, 'Adults only'),
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
