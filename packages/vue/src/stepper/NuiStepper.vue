<template>
  <nav
    class="nui-stepper"
    :class="`nui-stepper--orientation-${orientation}`"
    :aria-label="texts.label"
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
          :is="view.interactive ? 'button' : 'span'"
          class="nui-stepper__step"
          :type="view.interactive ? 'button' : undefined"
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
    </ol>
    <p class="nui-stepper__summary" aria-hidden="true">
      <span class="nui-stepper__summary-label">{{ currentLabel }}</span>
      <span class="nui-stepper__summary-count">{{ summaryText }}</span>
    </p>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocale, useMessages } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiRow from '../row/NuiRow.vue';
import { stepViews, type StepView } from './step-view';
import { stepperMessages } from './stepper.messages';
import type { NuiStepperProps } from './stepper.types';

const {
  steps,
  orientation = 'horizontal',
  linear = true,
  label,
  completeLabel,
  errorLabel,
} = defineProps<NuiStepperProps>();

const model = defineModel<string>();

const locale = useLocale();
const messages = useMessages(stepperMessages, locale);

const numbers = computed(() => new Intl.NumberFormat(locale.value));
const currentIndex = computed(() => steps.findIndex((step) => step.value === model.value));
const views = computed(() => stepViews(steps, currentIndex.value, linear));
const currentLabel = computed(() => steps[currentIndex.value]?.label ?? '');

const texts = computed(() => ({
  label: label ?? messages.value.label,
  complete: completeLabel ?? messages.value.complete,
  error: errorLabel ?? messages.value.error,
}));

const summaryText = computed(() =>
  messages.value.summary({
    current: numbers.value.format(Math.max(currentIndex.value, 0) + 1),
    total: numbers.value.format(steps.length),
  }),
);

const statusText = (view: StepView): string | undefined => {
  if (view.status === 'complete') {
    return texts.value.complete;
  }
  return view.status === 'error' ? texts.value.error : undefined;
};

const select = (view: StepView): void => {
  if (view.clickable) {
    model.value = view.step.value;
  }
};
</script>
