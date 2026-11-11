<template>
  <NuiButton variant="outline" tone="neutral" @click="open = true">Start a refund</NuiButton>
  <NuiDialog v-model:open="open" v-bind="$attrs">
    <p>The item goes back to stock once it is received. A refund cannot be undone.</p>
    <template #footer>
      <form method="dialog" class="flex gap-2">
        <NuiButton type="submit" value="cancel" variant="ghost" tone="neutral">Cancel</NuiButton>
        <NuiButton type="submit" value="confirm">Refund</NuiButton>
      </form>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

const open = ref(false);
</script>
