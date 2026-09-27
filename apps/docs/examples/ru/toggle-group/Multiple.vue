<template>
  <NuiToggleGroup
    v-model:values="panels"
    :items="items"
    multiple
    icon-only
    size="sm"
    label="Панели"
  />
  <p class="nui-m-0 nui-text-sm nui-text-muted">Открыто: {{ panels.join(', ') || 'ничего' }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/vue';

const panels = ref(['preview']);

const items: readonly NuiToggleItem[] = [
  { value: 'preview', label: 'Превью', icon: 'eye' },
  { value: 'code', label: 'Код', icon: 'code' },
  { value: 'terminal', label: 'Терминал', icon: 'terminal', disabled: true },
];
</script>
