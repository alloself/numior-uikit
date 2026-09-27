<template>
  <NuiSwitch v-model="failed" class="nui-mb-4">Show the error</NuiSwitch>
  <div class="nui-flex nui-gap-2 nui-items-end">
    <NuiInput
      v-model="promo"
      label="Promo code"
      :error="failed ? 'Promo code not found' : undefined"
      reserve-error
    />
    <NuiButton class="nui-mb-5">Apply</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiSwitch } from '@numior/vue';

const failed = ref(false);
const promo = ref('SPRING');
</script>
