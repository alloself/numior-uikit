<template>
  <NuiForm :form="form" submit-label="Register" class="nui-max-w-sm">
    <NuiFormField
      v-slot="{ field, pending }"
      :form="form"
      :name="(v) => v.login"
      :rules="loginRules"
      label="Login"
      description="Taken: admin and root"
      validate-on="change"
      required
    >
      <NuiInput v-bind="field" autocomplete="username">
        <template v-if="pending" #suffix>…</template>
      </NuiInput>
    </NuiFormField>
  </NuiForm>
</template>

<script setup lang="ts">
import { NuiInput } from '@numior/vue';
import { NuiForm, NuiFormField, customAsync, required, useForm } from '@numior/forms';

const TAKEN = new Set(['admin', 'root']);

const isTaken = (login: string, signal: AbortSignal): Promise<boolean> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(TAKEN.has(login)), 500);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    });
  });

const loginRules = [
  required(),
  customAsync<string>(async (value, { signal }) =>
    (await isTaken(value, signal)) ? 'This login is already taken' : undefined,
  ),
];

const form = useForm({
  initialValues: { login: '' },
  onSubmit: () => undefined,
});
</script>
