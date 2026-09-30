<template>
  <NuiForm :form="form" submit-label="Подтвердить" class="max-w-sm">
    <NuiFormField
      v-slot="{ field }"
      :form="form"
      :name="(v) => v.code"
      :rules="codeRules"
      label="Код из письма"
      description="Код 000000 устарел"
      required
    >
      <NuiOtpField v-bind="field" :group-size="3" />
    </NuiFormField>
  </NuiForm>
</template>

<script setup lang="ts">
import { NuiOtpField } from '@numior/vue';
import { NuiForm, NuiFormError, NuiFormField, min, required, useForm } from '@numior/forms';

const codeRules = [required(), min(6)];

const form = useForm({
  initialValues: { code: '' },
  onSubmit: async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (values.code === '000000') {
      throw new NuiFormError({ code: 'Код устарел, запросите новый' });
    }
  },
});
</script>
