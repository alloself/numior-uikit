<template>
  <NuiTooltip
    :anchor="{ within: anchor, selector: '.nui-editor-toolbar__action' }"
    :disabled="disabled"
    :shortcut="shortcutOf"
    placement="bottom"
  >
    <template #default="{ target }">{{ hints.faceOf(target)?.label }}</template>
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiTooltip } from '@numior/vue';
import type { NuiEditorToolbarHintsProps } from './toolbar.types';

const { anchor, hints, disabled = false } = defineProps<NuiEditorToolbarHintsProps>();

const shortcutOf = (target: HTMLElement | null): string | undefined =>
  hints.faceOf(target)?.shortcut;
</script>
