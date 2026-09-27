<template>
  <dd class="nui-text-sm">
    <span class="nui-text-muted">{{ label }}:</span>
    <template v-for="(item, index) in items" :key="item">
      <code>{{ prefix }}{{ item }}</code
      ><span v-if="index < items.length - 1">, </span>
    </template>
  </dd>
</template>

<script setup lang="ts">
import type { ApiCodeListProps } from '../theme.types';

const { label, prefix, items } = defineProps<ApiCodeListProps>();
</script>
