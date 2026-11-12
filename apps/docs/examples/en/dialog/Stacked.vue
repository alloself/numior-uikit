<template>
  <NuiButton variant="outline" @click="details = true">Order 20411</NuiButton>
  <NuiDialog v-model:open="details" title="Order 20411" description="Nina Hart, Austin">
    <p>2 Oslo armchairs for $498, awaiting a bank transfer.</p>
    <template #footer>
      <NuiButton variant="ghost" tone="error" @click="cancelling = true">Cancel order</NuiButton>
      <NuiButton @click="details = false">Done</NuiButton>
    </template>
  </NuiDialog>
  <NuiDialog v-model:open="cancelling" title="Cancel order 20411?" size="sm">
    <p>Nina Hart gets an email, and the armchairs go back to the warehouse.</p>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="cancelling = false">Back</NuiButton>
      <NuiButton tone="error" @click="closeAll">Cancel order</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

const details = ref(false);
const cancelling = ref(false);

const closeAll = (): void => {
  cancelling.value = false;
  details.value = false;
};
</script>
