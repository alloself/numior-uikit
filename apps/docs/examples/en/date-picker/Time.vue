<template>
  <NuiDatePicker
    v-model="courier"
    label="Courier arrival"
    description="The courier calls an hour before arriving"
    time
    :time-step="30"
    today="2026-09-27"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDatePicker } from '@numior/kit';

const courier = ref<string | null>('2026-09-29T14:30');
</script>
