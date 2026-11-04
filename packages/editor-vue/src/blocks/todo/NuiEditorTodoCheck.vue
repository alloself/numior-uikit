<template>
  <NuiCheckbox
    class="nui-editor-todo__check"
    size="sm"
    :model-value="node.attrs.checked === true"
    :readonly="!editable"
    :aria-label="texts.done({ text: summary })"
    @update:model-value="toggle"
  />
</template>

<script setup lang="ts">
import { ContentNodeKind, inlineText } from '@numior/editor-core';
import { useMessages } from '@numior/primitives';
import { NuiCheckbox } from '@numior/vue';
import { computed } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import type { NuiEditorBlockViewProps } from '../block.types';

const { node, editable, editor } = defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);

const summary = computed(() => {
  const first = node.content[0];

  return first?.kind === ContentNodeKind.Element ? inlineText(first) : '';
});

const toggle = (checked: boolean): void => {
  editor.setAttrs({ checked });
};
</script>
