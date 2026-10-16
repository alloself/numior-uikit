<template>
  <NuiButton
    class="nui-editor-toggle__button"
    variant="ghost"
    tone="neutral"
    size="sm"
    :icon-only="true"
    :aria-expanded="open"
    :aria-label="open ? texts.collapse : texts.expand"
    @mousedown.prevent
    @click="open = !open"
  >
    <NuiIcon :alias="pointing.alias" :transform="{ rotate: open ? pointing.open : 0 }" />
  </NuiButton>
</template>

<script setup lang="ts">
import { useDirection, useMessages } from '@numior/primitives';
import { NuiButton, NuiIcon } from '@numior/vue';
import { computed, watch } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import type { NuiEditorBlockViewProps } from '../block.types';
import { OPEN_CLASS, toggleOpen } from './toggle-state';

const { node, element } = defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);

const open = toggleOpen.use(node);

const direction = useDirection(() => element);

const pointing = computed(() =>
  direction.isRtl()
    ? { alias: 'chevron-left' as const, open: -90 }
    : { alias: 'chevron-right' as const, open: 90 },
);

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
