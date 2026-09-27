<template>
  <NuiButton variant="outline" @click="publish">Publish the report</NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, useToast } from '@numior/vue';

const toast = useToast();

const publish = (): void => {
  const id = toast.info('Publishing the report…', { duration: 0, dismissible: false });

  setTimeout(() => {
    toast.show({ id, title: 'Report published', tone: 'success', duration: 4000 });
  }, 1500);
};
</script>
