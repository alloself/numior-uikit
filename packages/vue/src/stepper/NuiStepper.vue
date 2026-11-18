<template>
  <component
    :is="root.tag"
    class="nui-stepper"
    :class="[`nui-stepper--orientation-${layout}`, { 'nui-stepper--readonly': readonly }]"
    :aria-label="root.label"
  >
    <ol class="nui-stepper__list" role="list">
      <li
        v-for="(view, index) in views"
        :key="view.step.value"
        class="nui-stepper__item"
        :class="[
          `nui-stepper__item--${view.status}`,
          {
            'nui-stepper__item--current': view.current,
            'nui-stepper__item--clickable': view.clickable,
            'nui-stepper__item--disabled': view.step.disabled,
          },
        ]"
      >
        <component
          :is="view.trigger.tag"
          class="nui-stepper__step"
          :type="view.trigger.type"
          :aria-current="view.current ? 'step' : undefined"
          :disabled="view.step.disabled || undefined"
          @click="select(view)"
        >
          <NuiRow :description="view.step.description">
            <template #leading>
              <span class="nui-stepper__indicator" aria-hidden="true">
                <NuiIcon v-if="view.mark" :icon="view.mark" class="nui-stepper__mark" />
                <template v-else>{{ numbers.format(index + 1) }}</template>
              </span>
            </template>
            {{ view.step.label
            }}<span v-if="statusText(view)" class="nui-stepper__status"
              >, {{ statusText(view) }}</span
            >
          </NuiRow>
        </component>
        <span v-if="index < views.length - 1" class="nui-stepper__connector" aria-hidden="true" />
      </li>
      <slot />
    </ol>
    <p v-if="views.length > 0" class="nui-stepper__summary" aria-hidden="true">
      <span class="nui-stepper__summary-label">{{ currentLabel }}</span>
      <span class="nui-stepper__summary-count">{{ summaryText }}</span>
    </p>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocale, useMessages } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiRow from '../row/NuiRow.vue';
import { counterStyleOf } from './step-numerals';
import { stepViews, type StepView } from './step-view';
import { provideStepper } from './stepper-context';
import { stepperMessages } from './stepper.messages';
import { NuiStepperOrientation, NuiStepperStatus, type NuiStepperProps } from './stepper.types';

const {
  steps = [],
  orientation,
  linear = true,
  readonly = false,
  label,
  completeLabel,
  errorLabel,
} = defineProps<NuiStepperProps>();

const model = defineModel<string>();

defineSlots<{ default?(): unknown }>();

const locale = useLocale();
const messages = useMessages(stepperMessages, locale);

const numbers = computed(() => new Intl.NumberFormat(locale.value));
const numerals = computed(() => counterStyleOf(numbers.value));
const currentIndex = computed(() => steps.findIndex((step) => step.value === model.value));
const views = computed(() => stepViews(steps, currentIndex.value, { linear, readonly }));
const currentLabel = computed(() => steps[currentIndex.value]?.label ?? '');

const layout = computed(
  () =>
    orientation ?? (readonly ? NuiStepperOrientation.Vertical : NuiStepperOrientation.Horizontal),
);

const texts = computed(() => ({
  label: label ?? messages.value.label,
  complete: completeLabel ?? messages.value.complete,
  error: errorLabel ?? messages.value.error,
}));

const root = computed(() =>
  readonly ? { tag: 'div', label: undefined } : { tag: 'nav', label: texts.value.label },
);

const summaryText = computed(() =>
  messages.value.summary({
    current: numbers.value.format(Math.max(currentIndex.value, 0) + 1),
    total: numbers.value.format(steps.length),
  }),
);

const statusText = (view: StepView): string | undefined => {
  if (view.status === NuiStepperStatus.Complete) {
    return texts.value.complete;
  }
  return view.status === NuiStepperStatus.Error ? texts.value.error : undefined;
};

const select = (view: StepView): void => {
  if (!view.clickable) {
    return;
  }

  model.value = view.step.value;
};

provideStepper({ readonly: () => readonly, numerals: () => numerals.value });
</script>
