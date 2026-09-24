<template>
  <thead class="nui-table__head">
    <tr class="nui-table__row nui-table__row--head">
      <th
        v-if="selectable"
        scope="col"
        class="nui-table__cell nui-table__cell--head nui-table__cell--select"
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
      <th
        v-for="column in columns"
        :key="column.key"
        scope="col"
        class="nui-table__cell nui-table__cell--head"
        :class="alignClass(column)"
        :style="{ inlineSize: column.width }"
        :aria-sort="ariaSortOf(sort, column.key)"
      >
        <button
          v-if="column.sortable"
          type="button"
          class="nui-table__sort"
          :class="{
            'nui-table__sort--active': directionOf(sort, column.key) !== undefined,
            'nui-table__sort--desc': directionOf(sort, column.key) === 'desc',
          }"
          @click="emit('sort', column.key)"
        >
          <slot
            :name="`header-${column.key}`"
            :column="column"
            :sort="directionOf(sort, column.key)"
          >
            {{ column.label }}
          </slot>
          <NuiIcon
            :alias="directionOf(sort, column.key) === undefined ? 'arrow-up-down' : 'arrow-up'"
            class="nui-table__sort-icon"
          />
        </button>
        <slot v-else :name="`header-${column.key}`" :column="column" :sort="undefined">
          {{ column.label }}
        </slot>
      </th>
    </tr>
  </thead>
</template>

<script setup lang="ts" generic="T">
import NuiCheckbox from '../checkbox/NuiCheckbox.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { alignClass } from './cells';
import { ariaSortOf, directionOf } from './sort';
import type { NuiTableHeadProps } from './table.types';

const { columns, sort, selectable, selectionState, selectionDisabled, selectAllLabel } =
  defineProps<NuiTableHeadProps<T>>();
const emit = defineEmits<{ sort: [key: string]; toggleAll: [] }>();
</script>
