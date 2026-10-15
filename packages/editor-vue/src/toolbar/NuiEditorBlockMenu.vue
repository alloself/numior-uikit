<template>
  <NuiMenu :items="entries" :label="texts.blockType" class="nui-editor-toolbar__menu">
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        class="nui-editor-toolbar__control nui-editor-toolbar__blocks"
        variant="ghost"
        tone="neutral"
        size="sm"
        tabindex="-1"
        :aria-label="texts.currentBlock({ type: blocks.label })"
        :disabled="disabled"
      >
        <span class="nui-editor-toolbar__current">{{ blocks.label }}</span>
        <NuiIcon alias="chevron-down" class="nui-editor-toolbar__chevron" />
      </NuiButton>
    </template>
  </NuiMenu>
</template>

<script setup lang="ts">
import type { Command } from '@numior/editor-core';
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiIcon, NuiMenu, type NuiMenuEntry } from '@numior/vue';
import { computed } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { NuiEditorBlockMenuProps } from './toolbar.types';

const { blocks, disabled = false } = defineProps<NuiEditorBlockMenuProps>();

const emit = defineEmits<{
  run: [command: Command];
}>();

const texts = useMessages(editorMessages);

const entries = computed((): NuiMenuEntry[] => [
  {
    type: 'radio-group',
    value: blocks.options.find((option) => option.active)?.key ?? '',
    items: blocks.options.map((option) => ({ value: option.key, label: option.label })),
    onChange: (key) => {
      const option = blocks.options.find((candidate) => candidate.key === key);

      if (option !== undefined) {
        emit('run', option.command);
      }
    },
  },
]);
</script>
