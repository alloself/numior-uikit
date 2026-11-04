<template>
  <NuiForm
    ref="form"
    :form="form"
    class="nui-smart-form"
    :class="classes"
    :disabled="disabled"
    :readonly="readonly"
    :reserve-error="reserveError"
    :submit-label="submitLabel"
    :submit-action="steps ? runStep : undefined"
    @reset="onReset"
  >
    <NuiSmartFormSteps
      v-if="steps"
      ref="stepPanels"
      :form="form"
      :steps="steps"
      :current="currentIndex"
      :statuses="statuses"
      :live="stepText"
      @select="select"
      :slots="slots"
    />
    <NuiSmartFormEntries v-else :form="form" :entries="entries" :layout="layout" :slots="slots" />
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
          :disabled="disabled || readonly"
        >
          {{ last ? texts.submit : texts.next }}
        </NuiButton>
      </slot>
    </template>
  </NuiForm>
</template>

<script setup lang="ts" generic="T extends object">
import { computed, shallowRef, useSlots, useTemplateRef, watch } from 'vue';
import { createIntent, useMessages } from '@numior/primitives';
import { NuiButton, NuiStepperStatus } from '@numior/vue';
import { SubmitStatus, type SubmitResult } from '../../core/form.types';
import { FORM_HOST } from '../../form/form-context';
import NuiForm from '../form/NuiForm.vue';
import { formMessages } from '../form/form.messages';
import { FOCUSABLE } from '../form-field/focus-control';
import NuiSmartFormEntries from './NuiSmartFormEntries.vue';
import NuiSmartFormSteps from './NuiSmartFormSteps.vue';
import { declareEntries } from './declarations';
import { smartFormMessages } from './smart-form.messages';
import {
  NuiSmartFormInline,
  StepDirection,
  StepFocus,
  type NuiSmartFormProps,
  type NuiSmartFormSlots,
} from './smart-form.types';
import { stepOf, stepPaths } from './steps';

const {
  form,
  fields,
  steps,
  layout,
  inline = undefined,
  disabled = false,
  readonly = false,
  reserveError = false,
  submitLabel,
  nextLabel,
  backLabel,
} = defineProps<NuiSmartFormProps<T>>();

const step = defineModel<string | undefined>('step');

defineSlots<NuiSmartFormSlots<T>>();

const slots = useSlots();

const formRef = useTemplateRef<{ requestSubmit: () => void }>('form');

const stepPanels = useTemplateRef<{ panel: (index: number) => HTMLElement | undefined }>(
  'stepPanels',
);

const localized = useMessages(smartFormMessages);
const formTexts = useMessages(formMessages);
const direction = shallowRef<StepDirection | undefined>(undefined);
const navigations = shallowRef(0);
const stepFocus = createIntent<StepFocus>();

const { raw } = form[FORM_HOST].engine;
const entries = computed(() => fields ?? []);
const stepList = computed(() => steps ?? []);
const stepPathList = computed(() => stepList.value.map((item) => stepPaths(raw, item.fields)));

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
  stepPathList.value.map((paths) =>
    paths.some((path) => form.hasErrors(path)) ? NuiStepperStatus.Error : undefined,
  ),
);

const classes = computed(() => ({
  'nui-smart-form--inline': inline === true || inline === NuiSmartFormInline.Grow,
  'nui-smart-form--grow': inline === NuiSmartFormInline.Grow,
  'nui-smart-form--steps': steps !== undefined,
  'nui-smart-form--back': direction.value === StepDirection.Back,
  'nui-smart-form--navigated': direction.value !== undefined,
}));

const goTo = (index: number, target: StepFocus | undefined): void => {
  direction.value = index < currentIndex.value ? StepDirection.Back : StepDirection.Forward;
  stepFocus.set(target);
  step.value = stepList.value[index]?.value;
  navigations.value += 1;
};

const IGNORED: SubmitResult = { status: SubmitStatus.Ignored, invalid: [], formErrors: [] };

const STEP_TARGETS: Readonly<Record<StepFocus, string>> = {
  [StepFocus.Control]: FOCUSABLE,
  [StepFocus.Invalid]: '[aria-invalid="true"]',
};

const advance = async (): Promise<SubmitResult> => {
  const summary = await form.validate({ paths: stepPathList.value[currentIndex.value] ?? [] });

  if (summary.valid) {
    goTo(currentIndex.value + 1, StepFocus.Control);
  } else {
    stepFocus.set(StepFocus.Invalid);
    navigations.value += 1;
  }
  return IGNORED;
};

const finish = async (): Promise<SubmitResult> => {
  const result = await form.submit();
  const [path] = result.invalid;
  const target = path === undefined ? -1 : stepOf(stepPathList.value, path);

  if (target !== -1 && target !== currentIndex.value) {
    goTo(target, undefined);
  }
  return result;
};

const runStep = (): Promise<SubmitResult> => (last.value ? finish() : advance());

const back = (): void => {
  if (!first.value) {
    goTo(currentIndex.value - 1, StepFocus.Control);
  }
};

const select = (value: string): void => {
  const index = stepList.value.findIndex((item) => item.value === value);

  if (index !== -1 && index !== currentIndex.value) {
    goTo(index, StepFocus.Control);
  }
};

const onReset = (): void => {
  direction.value = undefined;
  step.value = stepList.value[0]?.value;
};

watch(
  navigations,
  () => {
    const target = stepFocus.take();

    const element =
      target === undefined
        ? null
        : stepPanels.value?.panel(currentIndex.value)?.querySelector(STEP_TARGETS[target]);

    if (element instanceof HTMLElement) {
      element.focus();
    }
  },
  { flush: 'post' },
);

declareEntries(form, entries.value);

for (const item of stepList.value) {
  declareEntries(form, item.fields);
}

defineExpose({
  requestSubmit: () => formRef.value?.requestSubmit(),
  back,
});
</script>
