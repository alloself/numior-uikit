<template>
  <div
    v-if="product !== undefined"
    class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-3"
  >
    <div class="flex min-w-48 flex-1 flex-col gap-0.5">
      <span class="font-medium">{{ product.name }}</span>
      <span class="text-sm text-muted-foreground">{{ details }}</span>
    </div>
    <NuiSelect
      v-if="editable"
      :model-value="product.sku"
      :options="options"
      size="sm"
      aria-label="Товар"
      @update:model-value="choose"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { NuiEditorBlockViewProps } from '@numior/kit/editor';
import { NuiSelect } from '@numior/kit';
import { products } from '#demo/products';

const { node, editable, editor } = defineProps<NuiEditorBlockViewProps>();

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const options = products.map((item) => ({ value: item.sku, label: item.name }));

const product = computed(() => products.find((item) => item.sku === node.attrs.sku));

const details = computed(() => {
  if (product.value === undefined) {
    return '';
  }

  const { sku, price, stock } = product.value;
  const left = stock === 0 ? 'нет в наличии' : `в наличии ${String(stock)} шт.`;

  return `${sku} · ${money.format(price)} · ${left}`;
});

const choose = (sku: string | null) => {
  if (sku === null) {
    return;
  }

  editor.setAttrs({ sku });
};
</script>
