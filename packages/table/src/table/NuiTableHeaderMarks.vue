<template>
  <NuiTableGrip v-if="grip" v-bind="grip" @grab="emit('grab', $event)" />
  <span
    v-if="state?.sortable"
    class="nui-table__sort"
    :class="{
      'nui-table__sort--active': state.direction !== undefined,
      'nui-table__sort--desc': state.direction === 'desc',
    }"
    aria-hidden="true"
  >
    <NuiIcon
      :alias="state.direction === undefined ? 'arrow-up-down' : 'arrow-up'"
      class="nui-table__sort-icon"
    />
    <span v-if="state.order" class="nui-table__sort-order">{{ state.order }}</span>
  </span>
  <span v-if="hint" class="nui-table__hidden">{{ hint }}</span>
  <button
    v-if="showFilter"
    type="button"
    class="nui-table__filter"
    :class="{ 'nui-table__filter--active': state?.filtered }"
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
    class="nui-table__menu"
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
import NuiTableGrip from './NuiTableGrip.vue';
import type { NuiTableHeaderMarksProps } from './table.types';

const { state, hint, filterLabel, expanded, menuLabel, menuExpanded, grip } =
  defineProps<NuiTableHeaderMarksProps>();

const emit = defineEmits<{
  filter: [event: MouseEvent];
  menu: [event: MouseEvent];
  grab: [event: PointerEvent];
}>();

const showFilter = computed(
  () =>
    state?.filterable === true &&
    (menuLabel === undefined || state.filtered || expanded === 'true'),
);
</script>
