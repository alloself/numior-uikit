<template>
  <NuiNumberField
    v-model="price"
    label="Price"
    description="Euro, step 0.5"
    :min="0"
    :step="0.5"
    :format-options="{ style: 'currency', currency: 'EUR' }"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiNumberField } from '@numior/vue';

const price = ref<number | null>(12.5);
</script>
