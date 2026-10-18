<template>
  <NuiSkeleton v-if="view.kind === 'skeleton'" shape="text" width="100%" />
  <NuiTableGroupCell v-else-if="view.kind === 'group'" :cell="view.cell" @toggle="emit('toggle')" />
  <template v-else>
    <template v-for="lead in view.leads" :key="lead.kind">
      <NuiTableRowGrip
        v-if="lead.kind === 'grip'"
        :label="lead.label"
        :disabled="lead.disabled"
        :active="lead.active"
        @grab="(event: PointerEvent) => emit('grab', event)"
      />
      <NuiTableTreeToggle
        v-else
        :level="lead.level"
        :expandable="lead.expandable"
        :loading="lead.loading"
        @toggle="emit('toggle')"
      />
    </template>
    <NuiTableCellEditor
      v-if="view.editing && editor !== undefined"
      v-bind="editor"
      @update="(value: unknown) => emit('update', value)"
    />
    <slot v-else name="content" v-bind="view.scope">
      <span class="nui-table__text">{{ view.scope.text }}</span>
    </slot>
  </template>
</template>

<script setup lang="ts" generic="T">
import { NuiSkeleton } from '@numior/vue';
import NuiTableCellEditor from './NuiTableCellEditor.vue';
import NuiTableGroupCell from './NuiTableGroupCell.vue';
import NuiTableRowGrip from './NuiTableRowGrip.vue';
import NuiTableTreeToggle from './NuiTableTreeToggle.vue';
import type { NuiTableCellContentProps, NuiTableCellSlot } from './table.types';

const { view, editor } = defineProps<NuiTableCellContentProps<T>>();

const emit = defineEmits<{
  toggle: [];
  grab: [event: PointerEvent];
  update: [value: unknown];
}>();

defineSlots<{
  content?: (scope: NuiTableCellSlot<T>) => unknown;
}>();
</script>
