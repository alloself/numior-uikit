<template>
  <NuiMenu
    :label="insert.label"
    class="nui-editor-toolbar__menu nui-editor-insert"
    :items="entries"
  >
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        class="nui-editor-toolbar__control"
        variant="ghost"
        tone="neutral"
        size="sm"
        tabindex="-1"
        icon="plus"
        :aria-label="insert.label"
        :disabled="disabled"
      />
    </template>
  </NuiMenu>
</template>

<script setup lang="ts">
import type { Command } from '@numior/editor-core';
import { NuiButton, NuiMenu, type NuiMenuEntry } from '@numior/vue';
import { computed } from 'vue';
import type { SlashItem } from '../slash/slash-items';
import type { NuiEditorInsertMenuProps } from './toolbar.types';

const { insert, disabled = false } = defineProps<NuiEditorInsertMenuProps>();

const emit = defineEmits<{
  run: [command: Command];
  open: [item: SlashItem];
}>();

const choose = (item: SlashItem): void => {
  switch (item.kind) {
    case 'command':
      emit('run', item.command);
      break;
    case 'open':
      emit('open', item);
      break;
  }
};

const entries = computed((): NuiMenuEntry[] =>
  insert.entries.map((entry) => ({
    label: entry.item.label,
    icon: entry.item.icon,
    disabled: entry.disabled,
    onSelect: () => {
      choose(entry.item);
    },
  })),
);
</script>
