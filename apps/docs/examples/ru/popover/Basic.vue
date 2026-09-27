<template>
  <NuiPopover v-model:open="open" placement="bottom-start" arrow>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline">Автор</NuiButton>
    </template>
    <div class="nui-flex nui-flex-col nui-gap-3 nui-p-1">
      <NuiInput v-model="author" label="Имя" placeholder="Анна Титова" />
      <NuiButton size="sm" @click="open = false">Применить</NuiButton>
    </div>
  </NuiPopover>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, NuiPopover } from '@numior/vue';

const open = ref(false);
const author = ref('');
</script>
