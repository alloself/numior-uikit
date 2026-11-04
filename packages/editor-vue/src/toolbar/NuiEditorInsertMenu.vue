<template>
  <NuiMenu
    ref="menu"
    lazy
    v-model:open="open"
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
import { useTemplateRef } from 'vue';
import { useToolbarControl } from './toolbar-hints';
import type { Command } from '@numior/editor-core';
import { NuiButton, NuiMenu, type NuiMenuEntry } from '@numior/vue';
import { computed, ref } from 'vue';
import type { SlashItem } from '../slash/slash-items';
import type { NuiEditorInsertMenuProps } from './toolbar.types';

const { insert, disabled = false } = defineProps<NuiEditorInsertMenuProps>();

const emit = defineEmits<{
  run: [command: Command];
  open: [item: SlashItem];
}>();

const open = ref(false);

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
  insert.items.map((item) => ({
    label: item.label,
    icon: item.icon,
    disabled: open.value && item.kind === 'command' && !item.command(insert.state),
    onSelect: () => {
      choose(item);
    },
  })),
);

const menu = useTemplateRef<InstanceType<typeof NuiMenu>>('menu');

useToolbarControl(() => menu.value?.trigger);
</script>
