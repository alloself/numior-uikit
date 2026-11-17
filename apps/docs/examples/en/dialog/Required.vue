<template>
  <NuiButton variant="outline" @click="open = true">Return an item</NuiButton>
  <NuiDialog v-model:open="open" :closable="false" title="Accept the return terms">
    <p>
      We accept items in the original packaging and without signs of use. The money goes back to the
      card within ten days after the warehouse receives the item.
    </p>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Decline</NuiButton>
      <NuiButton @click="open = false">Accept</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/kit';

const open = ref(false);
</script>
