<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <NuiForm :form="form" submit-label="Добавить клиента">
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.name" label="Имя" required>
        <NuiInput v-bind="field" autocomplete="name" />
      </NuiFormField>
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.email" label="Почта">
        <NuiInput v-bind="field" type="email" autocomplete="email" />
      </NuiFormField>
      <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.phone" label="Телефон">
        <NuiInput v-bind="field" type="tel" mask="+7 ### ###-##-##" autocomplete="tel" />
      </NuiFormField>
    </NuiForm>
    <p v-if="added" class="m-0 text-sm text-muted-foreground">Клиент {{ added }} добавлен</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { z } from 'zod';
import { NuiInput } from '@numior/kit';
import { NuiForm, NuiFormField, useForm } from '@numior/kit/forms';

const customer = z
  .object({
    name: z.string().trim().min(1, 'Укажите имя'),
    email: z.email('Проверьте адрес почты').or(z.literal('')),
    phone: z.string(),
  })
  .refine((value) => value.email !== '' || value.phone !== '', 'Укажите почту или телефон');

const added = ref('');

const form = useForm({
  initialValues: { name: '', email: '', phone: '' },
  schema: customer,
  onSubmit: (_values, { output }) => {
    added.value = output?.name ?? '';
  },
});
</script>
