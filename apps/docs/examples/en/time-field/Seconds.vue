<template>
  <NuiTimeField
    v-model="shipped"
    label="Left the warehouse"
    description="Order 20408 was handed to the courier"
    seconds
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTimeField } from '@numior/vue';

const shipped = ref<string | null>('14:05:37');
</script>
