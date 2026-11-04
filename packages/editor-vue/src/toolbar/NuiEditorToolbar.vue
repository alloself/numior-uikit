<template>
  <div
    ref="root"
    class="nui-editor-toolbar"
    :class="{ 'nui-editor-toolbar--disabled': disabled, 'nui-editor-toolbar--docked': docked }"
    role="toolbar"
    :aria-label="texts.toolbar"
    :aria-controls="controls"
    @keydown="onKeydown"
    @focusin="navigation.onFocusin"
    @mousedown="onMousedown"
  >
    <div class="nui-editor-toolbar__groups">
      <NuiEditorToolbarGroup
        v-for="group in groups"
        :key="group.key"
        :group="group"
        :disabled="disabled"
        @run="(command, refocus) => emit('run', command, refocus)"
        @open="emit('open', $event)"
        @link="emit('link')"
        @colour="(mark, name) => emit('colour', mark, name)"
      />
    </div>
    <NuiEditorToolbarHints :anchor="root" :hints="hints" :disabled="disabled" />
  </div>
</template>

<script setup lang="ts">
import type { Command } from '@numior/editor-core';
import { Key, useListNavigation, useMessages } from '@numior/primitives';
import { computed, onMounted, useTemplateRef } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import NuiEditorToolbarGroup from './NuiEditorToolbarGroup.vue';
import NuiEditorToolbarHints from './NuiEditorToolbarHints.vue';
import { provideToolbarHints } from './toolbar-hints';
import type { SlashItem } from '../slash/slash-items';
import { toolbarGroups } from './toolbar-items';
import { useKeyboardInset } from './use-keyboard-inset';
import type { ColourMark, NuiEditorToolbarProps } from './toolbar.types';

const {
  state,
  options,
  inserts = [],
  disabled = false,
  controls,
  docked = false,
} = defineProps<NuiEditorToolbarProps>();

const emit = defineEmits<{
  run: [command: Command, refocus: boolean];
  open: [item: SlashItem];
  link: [];
  colour: [mark: ColourMark, name: string | null];
  leave: [];
}>();

const root = useTemplateRef<HTMLElement>('root');
const hints = provideToolbarHints();
const texts = useMessages(editorMessages);
const groups = computed(() => toolbarGroups(state, texts.value, { ...options, docked }, inserts));

useKeyboardInset(root, () => docked);

const navigation = useListNavigation(root, {
  items: hints.controls.elements,
  orientation: 'horizontal',
  typeahead: false,
});

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === Key.Escape) {
    event.preventDefault();
    emit('leave');
    return;
  }
  navigation.onKeydown(event);
};

const onMousedown = (event: MouseEvent): void => {
  event.preventDefault();
};

const focus = (): void => {
  navigation.setActive(navigation.activeElement() ?? navigation.items()[0] ?? null);
};

onMounted(() => {
  navigation.reset();
});

defineExpose({ focus });
</script>
