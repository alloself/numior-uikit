<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <NuiChip
        v-for="filter in filters"
        :key="filter.field"
        :remove-label="`Remove the ${filter.label} filter`"
        removable
        @remove="remove(filter.field)"
      >
        {{ filter.label }}
      </NuiChip>
      <NuiButton v-if="filters.length === 0" variant="link" size="sm" @click="reset">
        Restore the filters
      </NuiButton>
    </div>
    <p class="m-0 text-sm text-muted-foreground">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiButton, NuiChip } from '@numior/vue';
import { ORDER_STATUSES, orders, type Order } from '#demo/orders';

interface Filter {
  readonly field: 'status' | 'manager' | 'city';
  readonly value: string;
  readonly label: string;
}

const DEFAULT_FILTERS: readonly Filter[] = [
  { field: 'status', value: 'shipped', label: ORDER_STATUSES.shipped },
  { field: 'manager', value: 'Anna Turner', label: 'Anna Turner' },
  { field: 'city', value: 'Boston', label: 'Boston' },
];

const filters = ref([...DEFAULT_FILTERS]);

const matches = (order: Order): boolean =>
  filters.value.every((filter) => order[filter.field] === filter.value);

const shown = computed(() => orders.reduce((count, order) => count + Number(matches(order)), 0));

const summary = computed(() => `Showing ${shown.value} of ${orders.length} orders`);

const remove = (field: Filter['field']): void => {
  filters.value = filters.value.filter((filter) => filter.field !== field);
};

const reset = (): void => {
  filters.value = [...DEFAULT_FILTERS];
};
</script>
