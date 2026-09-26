<template>
  <NuiForm
    ref="form"
    :form="form"
    class="nui-smart-form"
    :class="classes"
    :disabled="disabled"
    :submit-label="submitLabel"
    :submit-action="steps ? runStep : undefined"
    @reset="onReset"
  >
    <NuiSmartFormSteps
      v-if="steps"
      ref="stepPanels"
      :steps="steps"
      :current="currentIndex"
      :scope="scope"
      :statuses="statuses"
      :live="stepText"
      @select="select"
    />
    <NuiSmartFormEntries v-else :entries="entries" :scope="scope" :layout="layout" />
    <template v-if="$slots['form-errors']" #form-errors="props">
      <slot name="form-errors" v-bind="props" />
    </template>
    <template v-if="$slots.actions || steps" #actions="props">
      <slot name="actions" v-bind="{ ...props, step: current, first, last, back }">
        <NuiButton
          v-if="!first"
          class="nui-smart-form__back"
          variant="outline"
          tone="neutral"
          @click="back"
        >
          {{ texts.back }}
        </NuiButton>
        <NuiButton
          class="nui-smart-form__next"
          type="submit"
          :loading="props.pending"
          :disabled="disabled"
        >
          {{ last ? texts.submit : texts.next }}
        </NuiButton>
      </slot>
    </template>
  </NuiForm>
</template>

<script setup lang="ts" generic="T extends object">
import { computed, shallowRef, useSlots, useTemplateRef, watch } from 'vue';
import { useMessages } from '@numior/primitives';
import { NuiButton } from '@numior/vue';
import type { SubmitResult } from '../../core/types';
import NuiForm from '../form/NuiForm.vue';
import { formMessages } from '../form/form.messages';
import { FOCUSABLE } from '../form-field/focus-control';
import NuiSmartFormEntries from './NuiSmartFormEntries.vue';
import NuiSmartFormSteps from './NuiSmartFormSteps.vue';
import { declareEntries } from './declarations';
import { smartFormMessages } from './smart-form.messages';
import type { NuiSmartFormProps, NuiSmartFormSlots, SmartScope } from './smart-form.types';
import { provideSmartSlots } from './smart-slots';
import { stepOf, stepPaths } from './steps';

const {
  form,
  fields,
  steps,
  layout,
  inline = undefined,
  disabled = false,
  submitLabel,
  nextLabel,
  backLabel,
} = defineProps<NuiSmartFormProps<T>>();

const step = defineModel<string | undefined>('step');

defineSlots<NuiSmartFormSlots<T>>();

provideSmartSlots(useSlots());

const formRef = useTemplateRef<{ requestSubmit: () => void }>('form');

const stepPanels = useTemplateRef<{ panel: (index: number) => HTMLElement | undefined }>(
  'stepPanels',
);

const localized = useMessages(smartFormMessages);
const formTexts = useMessages(formMessages);
const direction = shallowRef<'forward' | 'back' | undefined>(undefined);
const navigations = shallowRef(0);
const focusPlan: { target: 'first' | 'invalid' | undefined } = { target: undefined };

const entries = computed(() => fields ?? []);
const stepList = computed(() => steps ?? []);

const scope = computed<SmartScope>(() => ({
  values: form.values,
  prefix: '',
  slotPrefix: '',
  row: undefined,
}));

const currentIndex = computed(() =>
  Math.max(
    0,
    stepList.value.findIndex((item) => item.value === step.value),
  ),
);

const current = computed(() => stepList.value[currentIndex.value]?.value);
const first = computed(() => currentIndex.value === 0);
const last = computed(() => currentIndex.value >= stepList.value.length - 1);

const texts = computed(() => ({
  next: nextLabel ?? localized.value.next,
  back: backLabel ?? localized.value.back,
  submit: submitLabel ?? formTexts.value.submit,
}));

const stepText = computed(() => {
  const item = stepList.value[currentIndex.value];

  return item
    ? localized.value.stepChanged({
        current: currentIndex.value + 1,
        total: stepList.value.length,
        label: item.label,
      })
    : '';
});

const statuses = computed(() =>
  stepList.value.map((item) =>
    stepPaths(item.fields).some((path) => form.hasErrors(path)) ? 'error' : undefined,
  ),
);

const classes = computed(() => ({
  'nui-smart-form--inline': inline === true || inline === 'grow',
  'nui-smart-form--grow': inline === 'grow',
  'nui-smart-form--steps': steps !== undefined,
  'nui-smart-form--back': direction.value === 'back',
  'nui-smart-form--navigated': direction.value !== undefined,
}));

const goTo = (index: number, target: 'first' | 'invalid' | undefined): void => {
  direction.value = index < currentIndex.value ? 'back' : 'forward';
  focusPlan.target = target;
  step.value = stepList.value[index]?.value;
  navigations.value += 1;
};

const IGNORED: SubmitResult = { status: 'ignored', invalid: [], formErrors: [] };

const advance = async (): Promise<SubmitResult> => {
  const item = stepList.value[currentIndex.value];
  const summary = await form.validate({ paths: stepPaths(item?.fields ?? []) });

  if (summary.valid) {
    goTo(currentIndex.value + 1, 'first');
  } else {
    focusPlan.target = 'invalid';
    navigations.value += 1;
  }
  return IGNORED;
};

const finish = async (): Promise<SubmitResult> => {
  const result = await form.submit();
  const [path] = result.invalid;
  const target = path === undefined ? -1 : stepOf(stepList.value, path);

  if (target !== -1 && target !== currentIndex.value) {
    goTo(target, undefined);
  }
  return result;
};

const runStep = (): Promise<SubmitResult> => (last.value ? finish() : advance());

const back = (): void => {
  if (!first.value) {
    goTo(currentIndex.value - 1, 'first');
  }
};

const select = (value: string): void => {
  const index = stepList.value.findIndex((item) => item.value === value);

  if (index !== -1 && index !== currentIndex.value) {
    goTo(index, 'first');
  }
};

const onReset = (): void => {
  direction.value = undefined;
  step.value = stepList.value[0]?.value;
};

watch(
  navigations,
  () => {
    const { target } = focusPlan;
    const selector = target === 'invalid' ? '[aria-invalid="true"]' : FOCUSABLE;

    const element =
      target === undefined
        ? null
        : stepPanels.value?.panel(currentIndex.value)?.querySelector(selector);

    focusPlan.target = undefined;

    if (element instanceof HTMLElement) {
      element.focus();
    }
  },
  { flush: 'post' },
);

declareEntries(form, entries.value, () => scope.value);

for (const item of stepList.value) {
  declareEntries(form, item.fields, () => scope.value);
}

defineExpose({
  requestSubmit: () => formRef.value?.requestSubmit(),
  back,
});
</script>
