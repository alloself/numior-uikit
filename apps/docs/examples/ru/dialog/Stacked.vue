<template>
  <NuiButton variant="outline" @click="settings = true">Настройки проекта</NuiButton>
  <NuiDialog v-model:open="settings" title="Настройки проекта">
    <p>Название, команда и доступ.</p>
    <template #footer>
      <NuiButton variant="ghost" tone="error" @click="confirm = true">Удалить проект</NuiButton>
      <NuiButton @click="settings = false">Готово</NuiButton>
    </template>
  </NuiDialog>
  <NuiDialog v-model:open="confirm" title="Удалить проект?" size="sm">
    <p>Второй диалог встаёт выше первого, Esc закрывает только его.</p>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="confirm = false">Отмена</NuiButton>
      <NuiButton tone="error" @click="closeAll">Удалить</NuiButton>
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
