<template>
  <NuiChip
    v-for="filter in filters"
    :key="filter"
    :remove-label="`Remove the ${filter} filter`"
    removable
    @remove="remove(filter)"
  >
    {{ filter }}
  </NuiChip>
  <NuiButton v-if="filters.length === 0" variant="link" size="sm" @click="reset">
    Restore the filters
  </NuiButton>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiChip } from '@numior/vue';

const DEFAULT_FILTERS = ['Vue', 'TypeScript', 'SSR'];
const filters = ref([...DEFAULT_FILTERS]);

const remove = (filter: string): void => {
  filters.value = filters.value.filter((item) => item !== filter);
};

const reset = (): void => {
  filters.value = [...DEFAULT_FILTERS];
};
</script>
