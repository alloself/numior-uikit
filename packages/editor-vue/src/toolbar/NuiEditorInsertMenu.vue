<template>
  <NuiPopover
    ref="popover"
    v-model:open="open"
    placement="bottom-start"
    padding="none"
    @toggle="onToggle"
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
    <div class="nui-editor-insert">
      <NuiCommand
        ref="finder"
        v-model:query="search"
        :items="items"
        :filter="matchesSlash"
        :label="insert.label"
        :placeholder="texts.insertSearch"
        :empty-label="texts.insertEmpty"
        embedded
        @select="choose"
      />
    </div>
  </NuiPopover>
</template>

<script setup lang="ts">
import type { Command } from '@numior/editor-core';
import { PopoverState, useMessages } from '@numior/primitives';
import { NuiButton, NuiCommand, NuiPopover, type NuiCommandItem } from '@numior/vue';
import { computed, ref, useTemplateRef } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import { matchesSlash, type SlashItem } from '../slash/slash-items';
import { SlashItemKind } from '../suggest/suggest.types';
import { useToolbarControl } from './toolbar-hints';
import type { NuiEditorInsertMenuProps } from './toolbar.types';

const { insert, disabled = false } = defineProps<NuiEditorInsertMenuProps>();

const emit = defineEmits<{
  run: [command: Command];
  open: [item: SlashItem];
}>();

const texts = useMessages(editorMessages);
const open = ref(false);
const search = ref('');
const popover = useTemplateRef<InstanceType<typeof NuiPopover>>('popover');
const finder = useTemplateRef<{ focus(): void }>('finder');

const items = computed((): NuiCommandItem[] =>
  insert.items.map((item) => ({
    value: item.key,
    label: item.label,
    icon: item.icon,
    keywords: item.keywords,
    disabled: open.value && item.kind === SlashItemKind.Command && !item.command(insert.state),
  })),
);

const onToggle = (event: Event): void => {
  if (!('newState' in event)) {
    return;
  }
  if (event.newState === PopoverState.Open) {
    finder.value?.focus();
  } else {
    search.value = '';
  }
};

const choose = (chosen: NuiCommandItem): void => {
  const item = insert.items.find((candidate) => candidate.key === chosen.value);

  open.value = false;

  switch (item?.kind) {
    case SlashItemKind.Command:
      emit('run', item.command);
      break;
    case SlashItemKind.Open:
      emit('open', item);
      break;
    case undefined:
      break;
  }
};

useToolbarControl(() => popover.value?.trigger);
</script>
