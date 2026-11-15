<template>
  <NuiTableDetailRow v-if="view.kind === TableBodyRowViewKind.Detail" v-bind="view.props">
    <slot name="detail" v-bind="view.scope" />
  </NuiTableDetailRow>
  <NuiTableRow
    v-else-if="slotted"
    v-bind="view.props"
    @resize="context.resize"
    @reset-size="context.resetSize"
  >
    <template #utility="{ column, position }">
      <NuiTableUtilityCell
        v-bind="context.utilityAt(view.item, column)"
        @toggle="context.selectAt(position)"
      />
    </template>
    <template #default="{ column, merge, position, icon, copy }">
      <NuiTableCellContent
        :view="context.cellViewAt(view.item, column, merge, copy)"
        :editor="context.editor()"
        :icon="icon"
        @toggle="context.expandAt(position)"
        @grab="(event: PointerEvent) => context.grabAt(position, event)"
        @update="context.update"
      >
        <template #content="scope">
          <slot :name="`cell-${scope.column.key}`" v-bind="scope" />
        </template>
      </NuiTableCellContent>
    </template>
  </NuiTableRow>
  <NuiTableRow v-else v-bind="view.props" @resize="context.resize" @reset-size="context.resetSize">
    <template #utility="{ column, position }">
      <NuiTableUtilityCell
        v-bind="context.utilityAt(view.item, column)"
        @toggle="context.selectAt(position)"
      />
    </template>
    <template #default="{ column, merge, position, icon, copy }">
      <NuiTableCellContent
        :view="context.cellViewAt(view.item, column, merge, copy)"
        :editor="context.editor()"
        :icon="icon"
        @toggle="context.expandAt(position)"
        @grab="(event: PointerEvent) => context.grabAt(position, event)"
        @update="context.update"
      />
    </template>
  </NuiTableRow>
</template>

<script setup lang="ts" generic="T">
import NuiTableCellContent from './NuiTableCellContent.vue';
import NuiTableDetailRow from './NuiTableDetailRow.vue';
import NuiTableRow from './NuiTableRow.vue';
import NuiTableUtilityCell from './NuiTableUtilityCell.vue';
import {
  TableBodyRowViewKind,
  type NuiTableBodyRowProps,
  type NuiTableCellSlot,
  type NuiTableDetailSlot,
} from './table.types';

const { view, slotted, context } = defineProps<NuiTableBodyRowProps<T>>();

defineSlots<
  { detail?(scope: NuiTableDetailSlot<T>): unknown } & Record<
    `cell-${string}`,
    (scope: NuiTableCellSlot<T>) => unknown
  >
>();
</script>
