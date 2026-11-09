<template>
  <div />
</template>

<script setup lang="ts">
import { useCollabEditor } from '../../src/vue';
import type { CollabEditor, UseCollabEditorOptions } from '../../src/vue/collab.types';

const { options, capture } = defineProps<{
  options: UseCollabEditorOptions;
  capture: (editor: CollabEditor) => void;
}>();

capture(useCollabEditor(options));
</script>
