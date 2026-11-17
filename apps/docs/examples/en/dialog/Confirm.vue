<template>
  <NuiButton tone="error" variant="outline" @click="open = true">Remove from catalog</NuiButton>
  <NuiDialog
    v-model:open="open"
    title="Remove the Loft stool?"
    description="It disappears from the storefront and from search."
    @close="onClose"
  >
    <p>Past orders keep the item, but its product page cannot be restored.</p>
    <template #footer>
      <form method="dialog" class="flex gap-2">
        <NuiButton type="submit" value="cancel" variant="ghost" tone="neutral">Cancel</NuiButton>
        <NuiButton type="submit" value="confirm" tone="error">Remove</NuiButton>
      </form>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog, useToast } from '@numior/kit';

const open = ref(false);
const toast = useToast();

const onClose = (value: string): void => {
  if (value !== 'confirm') {
    return;
  }
  toast.success('Loft stool removed from the catalog');
};
</script>
