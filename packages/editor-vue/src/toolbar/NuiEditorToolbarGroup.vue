<template>
  <div class="nui-editor-toolbar__group">
    <template v-for="item in group.items" :key="item.key">
      <NuiEditorBlockMenu
        v-if="item.kind === ToolbarItemKind.Blocks"
        :blocks="item"
        :disabled="disabled"
        @run="emit('run', $event, true)"
      />
      <NuiEditorInsertMenu
        v-else-if="item.kind === ToolbarItemKind.Insert"
        :insert="item"
        :disabled="disabled"
        @run="emit('run', $event, true)"
        @open="emit('open', $event)"
      />
      <NuiEditorColourMenu
        v-else-if="item.kind === ToolbarItemKind.Colours"
        :colours="item"
        :disabled="disabled"
        @select="(mark, name) => emit('colour', mark, name)"
      />
      <NuiEditorToolbarButton
        v-else-if="item.kind === ToolbarItemKind.Link"
        :action="item"
        :disabled="disabled"
        @press="emit('link')"
      />
      <NuiEditorToolbarButton
        v-else
        :action="item"
        :disabled="disabled"
        @press="emit('run', item.command, false)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Command } from '@numior/editor-core';
import NuiEditorBlockMenu from './NuiEditorBlockMenu.vue';
import type { SlashItem } from '../slash/slash-items';
import NuiEditorColourMenu from './NuiEditorColourMenu.vue';
import NuiEditorInsertMenu from './NuiEditorInsertMenu.vue';
import NuiEditorToolbarButton from './NuiEditorToolbarButton.vue';
import { ToolbarItemKind, type ColourMark, type NuiEditorToolbarGroupProps } from './toolbar.types';

const { group, disabled = false } = defineProps<NuiEditorToolbarGroupProps>();

const emit = defineEmits<{
  run: [command: Command, refocus: boolean];
  open: [item: SlashItem];
  link: [];
  colour: [mark: ColourMark, name: string | null];
}>();
</script>
