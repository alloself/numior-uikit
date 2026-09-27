<template>
  <div class="nui-flex nui-flex-col nui-gap-3">
    <NuiToggleGroup v-model="scheme" :items="schemes" variant="segmented" required label="Схема" />
    <p class="nui-m-0 nui-text-sm nui-text-muted">Выбрано: {{ scheme }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/vue';

const scheme = ref<string | null>('system');

const schemes: readonly NuiToggleItem[] = [
  { value: 'light', label: 'Светлая', icon: 'sun' },
  { value: 'dark', label: 'Тёмная', icon: 'moon' },
  { value: 'system', label: 'Системная', icon: 'monitor' },
];
</script>
