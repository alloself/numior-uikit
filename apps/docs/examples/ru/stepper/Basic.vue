<template>
  <div class="nui-flex nui-flex-col nui-gap-4 nui-w-full nui-max-w-lg">
    <NuiStepper v-model="step" :steps="steps" label="Регистрация" />
    <div class="nui-flex nui-justify-end nui-gap-2">
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
  { value: 'account', label: 'Аккаунт', description: 'Почта и пароль' },
  { value: 'profile', label: 'Профиль', description: 'Имя и компания' },
  { value: 'team', label: 'Команда' },
  { value: 'done', label: 'Готово' },
];

const step = ref('profile');
const index = computed(() => steps.findIndex((item) => item.value === step.value));

const move = (delta: number): void => {
  step.value = steps[index.value + delta]?.value ?? step.value;
};
</script>
