<template>
  <NuiMenu :label="texts.blockType" class="nui-editor-toolbar__menu nui-editor-blocks">
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        class="nui-editor-toolbar__control nui-editor-toolbar__blocks"
        variant="ghost"
        tone="neutral"
        size="sm"
        tabindex="-1"
        :icon="blocks.icon"
        icon-end="chevron-down"
        :aria-label="texts.currentBlock({ type: blocks.label })"
        :disabled="disabled"
      />
    </template>
    <NuiMenuRadioGroup :model-value="current" @update:model-value="choose">
      <NuiMenuRadioItem
        v-for="option in blocks.options"
        :key="option.key"
        :value="option.key"
        :icon="option.icon"
        :aria-label="option.label"
        :title="option.label"
      />
    </NuiMenuRadioGroup>
  </NuiMenu>
</template>

<script setup lang="ts">
import type { Command } from '@numior/editor-core';
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiMenu, NuiMenuRadioGroup, NuiMenuRadioItem } from '@numior/vue';
import { computed } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { NuiEditorBlockMenuProps } from './toolbar.types';

const { blocks, disabled = false } = defineProps<NuiEditorBlockMenuProps>();

const emit = defineEmits<{
  run: [command: Command];
}>();

const texts = useMessages(editorMessages);

const current = computed(() => blocks.options.find((option) => option.active)?.key ?? '');

const choose = (key: string | undefined): void => {
  const option = blocks.options.find((candidate) => candidate.key === key);

  if (option !== undefined) {
    emit('run', option.command);
  }
};
</script>
