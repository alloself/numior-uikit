<template>
  <NuiButton tone="error" variant="outline" @click="open = true">Удалить из каталога</NuiButton>
  <NuiDialog
    v-model:open="open"
    title="Удалить табурет «Лофт»?"
    description="Товар пропадёт с витрины и из поиска."
    @close="onClose"
  >
    <p>Прошлые заказы с ним сохранятся, а карточку товара вернуть уже не получится.</p>
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
import { NuiButton, NuiDialog, useToast } from '@numior/kit';

const open = ref(false);
const toast = useToast();

const onClose = (value: string): void => {
  if (value !== 'confirm') {
    return;
  }
  toast.success('Табурет «Лофт» удалён из каталога');
};
</script>
