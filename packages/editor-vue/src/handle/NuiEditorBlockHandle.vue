<template>
  <div
    class="nui-editor-handle"
    :class="{
      'nui-editor-handle--shown': target !== undefined,
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
  deleteChild,
  duplicateChild,
  focusChild,
  listSlot,
  moveChild,
  sequence,
  type ChildSlot,
  type Command,
} from '@numior/editor-core';
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiMenu, type NuiMenuEntry } from '@numior/vue';
import { computed } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import { slashItems } from '../slash/slash-items';
import type { NuiEditorBlockHandleProps } from './handle.types';

const { state, target, dragging } = defineProps<NuiEditorBlockHandleProps>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  run: [command: Command];
  grip: [event: PointerEvent];
  wholeList: [];
}>();

const texts = useMessages(editorMessages);

const turnInto = (at: ChildSlot): NuiMenuEntry[] =>
  slashItems(state.doc.schema, texts.value)
    .filter((item) => item.key !== 'divider')
    .map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      onSelect: () => emit('run', sequence(focusChild(at), item.command)),
    }));

const siblings = (at: ChildSlot): number =>
  (at.parent === state.doc.root.id ? state.doc.root : state.doc.byId(at.parent))?.content.length ??
  0;

const wholeList = (at: ChildSlot): NuiMenuEntry[] =>
  listSlot(state.doc, at) === undefined
    ? []
    : [{ label: texts.value.wholeList, icon: 'group', onSelect: () => emit('wholeList') }];

const entries = computed((): NuiMenuEntry[] => {
  const at = target ?? { parent: state.doc.root.id, index: 0 };
  const last = siblings(at) - 1;

  return [
    { type: 'sub', label: texts.value.turnInto, icon: 'refresh', items: turnInto(at) },
    {
      label: texts.value.duplicate,
      icon: 'copy',
      onSelect: () => emit('run', duplicateChild(at)),
    },
    {
      label: texts.value.moveUp,
      icon: 'arrow-up',
      disabled: at.index === 0,
      onSelect: () => emit('run', moveChild(at.parent, at.index, at.index - 1)),
    },
    {
      label: texts.value.moveDown,
      icon: 'arrow-down',
      disabled: at.index >= last,
      onSelect: () => emit('run', moveChild(at.parent, at.index, at.index + 1)),
    },
    ...wholeList(at),
    { type: 'separator' },
    {
      label: texts.value.deleteBlock,
      icon: 'trash',
      tone: 'error',
      onSelect: () => emit('run', deleteChild(at)),
    },
  ];
});
</script>
