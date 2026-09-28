<template>
  <NuiSwitch v-model="failed" class="mb-4">Show the error</NuiSwitch>
  <div class="flex gap-2 items-end">
    <NuiInput
      v-model="promo"
      label="Promo code"
      :error="failed ? 'Promo code not found' : undefined"
      reserve-error
    />
    <NuiButton class="mb-5">Apply</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiSwitch } from '@numior/vue';

const failed = ref(false);
const promo = ref('SPRING');
</script>
