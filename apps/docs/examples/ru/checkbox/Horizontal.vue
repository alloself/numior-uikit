<template>
  <NuiCheckboxGroup
    v-model="days"
    :options="weekdays"
    label="Дни доставки"
    orientation="horizontal"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCheckboxGroup, type NuiOption } from '@numior/vue';

const days = ref(['mon', 'wed']);

const weekdays: NuiOption[] = [
  { value: 'mon', label: 'Пн' },
  { value: 'tue', label: 'Вт' },
  { value: 'wed', label: 'Ср' },
  { value: 'thu', label: 'Чт' },
  { value: 'fri', label: 'Пт' },
];
</script>
