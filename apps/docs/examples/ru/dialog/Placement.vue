<template>
  <NuiButton variant="outline" @click="open = true">Новая задача</NuiButton>
  <NuiDialog v-model:open="open" placement="top" size="lg" title="Новая задача">
    <NuiInput v-model="title" label="Название" placeholder="Обновить каталог" />
    <NuiTextarea v-model="details" label="Описание" :rows="3" class="nui-mt-3" />
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Отмена</NuiButton>
      <NuiButton @click="open = false">Создать</NuiButton>
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
