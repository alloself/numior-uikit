<template>
  <div class="nui-editor-toolbar__group">
    <template v-for="item in group.items" :key="item.key">
      <NuiEditorBlockMenu
        v-if="item.kind === 'blocks'"
        :blocks="item"
        :disabled="disabled"
        @run="emit('run', $event, true)"
      />
      <NuiEditorColourMenu
        v-else-if="item.kind === 'colours'"
        :colours="item"
        :disabled="disabled"
        @choose="(mark, name) => emit('colour', mark, name)"
      />
      <NuiEditorToolbarButton
        v-else-if="item.kind === 'link'"
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
import NuiEditorColourMenu from './NuiEditorColourMenu.vue';
import NuiEditorToolbarButton from './NuiEditorToolbarButton.vue';
import type { ColourMark, NuiEditorToolbarGroupProps } from './toolbar.types';

const { group, disabled = false } = defineProps<NuiEditorToolbarGroupProps>();

const emit = defineEmits<{
  run: [command: Command, refocus: boolean];
  link: [];
  colour: [mark: ColourMark, name: string | null];
}>();
</script>
