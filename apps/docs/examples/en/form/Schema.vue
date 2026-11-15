<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <NuiForm :form="form" submit-label="Add customer">
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.name" label="Name" required>
        <NuiInput v-bind="field" autocomplete="name" />
      </NuiFormField>
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.email" label="Email">
        <NuiInput v-bind="field" type="email" autocomplete="email" />
      </NuiFormField>
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.phone" label="Phone">
        <NuiInput v-bind="field" type="tel" mask="(###) ###-####" autocomplete="tel" />
      </NuiFormField>
    </NuiForm>
    <p v-if="added" class="m-0 text-sm text-muted-foreground">Customer {{ added }} added</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { z } from 'zod';
import { NuiInput } from '@numior/vue';
import { NuiForm, NuiFormField, useForm } from '@numior/forms';

const customer = z
  .object({
    name: z.string().trim().min(1, 'Enter a name'),
    email: z.email('Check the email address').or(z.literal('')),
    phone: z.string(),
  })
  .refine((value) => value.email !== '' || value.phone !== '', 'Enter an email or a phone');

const added = ref('');

const form = useForm({
  initialValues: { name: '', email: '', phone: '' },
  schema: customer,
  onSubmit: (_values, { output }) => {
    added.value = output?.name ?? '';
  },
});
</script>
