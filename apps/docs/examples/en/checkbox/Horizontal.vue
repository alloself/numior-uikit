<template>
  <NuiCheckboxGroup
    v-model="days"
    :options="weekdays"
    label="Delivery days"
    orientation="horizontal"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCheckboxGroup, type NuiOption } from '@numior/vue';

const days = ref(['mon', 'wed']);

const weekdays: NuiOption[] = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
];
</script>
