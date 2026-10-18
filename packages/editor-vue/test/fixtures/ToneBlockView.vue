<template>
  <button type="button" @click="raiseTone">
    {{ `${String(node.attrs.tone)} ${String(count)}` }}
  </button>
</template>

<script setup lang="ts">
import type { ElementNode } from '@numior/editor-core';
import type { NuiEditorBlockContext } from '../../src';
import { toneClicks } from './block-states';

const { node, editor } = defineProps<{ node: ElementNode; editor: NuiEditorBlockContext }>();

const count = toneClicks.use(node);

const raiseTone = (): void => {
  count.value += 1;
  editor.setAttrs({ tone: 'warning' });
};
</script>
