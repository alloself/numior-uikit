<template>
  <th
    scope="col"
    class="nui-table__cell nui-table__cell--head"
    :class="[
      alignClass(column),
      ...layout.cellClass(column),
      {
        'nui-table__cell--resizing': resizing,
        'nui-table__cell--dragging': dragging,
        'nui-table__cell--reorderable': column.reorderable,
      },
    ]"
    :style="layout.cellStyle(column)"
    :aria-sort="ariaSortOf(sort, column.key)"
    @pointerdown="onPointerdown"
  >
    <span class="nui-table__head-content">
      <button
        v-if="column.reorderable"
        type="button"
        class="nui-table__grip"
        :aria-label="reorderLabel(column)"
        @keydown="actions.dragKeydown(index, $event)"
      >
        <NuiIcon alias="grip" />
      </button>
      <button
        v-if="column.sortable"
        type="button"
        class="nui-table__sort"
        :class="{
          'nui-table__sort--active': direction !== undefined,
          'nui-table__sort--desc': direction === 'desc',
        }"
        @click="emit('sort', column.key)"
      >
        <span class="nui-table__label" :title="column.label">
          <slot :column="column" :sort="direction">{{ column.label }}</slot>
        </span>
        <NuiIcon
          :alias="direction === undefined ? 'arrow-up-down' : 'arrow-up'"
          class="nui-table__sort-icon"
        />
      </button>
      <span v-else class="nui-table__label" :title="column.label">
        <slot :column="column" :sort="undefined">{{ column.label }}</slot>
      </span>
    </span>
    <span
      v-if="column.resizable"
      role="separator"
      tabindex="0"
      aria-orientation="vertical"
      class="nui-table__resizer"
      :aria-label="resizeLabel(column)"
      :aria-valuenow="layout.widthOf(column)"
      :aria-valuemin="column.minWidth ?? 64"
      :aria-valuemax="column.maxWidth"
      @pointerdown.stop="actions.resizeStart(column, $event)"
      @keydown="actions.resizeKeydown(column, $event)"
      @dblclick="actions.resizeReset(column)"
      @click.stop
    ></span>
  </th>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { alignClass } from './cells';
import { ariaSortOf, directionOf } from './sort';
import type { NuiTableHeadCellProps } from './table.types';

const { column, index, sort, layout, actions, resizing, dragging, resizeLabel, reorderLabel } =
  defineProps<NuiTableHeadCellProps<T>>();
const emit = defineEmits<{ sort: [key: string] }>();

const direction = computed(() => directionOf(sort, column.key));
const onPointerdown = (event: PointerEvent): void => {
  if (column.reorderable) {
    actions.dragStart(index, event);
  }
};
</script>
