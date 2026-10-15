<template>
  <div
    ref="content"
    class="nui-popover nui-editor-slash"
    role="listbox"
    :aria-label="texts.blocks"
    v-bind="contentAttrs"
    @mousedown.prevent
  >
    <div
      v-for="(item, index) in items"
      :id="`${id}-${item.key}`"
      :key="item.key"
      role="option"
      class="nui-editor-slash__option"
      :class="{ 'nui-editor-slash__option--active': index === active }"
      :aria-selected="index === active ? 'true' : 'false'"
      @click="emit('choose', item)"
      @pointermove="emit('hover', index)"
    >
      <NuiIcon :alias="item.icon" class="nui-editor-slash__icon" />
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFloating, useMessages, usePopover } from '@numior/primitives';
import { NuiIcon } from '@numior/vue';
import { ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { SlashItem } from './slash-items';
import type { NuiEditorSlashMenuProps } from './slash.types';

const { id, items, active, anchor, open } = defineProps<NuiEditorSlashMenuProps>();

const emit = defineEmits<{
  choose: [item: SlashItem];
  hover: [index: number];
}>();

const content = useTemplateRef<HTMLElement>('content');
const texts = useMessages(editorMessages);
const shown = ref(open);

const { contentAttrs } = usePopover(content, { open: shown, mode: 'manual', id: () => id });

useFloating(() => anchor, content, { placement: 'bottom-start', offset: 6, enabled: shown });

watch(
  () => open,
  (value) => {
    shown.value = value;
  },
);

watch(
  () => active,
  () => {
    content.value?.querySelector('.nui-editor-slash__option--active')?.scrollIntoView({
      block: 'nearest',
    });
  },
  { flush: 'post' },
);
</script>
