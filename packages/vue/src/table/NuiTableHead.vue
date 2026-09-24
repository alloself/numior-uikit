<template>
  <thead class="nui-table__head" @click.capture="actions.headClick">
    <tr class="nui-table__row nui-table__row--head">
      <th
        v-if="rowDrag"
        scope="col"
        class="nui-table__cell nui-table__cell--head nui-table__cell--drag"
        :class="layout.utilityClass(0)"
        :style="layout.utilityStyle(0)"
      ></th>
      <th
        v-if="selectable"
        scope="col"
        class="nui-table__cell nui-table__cell--head nui-table__cell--select"
        :class="layout.utilityClass(rowDrag ? 1 : 0)"
        :style="layout.utilityStyle(rowDrag ? 1 : 0)"
      >
        <NuiCheckbox
          v-if="selectable === 'multiple'"
          size="sm"
          :model-value="selectionState === 'checked'"
          :indeterminate="selectionState === 'indeterminate'"
          :disabled="selectionDisabled"
          :aria-label="selectAllLabel"
          @update:model-value="emit('toggleAll')"
        />
      </th>
      <NuiTableHeadCell
        v-for="(column, index) in columns"
        :key="column.key"
        :column="column"
        :index="index"
        :sort="sort"
        :layout="layout"
        :actions="actions"
        :resizing="resizing === column.key"
        :dragging="dragging === index"
        :resize-label="resizeLabel"
        :reorder-label="reorderLabel"
        @sort="emit('sort', $event)"
      >
        <template #default="ctx">
          <slot :name="`header-${column.key}`" v-bind="ctx">{{ column.label }}</slot>
        </template>
      </NuiTableHeadCell>
    </tr>
  </thead>
</template>

<script setup lang="ts" generic="T">
import NuiCheckbox from '../checkbox/NuiCheckbox.vue';
import NuiTableHeadCell from './NuiTableHeadCell.vue';
import type { NuiTableHeadProps } from './table.types';

const {
  columns,
  sort,
  rowDrag,
  selectable,
  selectionState,
  selectionDisabled,
  selectAllLabel,
  layout,
  actions,
  resizing,
  dragging,
  resizeLabel,
  reorderLabel,
} = defineProps<NuiTableHeadProps<T>>();
const emit = defineEmits<{ sort: [key: string]; toggleAll: [] }>();
</script>
