<template>
  <NuiCollapsible v-model:open="open">
    <template #trigger="{ open: expanded }">{{
      expanded ? 'Скрыть детали' : 'Показать детали'
    }}</template>
    <p class="nui-m-0 nui-text-sm nui-text-muted">Заказ 4812 собран на складе и передан курьеру.</p>
  </NuiCollapsible>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCollapsible } from '@numior/vue';

const open = ref(true);
</script>
