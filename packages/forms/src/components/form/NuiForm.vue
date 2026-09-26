<template>
  <form
    ref="root"
    class="nui-form"
    :class="{ 'nui-form--pending': pending, 'nui-form--disabled': disabled }"
    novalidate
    :aria-busy="pending || undefined"
    @submit="onSubmit"
    @reset="onReset"
  >
    <div
      v-if="messages.length > 0"
      :key="attempt"
      ref="errors"
      class="nui-form__errors"
      tabindex="-1"
    >
      <slot name="form-errors" :errors="form.formErrors.value">
        <NuiAlert tone="error" :title="texts.errorTitle">
          <template v-if="messages.length === 1">{{ messages[0] }}</template>
          <ul v-else class="nui-form__error-list">
            <li v-for="message in messages" :key="message">{{ message }}</li>
          </ul>
        </NuiAlert>
      </slot>
    </div>
    <slot />
    <div class="nui-form__actions">
      <slot name="actions" v-bind="actions">
        <NuiButton type="submit" :loading="pending" :disabled="disabled">
          {{ texts.submit }}
        </NuiButton>
      </slot>
    </div>
  </form>
</template>

<script setup lang="ts" generic="T extends object">
import { computed, shallowRef, useTemplateRef, watch } from 'vue';
import { useMessages } from '@numior/primitives';
import { NuiAlert, NuiButton } from '@numior/vue';
import type { SubmitResult } from '../../core/types';
import { FORM_HOST, provideForm } from '../../form/form-context';
import { provideFormScope } from './form-scope';
import { formMessages } from './form.messages';
import type { NuiFormProps } from './form.types';

const {
  form,
  disabled = false,
  submitAction,
  submitLabel,
  errorTitle,
} = defineProps<NuiFormProps<T>>();

const emit = defineEmits<{ reset: [] }>();

provideForm(form);
provideFormScope(() => disabled);

const host = form[FORM_HOST];
const root = useTemplateRef<HTMLFormElement>('root');
const errorsBox = useTemplateRef<HTMLElement>('errors');
const localized = useMessages(formMessages);
const busy = shallowRef(false);
const attempt = shallowRef(0);
const focusPlan: { path: string | undefined; errors: boolean } = { path: undefined, errors: false };

const texts = computed(() => ({
  submit: submitLabel ?? localized.value.submit,
  errorTitle: errorTitle ?? localized.value.errorTitle,
}));

const messages = computed(() => [...new Set(form.formErrors.value.map((error) => error.message))]);

const pending = computed(() => busy.value || form.meta.value.pending);

const requestSubmit = (): void => {
  root.value?.requestSubmit();
};

const reset = (): void => {
  root.value?.reset();
};

const actions = computed(() => ({
  pending: pending.value,
  dirty: form.meta.value.dirty,
  submit: requestSubmit,
  reset,
}));

const planFocus = (result: SubmitResult): void => {
  focusPlan.path = result.invalid[0];
  focusPlan.errors = result.invalid.length === 0 && result.formErrors.length > 0;
};

const runSubmit = async (): Promise<void> => {
  try {
    planFocus(await (submitAction ?? form.submit)());
  } finally {
    busy.value = false;
    attempt.value += 1;
  }
};

const onSubmit = async (event: Event): Promise<void> => {
  event.preventDefault();

  if (busy.value || disabled) {
    return;
  }
  busy.value = true;
  await host.track(runSubmit());
};

const onReset = (event: Event): void => {
  event.preventDefault();

  if (busy.value) {
    return;
  }
  form.resetForm();
  emit('reset');
};

watch(
  attempt,
  () => {
    const { path, errors } = focusPlan;

    focusPlan.path = undefined;
    focusPlan.errors = false;

    if (path !== undefined) {
      form.focusField(path);
    } else if (errors) {
      errorsBox.value?.focus();
    }
  },
  { flush: 'post' },
);

defineExpose({ requestSubmit, reset });
</script>
