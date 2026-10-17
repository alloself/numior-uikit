<template>
  <NuiPopover
    class="nui-editor-link-bar"
    :open="open"
    :anchor="anchor"
    mode="manual"
    placement="top-end"
    :offset="8"
    padding="sm"
    size="auto"
  >
    <div class="nui-editor-link-bar__actions" role="toolbar" :aria-label="label">
      <NuiTooltip v-for="action in actions" :key="action.key" placement="bottom">
        <template #trigger="{ attrs }">
          <NuiButton
            v-bind="attrs"
            variant="ghost"
            tone="neutral"
            size="sm"
            :icon="action.icon"
            :aria-label="action.label"
            :href="action.href"
            :target="action.href === undefined ? undefined : '_blank'"
            :rel="action.href === undefined ? undefined : 'noopener'"
            @click="action.run?.()"
          />
        </template>
        {{ action.label }}
      </NuiTooltip>
    </div>
  </NuiPopover>
</template>

<script setup lang="ts">
import { NuiButton, NuiPopover, NuiTooltip } from '@numior/vue';
import type { LinkBarAction } from './links.types';

const { open, anchor, label, actions } = defineProps<{
  open: boolean;
  anchor: HTMLElement | null;
  label: string;
  actions: readonly LinkBarAction[];
}>();
</script>
