<template>
  <div class="grid min-h-dvh place-items-center bg-surface-muted p-6">
    <NuiCard class="w-full max-w-sm">
      <NuiCardHeader>
        <NuiCardTitle>Sign in to the store back office</NuiCardTitle>
        <NuiCardDescription>Orders, products and customers in one place.</NuiCardDescription>
      </NuiCardHeader>
      <NuiCardContent>
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
            required
          >
            <NuiInput v-bind="field" type="password" autocomplete="current-password" />
          </NuiFormField>
          <NuiFormField v-slot="{ field }" :form="form" :name="(v) => v.remember">
            <NuiCheckbox v-bind="field">Keep me signed in on this device</NuiCheckbox>
          </NuiFormField>
        </NuiForm>
      </NuiCardContent>
      <NuiCardFooter>
        <NuiLink href="#" tone="neutral">Forgot your password?</NuiLink>
      </NuiCardFooter>
    </NuiCard>
  </div>
</template>

<script setup lang="ts">
import { promiseTimeout } from '@vueuse/core';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
  NuiCheckbox,
  NuiInput,
  NuiLink,
  useToast,
} from '@numior/kit';
import {
  NuiForm,
  NuiFormError,
  NuiFormField,
  email,
  min,
  required,
  useForm,
} from '@numior/kit/forms';
import { team } from '#demo/team';

const emailRules = [required(), email()];
const passwordRules = [required(), min(8)];

const toast = useToast();

const form = useForm({
  initialValues: { email: team[0].email, password: '', remember: true },
  onSubmit: async (values) => {
    await promiseTimeout(600);

    const person = team.find((candidate) => candidate.email === values.email);

    if (person === undefined) {
      throw new NuiFormError({ email: 'No one on the store team has this address' });
    }
    toast.success(`Signed in as ${person.name}`);
  },
});
</script>
