<template>
  <NuiButton variant="outline" @click="open = true">New task</NuiButton>
  <NuiDialog v-model:open="open" placement="top" size="lg" title="New task">
    <NuiInput v-model="title" label="Title" placeholder="Update the catalogue" />
    <NuiTextarea v-model="details" label="Details" :rows="3" class="mt-3" />
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Cancel</NuiButton>
      <NuiButton @click="open = false">Create</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog, NuiInput, NuiTextarea } from '@numior/vue';

const open = ref(false);
const title = ref('');
const details = ref('');
</script>
