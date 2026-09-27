<template>
  <NuiToggleGroup v-model="side" :items="sides" label="Сторона" variant="segmented" size="sm" />
  <NuiButton variant="outline" @click="open = true">Открыть панель</NuiButton>
  <NuiDrawer v-model:open="open" :side="side ?? 'end'" title="Уведомления" size="sm">
    <p>Новых уведомлений нет.</p>
  </NuiDrawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDrawer, NuiToggleGroup, type NuiDrawerSide } from '@numior/vue';

const open = ref(false);
const side = ref<NuiDrawerSide | null>('end');

const sides = [
  { value: 'start', label: 'В начале' },
  { value: 'end', label: 'В конце' },
  { value: 'top', label: 'Сверху' },
  { value: 'bottom', label: 'Снизу' },
];
</script>
