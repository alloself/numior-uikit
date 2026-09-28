<template>
  <div class="nui-w-full nui-grid-auto nui-gap-4">
    <div
      v-for="item in stats"
      :key="item.label"
      class="nui-border nui-rounded nui-p-4 nui-bg-surface-elevated nui-flex nui-flex-col nui-gap-1"
    >
      <span class="nui-text-sm nui-text-muted">{{ item.label }}</span>
      <span class="nui-text-2xl nui-font-semibold nui-tabular-nums">{{ item.value }}</span>
      <span class="nui-text-xs" :class="item.up ? 'nui-text-success' : 'nui-text-error'">{{
        item.delta
      }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const stats = [
  { label: 'Revenue', value: '$1.2M', delta: '+8% this month', up: true },
  { label: 'Orders', value: '3,480', delta: '+3% this month', up: true },
  { label: 'Returns', value: '42', delta: '−1% this month', up: false },
];
</script>
