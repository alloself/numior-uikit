<template>
  <NuiStepper
    v-model="step"
    :steps="steps"
    orientation="vertical"
    :linear="false"
    label="Новый товар"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiStepper, type NuiStepperStep } from '@numior/vue';

const steps: NuiStepperStep[] = [
  { value: 'details', label: 'Описание', description: 'Название и категория', status: 'complete' },
  { value: 'price', label: 'Цена', description: 'Не указана цена со скидкой', status: 'error' },
  { value: 'photos', label: 'Фото', description: 'До десяти снимков' },
  { value: 'publish', label: 'Публикация', disabled: true },
];

const step = ref('photos');
</script>
