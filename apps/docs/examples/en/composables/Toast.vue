<template>
  <div class="flex flex-wrap gap-2">
    <NuiButton
      @click="toast.success('Order placed', { description: 'Number 4812, delivery on Wednesday' })"
      >Success</NuiButton
    >
    <NuiButton
      tone="error"
      variant="outline"
      @click="toast.error('Payment failed', { action: { label: 'Retry', onClick: retry } })"
      >Error</NuiButton
    >
    <NuiButton tone="neutral" variant="ghost" @click="toast.clear()">Clear all</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { NuiButton, useToast } from '@numior/kit';

const toast = useToast();

const retry = (): void => {
  toast.info('Trying again');
};
</script>
