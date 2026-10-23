<template>
  <NuiTooltip
    :anchor="{ within: anchor, selector: '.nui-editor-toolbar__action' }"
    :disabled="disabled"
    placement="bottom"
  >
    <template #default="{ target }">
      <NuiEditorToolbarHint :face="hints.faceOf(target)" />
    </template>
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiTooltip } from '@numior/vue';
import NuiEditorToolbarHint from './NuiEditorToolbarHint.vue';
import type { NuiEditorToolbarHintsProps } from './toolbar.types';

const { anchor, hints, disabled = false } = defineProps<NuiEditorToolbarHintsProps>();
</script>
