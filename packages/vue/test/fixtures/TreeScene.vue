<template>
  <div :dir="dir">
    <NuiTree
      v-bind="{ ...props, ...selection.props() }"
      v-model:expanded="expanded"
      :items="items"
      @load="loads.push($event.label)"
      @expand="events.push(`expand:${$event.label}`)"
      @collapse="events.push(`collapse:${$event.label}`)"
      @select="events.push(`select:${$event.label}`)"
    >
      <template v-if="itemSlot" #item="scope">{{ itemSlot(scope) }}</template>
    </NuiTree>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTree, type NuiTreeItem, type NuiTreeItemSlot, type NuiTreeProps } from '../../src';
import type { Selection } from '../support/selection';

const {
  props = {},
  initialItems,
  selection,
  initiallyExpanded = [],
  dir = undefined,
  itemSlot = undefined,
} = defineProps<{
  props?: Partial<Omit<NuiTreeProps<unknown>, 'items'>> | undefined;
  initialItems: readonly NuiTreeItem[];
  selection: Selection;
  initiallyExpanded?: readonly string[] | undefined;
  dir?: 'ltr' | 'rtl' | undefined;
  itemSlot?: ((slot: NuiTreeItemSlot<unknown>) => string) | undefined;
}>();

const items = ref<readonly NuiTreeItem[]>(initialItems);
const expanded = ref<string[]>([...initiallyExpanded]);
const loads: string[] = [];
const events: string[] = [];

defineExpose({ items, expanded, loads, events });
</script>
