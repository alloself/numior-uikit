<template>
  <NuiButton tone="error" variant="outline" @click="open = true">Delete project</NuiButton>
  <p class="text-sm text-muted-foreground">Result: {{ result || '—' }}</p>
  <NuiDialog
    v-model:open="open"
    title="Delete the “Catalogue 2026” project?"
    description="This cannot be undone."
    @close="result = $event"
  >
    <p>Every project file is deleted together with the change history.</p>
    <template #footer>
      <form method="dialog" class="flex gap-2">
        <NuiButton type="submit" value="cancel" variant="ghost" tone="neutral">Cancel</NuiButton>
        <NuiButton type="submit" value="confirm" tone="error">Delete</NuiButton>
      </form>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

const open = ref(false);
const result = ref('');
</script>
