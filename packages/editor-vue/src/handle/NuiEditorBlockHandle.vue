<template>
  <div
    class="nui-editor-handle"
    :class="{
      'nui-editor-handle--shown': index !== undefined,
      'nui-editor-handle--dragging': dragging,
    }"
  >
    <NuiMenu
      v-model:open="open"
      :items="entries"
      :label="texts.blockActions"
      placement="bottom-start"
    >
      <template #trigger="{ attrs }">
        <NuiButton
          v-bind="attrs"
          class="nui-editor-handle__grip"
          variant="ghost"
          tone="neutral"
          size="sm"
          icon="grip"
          tabindex="-1"
          :aria-label="texts.blockActions"
          @pointerdown="emit('grip', $event)"
          @mousedown.prevent
        />
      </template>
    </NuiMenu>
  </div>
</template>

<script setup lang="ts">
import {
  deleteBlock,
  duplicateBlock,
  focusBlock,
  moveBlock,
  sequence,
  type Command,
} from '@numior/editor-core';
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiMenu, type NuiMenuEntry } from '@numior/vue';
import { computed } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import { slashItems } from '../slash/slash-items';
import type { NuiEditorBlockHandleProps } from './handle.types';

const { state, index, dragging } = defineProps<NuiEditorBlockHandleProps>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  run: [command: Command];
  grip: [event: PointerEvent];
}>();

const texts = useMessages(editorMessages);

const turnInto = (at: number): NuiMenuEntry[] =>
  slashItems(state.doc.schema, texts.value)
    .filter((item) => item.key !== 'divider')
    .map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      onSelect: () => emit('run', sequence(focusBlock(at), item.command)),
    }));

const entries = computed((): NuiMenuEntry[] => {
  const at = index ?? 0;
  const last = state.doc.root.content.length - 1;

  return [
    { type: 'sub', label: texts.value.turnInto, icon: 'refresh', items: turnInto(at) },
    {
      label: texts.value.duplicate,
      icon: 'copy',
      onSelect: () => emit('run', duplicateBlock(at)),
    },
    {
      label: texts.value.moveUp,
      icon: 'arrow-up',
      disabled: at === 0,
      onSelect: () => emit('run', moveBlock(at, at - 1)),
    },
    {
      label: texts.value.moveDown,
      icon: 'arrow-down',
      disabled: at >= last,
      onSelect: () => emit('run', moveBlock(at, at + 1)),
    },
    { type: 'separator' },
    {
      label: texts.value.deleteBlock,
      icon: 'trash',
      tone: 'error',
      onSelect: () => emit('run', deleteBlock(at)),
    },
  ];
});
</script>
