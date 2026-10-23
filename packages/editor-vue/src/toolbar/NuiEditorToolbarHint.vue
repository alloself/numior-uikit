<template>
  <span v-if="face" class="nui-editor-toolbar__hint">
    {{ face.label }}
    <NuiKbd v-if="face.shortcut" :keys="face.shortcut" size="sm" variant="plain" />
  </span>
</template>

<script setup lang="ts">
import { NuiKbd } from '@numior/vue';
import type { NuiEditorToolbarHintProps } from './toolbar.types';

const { face } = defineProps<NuiEditorToolbarHintProps>();
</script>
