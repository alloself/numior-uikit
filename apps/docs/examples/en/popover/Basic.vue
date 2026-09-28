<template>
  <NuiPopover v-model:open="open" placement="bottom-start" arrow>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline">Author</NuiButton>
    </template>
    <div class="flex flex-col gap-3 p-1">
      <NuiInput v-model="author" label="Name" placeholder="Anna Titova" />
      <NuiButton size="sm" @click="open = false">Apply</NuiButton>
    </div>
  </NuiPopover>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiPopover } from '@numior/vue';

const open = ref(false);
const author = ref('');
</script>
