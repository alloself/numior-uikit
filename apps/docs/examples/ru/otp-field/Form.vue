<template>
  <NuiForm :form="form" submit-label="Подтвердить" class="max-w-sm">
    <NuiFormField
      v-slot="{ field }"
      :form="form"
      :name="(v) => v.code"
      :rules="codeRules"
      label="Код из приложения"
      :description="description"
      required
    >
      <NuiOtpField v-bind="field" :group-size="3" />
    </NuiFormField>
  </NuiForm>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiOtpField } from '@numior/kit';
import { NuiForm, NuiFormField, min, required, useForm } from '@numior/kit/forms';

const codeRules = [required(), min(6)];

const confirmed = ref(false);

const description = computed(() =>
  confirmed.value ? 'Вход подтверждён' : 'Шесть цифр из приложения-аутентификатора',
);

const form = useForm({
  initialValues: { code: '' },
  onSubmit: async () => {
    await promiseTimeout(600);
    confirmed.value = true;
  },
});
</script>
