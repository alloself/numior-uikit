<template>
  <NuiStepper
    v-model="step"
    :steps="steps"
    orientation="vertical"
    :linear="false"
    label="Настройки проекта"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiStepper, type NuiStepperStep } from '@numior/vue';

const steps: NuiStepperStep[] = [
  { value: 'general', label: 'Основное', description: 'Название и описание', status: 'complete' },
  { value: 'access', label: 'Доступ', description: 'Роли и приглашения', status: 'error' },
  { value: 'integrations', label: 'Интеграции' },
  { value: 'billing', label: 'Оплата', disabled: true },
];

const step = ref('integrations');
</script>
