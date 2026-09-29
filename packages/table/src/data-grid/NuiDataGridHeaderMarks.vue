<template>
  <span
    v-if="state?.sortable"
    class="nui-grid__sort"
    :class="{
      'nui-grid__sort--active': state.direction !== undefined,
      'nui-grid__sort--desc': state.direction === 'desc',
    }"
    aria-hidden="true"
  >
    <NuiIcon
      :alias="state.direction === undefined ? 'arrow-up-down' : 'arrow-up'"
      class="nui-grid__sort-icon"
    />
    <span v-if="state.order" class="nui-grid__sort-order">{{ state.order }}</span>
  </span>
  <span v-if="hint" class="nui-grid__hidden">{{ hint }}</span>
  <button
    v-if="showFilter"
    type="button"
    class="nui-grid__filter"
    :class="{ 'nui-grid__filter--active': state?.filtered }"
    tabindex="-1"
    aria-haspopup="dialog"
    :aria-expanded="expanded"
    :aria-label="filterLabel"
    @click.stop="emit('filter', $event)"
  >
    <NuiIcon alias="filter" />
  </button>
  <button
    v-if="menuLabel"
    type="button"
    class="nui-grid__menu"
    tabindex="-1"
    aria-haspopup="menu"
    :aria-expanded="menuExpanded"
    :aria-label="menuLabel"
    @click.stop="emit('menu', $event)"
  >
    <NuiIcon alias="ellipsis" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiIcon } from '@numior/vue';
import type { NuiDataGridHeaderMarksProps } from './data-grid.types';

const { state, hint, filterLabel, expanded, menuLabel, menuExpanded } =
  defineProps<NuiDataGridHeaderMarksProps>();

const emit = defineEmits<{ filter: [event: MouseEvent]; menu: [event: MouseEvent] }>();

const showFilter = computed(
  () =>
    state?.filterable === true &&
    (menuLabel === undefined || state.filtered || expanded === 'true'),
);
</script>
