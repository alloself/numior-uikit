<template>
  <NuiButton tone="error" variant="outline" @click="open = true">Удалить проект</NuiButton>
  <p class="text-sm text-muted-foreground">Результат: {{ result || '—' }}</p>
  <NuiDialog
    v-model:open="open"
    title="Удалить проект «Каталог 2026»?"
    description="Действие нельзя отменить."
    @close="result = $event"
  >
    <p>Все данные проекта будут удалены вместе с историей изменений.</p>
    <template #footer>
      <form method="dialog" class="flex gap-2">
        <NuiButton type="submit" value="cancel" variant="ghost" tone="neutral">Отмена</NuiButton>
        <NuiButton type="submit" value="confirm" tone="error">Удалить</NuiButton>
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
