<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <NuiSwitch v-model="failed">Show the error</NuiSwitch>
    <NuiInput
      v-model="promo"
      label="Promo code"
      :error="failed ? 'Promo code not found' : undefined"
      reserve-error
    />
    <NuiButton class="self-start">Apply</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiSwitch } from '@numior/vue';

const failed = ref(false);
const promo = ref('SPRING');
</script>
