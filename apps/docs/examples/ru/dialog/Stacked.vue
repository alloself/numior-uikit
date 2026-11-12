<template>
  <NuiButton variant="outline" @click="details = true">Заказ 20411</NuiButton>
  <NuiDialog v-model:open="details" title="Заказ 20411" description="Нина Зайцева, Екатеринбург">
    <p>Два кресла «Осло» на 37 800 ₽ ждут оплаты переводом.</p>
    <template #footer>
      <NuiButton variant="ghost" tone="error" @click="cancelling = true">Отменить заказ</NuiButton>
      <NuiButton @click="details = false">Готово</NuiButton>
    </template>
  </NuiDialog>
  <NuiDialog v-model:open="cancelling" title="Отменить заказ 20411?" size="sm">
    <p>Нина Зайцева получит письмо, а кресла вернутся на склад.</p>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="cancelling = false">Назад</NuiButton>
      <NuiButton tone="error" @click="closeAll">Отменить заказ</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

const details = ref(false);
const cancelling = ref(false);

const closeAll = (): void => {
  cancelling.value = false;
  details.value = false;
};
</script>
