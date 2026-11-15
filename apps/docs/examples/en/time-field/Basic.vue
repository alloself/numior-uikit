<template>
  <NuiTimeField
    v-model="pickup"
    label="Pickup time"
    description="The pickup point is open from 10 AM to 8 PM"
    min="10:00"
    max="20:00"
    :step="30"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTimeField } from '@numior/vue';

const pickup = ref<string | null>('12:30');
</script>
