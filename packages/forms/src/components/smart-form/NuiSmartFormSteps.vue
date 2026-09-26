<template>
  <NuiStepper
    class="nui-smart-form__stepper"
    :model-value="steps[current]?.value ?? ''"
    :steps="stepperSteps"
    @update:model-value="onSelect"
  />
  <div
    v-for="(item, index) in steps"
    :hidden="index !== current"
    ref="panels"
    :key="item.value"
    class="nui-smart-form__step"
    role="group"
    :aria-label="item.label"
  >
    <NuiSmartFormEntries :entries="item.fields" :scope="scope" :layout="item.layout" />
  </div>
  <span class="nui-smart-form__live" aria-live="polite">{{ live }}</span>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { NuiStepper } from '@numior/vue';
import NuiSmartFormEntries from './NuiSmartFormEntries.vue';
import type { NuiSmartFormStepsProps } from './smart-form.types';

const { steps, current, scope, statuses, live } = defineProps<NuiSmartFormStepsProps>();

const emit = defineEmits<{ select: [value: string] }>();

const panels = useTemplateRef<HTMLElement[]>('panels');

const stepperSteps = computed(() =>
  steps.map((step, index) => ({
    value: step.value,
    label: step.label,
    description: step.description,
    status: statuses[index],
  })),
);

const onSelect = (value: string | undefined): void => {
  if (value !== undefined) {
    emit('select', value);
  }
};

defineExpose({ panel: (index: number): HTMLElement | undefined => panels.value?.[index] });
</script>
