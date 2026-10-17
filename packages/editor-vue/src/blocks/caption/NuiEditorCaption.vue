<template>
  <textarea
    v-if="editable"
    ref="field"
    class="nui-content__caption nui-editor-caption"
    :class="{ 'nui-editor-caption--quiet': !selected && draft === '' }"
    rows="1"
    :value="draft"
    :placeholder="texts.imageCaption"
    :aria-label="texts.imageCaption"
    @input="onInput"
    @change="commit"
    @keydown="onKeydown"
  />
  <span v-else-if="caption !== ''" class="nui-content__caption">{{ caption }}</span>
</template>

<script setup lang="ts">
import { nodeSize, textSelection, type Command, type ElementNode } from '@numior/editor-core';
import { useMessages } from '@numior/primitives';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import type { NuiEditorBlockContext } from '../block.types';

const { node, editor, editable, selected } = defineProps<{
  node: ElementNode;
  editor: NuiEditorBlockContext;
  editable: boolean;
  selected: boolean;
}>();

const texts = useMessages(editorMessages);
const field = useTemplateRef<HTMLTextAreaElement>('field');

const caption = computed(() => (typeof node.attrs.caption === 'string' ? node.attrs.caption : ''));
const draft = ref(caption.value);

const fitsItself = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content');

const fit = (): void => {
  if (field.value !== null && !fitsItself) {
    field.value.style.blockSize = 'auto';
    field.value.style.blockSize = `${String(field.value.scrollHeight)}px`;
  }
};

const onInput = (event: Event): void => {
  if (event.target instanceof HTMLTextAreaElement) {
    draft.value = event.target.value;
  }
  fit();
};

const commit = (): void => {
  if (draft.value.trim() !== caption.value) {
    editor.setAttrs({ caption: draft.value.trim() });
  }
};

const paragraphAfter: Command = (state, dispatch) => {
  const from = state.doc.positionOf(node.id);
  const current = state.doc.byId(node.id);

  if (from === undefined || current === undefined || !state.doc.schema.nodes.has('paragraph')) {
    return false;
  }
  const at = from + nodeSize(current);
  const tr = state.tr;

  tr.insert(at, [state.doc.schema.element('paragraph', { id: tr.newId() })]);
  tr.setSelection(textSelection(at + 1));
  dispatch?.(tr);
  return true;
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault();
    commit();
    editor.run(paragraphAfter);
    editor.focus();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    draft.value = caption.value;
    editor.focus();
  }
};

watch(caption, (value) => {
  draft.value = value;
});

watch(draft, fit, { flush: 'post' });

onMounted(fit);

defineExpose({ fit });
</script>
