<template>
  <NuiButton @click="toast.info('Invoice sent', { description: 'Alina Yusuf gets it by email' })">
    Info
  </NuiButton>
  <NuiButton variant="soft" tone="success" @click="toast.success('Order 20409 paid')">
    Success
  </NuiButton>
  <NuiButton variant="outline" tone="error" @click="fail">Error with an action</NuiButton>
</template>

<script setup lang="ts">
import { useToast } from '@numior/primitives';
import { NuiButton } from '@numior/vue';

const toast = useToast();

const fail = (): void => {
  const id = toast.error('Could not save', {
    duration: 0,
    action: {
      label: 'Retry',
      onClick: () => toast.show({ id, title: 'Saved', tone: 'success' }),
    },
  });
};
</script>
