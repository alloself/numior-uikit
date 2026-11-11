<template>
  <NuiButton @click="toast.info('Draft saved', { description: 'Sync in a minute' })">
    Info
  </NuiButton>
  <NuiButton variant="soft" tone="success" @click="toast.success('Project published')">
    Success
  </NuiButton>
  <NuiButton variant="outline" tone="error" @click="fail">Error with an action</NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, useToast } from '@numior/vue';

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
