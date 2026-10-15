<template>
  <NuiTooltip :disabled="disabled" placement="bottom">
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        class="nui-editor-toolbar__control"
        :class="{ 'nui-editor-toolbar__control--pressed': action.pressed }"
        variant="ghost"
        tone="neutral"
        size="sm"
        tabindex="-1"
        :icon="action.icon"
        :aria-label="action.label"
        :aria-pressed="action.pressed === undefined ? undefined : String(action.pressed)"
        :disabled="disabled || action.disabled"
        @click="emit('run', action.command)"
      />
    </template>
    <span class="nui-editor-toolbar__hint">
      {{ action.label }}
      <NuiKbd v-if="action.shortcut" :keys="action.shortcut" size="sm" variant="plain" />
    </span>
  </NuiTooltip>
</template>

<script setup lang="ts">
import type { Command } from '@numior/editor-core';
import { NuiButton, NuiKbd, NuiTooltip } from '@numior/vue';
import type { NuiEditorToolbarButtonProps } from './toolbar.types';

const { action, disabled = false } = defineProps<NuiEditorToolbarButtonProps>();

const emit = defineEmits<{
  run: [command: Command];
}>();
</script>
