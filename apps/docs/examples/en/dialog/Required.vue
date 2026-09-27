<template>
  <NuiButton variant="outline" @click="open = true">Accept the terms</NuiButton>
  <NuiDialog v-model:open="open" :closable="false" title="New terms of use">
    <p>You can continue only after confirming.</p>
    <template #footer>
      <NuiButton @click="open = false">I confirm</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

const open = ref(false);
</script>
