<template>
  <NuiButton variant="outline" @click="open = true">Вернуть товар</NuiButton>
  <NuiDialog v-model:open="open" :closable="false" title="Примите условия возврата">
    <p>
      Товар принимается в заводской упаковке и без следов использования. Деньги вернутся на карту за
      десять дней после того, как склад его примет.
    </p>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Отказаться</NuiButton>
      <NuiButton @click="open = false">Принимаю</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/kit';

const open = ref(false);
</script>
