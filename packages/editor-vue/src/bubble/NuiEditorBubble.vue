<template>
  <NuiPopover
    v-model:open="shown"
    class="nui-editor-bubble"
    :anchor="anchor"
    mode="manual"
    placement="top"
    :offset="8"
    padding="sm"
    @mousedown.prevent
  >
    <div
      ref="bar"
      class="nui-editor-bubble__bar"
      role="toolbar"
      :aria-label="texts.formatting"
      @keydown="onKeydown"
      @focusin="navigation.onFocusin"
    >
      <NuiEditorToolbarGroup
        v-if="group"
        :group="group"
        @run="(command, refocus) => emit('run', command, refocus)"
        @link="emit('link')"
        @colour="(mark, name) => emit('colour', mark, name)"
      />
    </div>
    <NuiEditorToolbarHints :anchor="bar" :hints="hints" />
  </NuiPopover>
</template>

<script setup lang="ts">
import type { Command } from '@numior/editor-core';
import { useListNavigation, useMessages } from '@numior/primitives';
import { NuiPopover } from '@numior/vue';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import NuiEditorToolbarGroup from '../toolbar/NuiEditorToolbarGroup.vue';
import NuiEditorToolbarHints from '../toolbar/NuiEditorToolbarHints.vue';
import { provideToolbarHints } from '../toolbar/toolbar-hints';
import { toolbarGroups } from '../toolbar/toolbar-items';
import type { ColourMark } from '../toolbar/toolbar.types';
import type { NuiEditorBubbleProps } from './bubble.types';

const { state, options, anchor, open } = defineProps<NuiEditorBubbleProps>();

const emit = defineEmits<{
  run: [command: Command, refocus: boolean];
  link: [];
  colour: [mark: ColourMark, name: string | null];
  leave: [];
}>();

const bar = useTemplateRef<HTMLElement>('bar');
const hints = provideToolbarHints();
const shown = ref(open);
const texts = useMessages(editorMessages);

const group = computed(() =>
  toolbarGroups(state, texts.value, options).find((candidate) => candidate.key === 'marks'),
);

const navigation = useListNavigation(bar, {
  items: hints.controls.elements,
  orientation: 'horizontal',
  typeahead: false,
});

watch(
  () => open,
  (value) => {
    shown.value = value;
  },
);

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('leave');
    return;
  }
  navigation.onKeydown(event);
};

const focus = (): void => {
  navigation.setActive(navigation.items()[0] ?? null);
};

defineExpose({ focus });
</script>
