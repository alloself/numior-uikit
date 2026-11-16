<template>
  <NuiSkeleton v-if="view.kind === TableCellViewKind.Skeleton" shape="text" width="100%" />
  <NuiTableGroupCell
    v-else-if="view.kind === TableCellViewKind.Group"
    :cell="view.cell"
    @toggle="emit('toggle')"
  />
  <template v-else>
    <template v-for="lead in leads" :key="lead.kind">
      <NuiTableRowGrip
        v-if="lead.kind === TableCellLeadKind.Grip"
        :label="lead.label"
        :disabled="lead.disabled"
        :active="lead.active"
        @grab="(event: PointerEvent) => emit('grab', event)"
      />
      <NuiTableTreeToggle
        v-else-if="lead.kind === TableCellLeadKind.Toggle"
        :node="lead.node"
        :level="lead.level"
        :expandable="lead.expandable"
        :loading="lead.loading"
        @toggle="emit('toggle')"
      />
      <span v-else class="nui-table__icon" :style="{ '--_icon-color': lead.color }">
        <NuiIcon :icon="lead.icon" :filled="lead.filled" />
      </span>
    </template>
    <NuiTableCellEditor
      v-if="editing !== undefined"
      v-bind="editing"
      @update="(value: unknown) => emit('update', value)"
    />
    <slot v-else name="content" v-bind="view.scope">
      <span class="nui-table__text">{{ view.scope.text }}</span>
    </slot>
  </template>
</template>

<script setup lang="ts" generic="T">
import { NuiIcon, NuiSkeleton } from '@numior/vue';
import { computed } from 'vue';
import NuiTableCellEditor from './NuiTableCellEditor.vue';
import NuiTableGroupCell from './NuiTableGroupCell.vue';
import NuiTableRowGrip from './NuiTableRowGrip.vue';
import NuiTableTreeToggle from './NuiTableTreeToggle.vue';
import {
  TableCellLeadKind,
  TableCellViewKind,
  type NuiTableCellContentProps,
  type NuiTableCellSlot,
  type TableCellLead,
} from './table.types';

const { view, editor, icon } = defineProps<NuiTableCellContentProps<T>>();

const emit = defineEmits<{
  toggle: [];
  grab: [event: PointerEvent];
  update: [value: unknown];
}>();

defineSlots<{
  content?: (scope: NuiTableCellSlot<T>) => unknown;
}>();

const leads = computed((): readonly TableCellLead[] => {
  const own = view.kind === TableCellViewKind.Data ? view.leads : [];

  return icon === undefined ? own : [...own, { kind: TableCellLeadKind.Icon, ...icon }];
});

const editing = computed(() =>
  view.kind === TableCellViewKind.Data && view.editing ? editor : undefined,
);
</script>
