<template>
  <NuiButton
    class="nui-editor-toggle__button"
    variant="ghost"
    tone="neutral"
    size="sm"
    icon="chevron-right"
    :aria-expanded="open"
    :aria-label="open ? texts.collapse : texts.expand"
    @mousedown.prevent
    @click="open = !open"
  />
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiButton } from '@numior/vue';
import { watch } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import type { NuiEditorBlockViewProps } from '../block.types';
import { OPEN_CLASS, toggleOpen } from './toggle-state';

const { node, element } = defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);

const open = toggleOpen.use(node);

watch(
  () => node.attrs.open,
  (value) => {
    open.value = value === true;
  },
);

watch(
  open,
  (value) => {
    element.classList.toggle(OPEN_CLASS, value);
  },
  { flush: 'post', immediate: true },
);
</script>
