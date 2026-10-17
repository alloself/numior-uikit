<template>
  <Teleport v-for="entry in entries.values()" :key="entry.key" :to="entry.widget">
    <component
      :is="entry.block.view"
      :node="entry.node.value"
      :element="entry.dom"
      :selected="selected === entry.node.value.id"
      :focused="focused"
      :editable="editable"
      :editor="contextOf(entry)"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { blockContext } from './block-context';
import type { NuiEditorBlockContext } from './block.types';
import type { NodeViewEntry } from './node-views';
import type { NuiEditorNodeViewsProps } from './node-views.types';

const { entries, selected, focused, editable, run, focus } = defineProps<NuiEditorNodeViewsProps>();

const contexts = new WeakMap<NodeViewEntry, NuiEditorBlockContext>();

const contextOf = (entry: NodeViewEntry): NuiEditorBlockContext => {
  const context =
    contexts.get(entry) ?? blockContext(entry.node.value.id, run, focus, () => entry.dom);

  contexts.set(entry, context);
  return context;
};
</script>
