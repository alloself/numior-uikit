<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <NuiChip
        v-for="filter in filters"
        :key="filter.field"
        :remove-label="`Убрать фильтр «${filter.label}»`"
        removable
        @remove="remove(filter.field)"
      >
        {{ filter.label }}
      </NuiChip>
      <NuiButton v-if="filters.length === 0" variant="link" size="sm" @click="reset">
        Вернуть фильтры
      </NuiButton>
    </div>
    <p class="m-0 text-sm text-muted-foreground">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiButton, NuiChip } from '@numior/kit';
import { ORDER_STATUSES, orders, type Order } from '#demo/orders';

interface Filter {
  readonly field: 'status' | 'manager' | 'city';
  readonly value: string;
  readonly label: string;
}

const DEFAULT_FILTERS: readonly Filter[] = [
  { field: 'status', value: 'shipped', label: ORDER_STATUSES.shipped },
  { field: 'manager', value: 'Анна Титова', label: 'Анна Титова' },
  { field: 'city', value: 'Москва', label: 'Москва' },
];

const filters = ref([...DEFAULT_FILTERS]);

const matches = (order: Order): boolean =>
  filters.value.every((filter) => order[filter.field] === filter.value);

const shown = computed(() => orders.reduce((count, order) => count + Number(matches(order)), 0));

const summary = computed(() => `Показываем ${shown.value} из ${orders.length} заказов`);

const remove = (field: Filter['field']): void => {
  filters.value = filters.value.filter((filter) => filter.field !== field);
};

const reset = (): void => {
  filters.value = [...DEFAULT_FILTERS];
};
</script>
