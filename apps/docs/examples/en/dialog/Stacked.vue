<template>
  <NuiButton variant="outline" @click="settings = true">Project settings</NuiButton>
  <NuiDialog v-model:open="settings" title="Project settings">
    <p>Name, team and access.</p>
    <template #footer>
      <NuiButton variant="ghost" tone="error" @click="confirm = true">Delete project</NuiButton>
      <NuiButton @click="settings = false">Done</NuiButton>
    </template>
  </NuiDialog>
  <NuiDialog v-model:open="confirm" title="Delete the project?" size="sm">
    <p>The second dialog stacks above the first; Esc closes only this one.</p>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="confirm = false">Cancel</NuiButton>
      <NuiButton tone="error" @click="closeAll">Delete</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

const settings = ref(false);
const confirm = ref(false);

const closeAll = (): void => {
  confirm.value = false;
  settings.value = false;
};
</script>
