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
    <NuiSmartFormEntries :form="form" :entries="item.fields" :layout="item.layout">
      <template v-for="name in Object.keys($slots)" #[name]="scope">
        <slot :name="name" v-bind="scope" />
      </template>
    </NuiSmartFormEntries>
  </div>
  <span class="nui-smart-form__live" aria-live="polite">{{ live }}</span>
</template>

<script setup lang="ts" generic="T extends object">
import { computed, useTemplateRef } from 'vue';
import { NuiStepper } from '@numior/vue';
import NuiSmartFormEntries from './NuiSmartFormEntries.vue';
import type { NuiSmartFormPartSlots, NuiSmartFormStepsProps } from './smart-form.types';

const { form, steps, current, statuses, live } = defineProps<NuiSmartFormStepsProps<T>>();

defineSlots<NuiSmartFormPartSlots>();

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
