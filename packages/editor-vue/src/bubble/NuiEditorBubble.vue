<template>
  <div
    ref="content"
    class="nui-popover nui-editor-bubble"
    role="toolbar"
    :aria-label="texts.formatting"
    v-bind="contentAttrs"
    @mousedown.prevent
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
</template>

<script setup lang="ts">
import type { Command } from '@numior/editor-core';
import { useFloating, useListNavigation, useMessages, usePopover } from '@numior/primitives';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import NuiEditorToolbarGroup from '../toolbar/NuiEditorToolbarGroup.vue';
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

const content = useTemplateRef<HTMLElement>('content');
const shown = ref(open);
const texts = useMessages(editorMessages);

const group = computed(() =>
  toolbarGroups(state, texts.value, options).find((candidate) => candidate.key === 'marks'),
);

const { contentAttrs } = usePopover(content, { open: shown, mode: 'manual' });

useFloating(() => anchor, content, { placement: 'top', offset: 8, enabled: shown });

const navigation = useListNavigation(content, {
  selector: '.nui-editor-toolbar__control',
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
