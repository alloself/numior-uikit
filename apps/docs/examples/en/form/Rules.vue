<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <NuiForm :form="form" submit-label="Sign in">
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
    <p v-if="greeting" class="m-0 text-sm text-muted-foreground">{{ greeting }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiInput } from '@numior/vue';
import { NuiForm, NuiFormError, NuiFormField, email, min, required, useForm } from '@numior/forms';
import { team } from '#demo/team';

const emailRules = [required(), email()];
const passwordRules = [required(), min(8)];

const greeting = ref('');

const form = useForm({
  initialValues: { email: 'oleg@example.us', password: '' },
  onSubmit: async (values) => {
    await promiseTimeout(600);

    const person = team.find((candidate) => candidate.email === values.email);

    if (person === undefined) {
      throw new NuiFormError({ email: 'No one on the store team uses this address' });
    }
    greeting.value = `${person.name}, you are signed in to the dashboard`;
  },
});
</script>
