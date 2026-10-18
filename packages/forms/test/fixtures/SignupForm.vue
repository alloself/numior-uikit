<template>
  <NuiForm :form="form" :readonly="readonly">
    <NuiFormField :form="form" :name="email" label="Email">
      <template #default="{ field }">
        <NuiInput v-bind="field" />
      </template>
    </NuiFormField>
  </NuiForm>
</template>

<script setup lang="ts">
import { NuiInput } from '@numior/vue';
import { NuiForm, NuiFormField, useForm } from '../../src';

interface Signup {
  email: string;
}

const { readonly = false } = defineProps<{
  readonly?: boolean | undefined;
}>();

const form = useForm<Signup>({
  initialValues: { email: 'ann@example.com' },
  onSubmit: () => undefined,
});

const email = (values: Signup) => values.email;
</script>
