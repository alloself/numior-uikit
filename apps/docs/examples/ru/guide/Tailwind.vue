<template>
  <div class="w-full grid-auto gap-4">
    <div
      v-for="item in stats"
      :key="item.label"
      class="border rounded-md p-4 bg-surface-elevated flex flex-col gap-1"
    >
      <span class="text-sm text-muted-foreground">{{ item.label }}</span>
      <span class="text-2xl font-semibold tabular-nums">{{ item.value }}</span>
      <span class="text-xs" :class="item.up ? 'text-success' : 'text-error'">{{ item.delta }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const stats = [
  { label: 'Выручка', value: '1,2 млн ₽', delta: '+8 % за месяц', up: true },
  { label: 'Заказы', value: '3 480', delta: '+3 % за месяц', up: true },
  { label: 'Возвраты', value: '42', delta: '−1 % за месяц', up: false },
];
</script>
