<template>
  <div
    ref="root"
    class="nui-editor-toolbar"
    :class="{ 'nui-editor-toolbar--disabled': disabled }"
    role="toolbar"
    :aria-label="texts.toolbar"
    :aria-controls="controls"
    @keydown="onKeydown"
    @focusin="navigation.onFocusin"
    @mousedown="onMousedown"
  >
    <div class="nui-editor-toolbar__groups">
      <div v-for="group in groups" :key="group.key" class="nui-editor-toolbar__group">
        <template v-for="item in group.items" :key="item.key">
          <NuiEditorBlockMenu
            v-if="item.kind === 'blocks'"
            :blocks="item"
            :disabled="disabled"
            @run="emit('run', $event, true)"
          />
          <NuiEditorToolbarButton
            v-else
            :action="item"
            :disabled="disabled"
            @run="emit('run', $event, false)"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Command } from '@numior/editor-core';
import { useListNavigation, useMessages } from '@numior/primitives';
import { computed, onMounted, useTemplateRef } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import NuiEditorBlockMenu from './NuiEditorBlockMenu.vue';
import NuiEditorToolbarButton from './NuiEditorToolbarButton.vue';
import { toolbarGroups } from './toolbar-items';
import type { NuiEditorToolbarProps } from './toolbar.types';

const { state, disabled = false, controls } = defineProps<NuiEditorToolbarProps>();

const emit = defineEmits<{
  run: [command: Command, refocus: boolean];
  leave: [];
}>();

const root = useTemplateRef<HTMLElement>('root');
const texts = useMessages(editorMessages);
const groups = computed(() => toolbarGroups(state, texts.value));

const navigation = useListNavigation(root, {
  selector: '.nui-editor-toolbar__control',
  orientation: 'horizontal',
  typeahead: false,
});

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
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
