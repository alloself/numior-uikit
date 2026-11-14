<template>
  <div class="flex flex-col gap-4 w-full max-w-2xl">
    <NuiStepper v-model="step" :steps="steps" label="Оформление заказа" />
    <div class="flex justify-end gap-2">
      <NuiButton variant="ghost" tone="neutral" :disabled="index === 0" @click="move(-1)"
        >Назад</NuiButton
      >
      <NuiButton :disabled="index === steps.length - 1" @click="move(1)">Дальше</NuiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiButton, NuiStepper, type NuiStepperStep } from '@numior/vue';

const steps: NuiStepperStep[] = [
  { value: 'cart', label: 'Корзина', description: 'Комод и лампа' },
  { value: 'delivery', label: 'Доставка', description: 'Курьер или самовывоз' },
  { value: 'payment', label: 'Оплата', description: 'Картой или переводом' },
  { value: 'done', label: 'Готово' },
];

const step = ref('delivery');
const index = computed(() => steps.findIndex((item) => item.value === step.value));

const move = (delta: number): void => {
  step.value = steps[index.value + delta]?.value ?? step.value;
};
</script>
