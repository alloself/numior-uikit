<template>
  <NuiEditor v-bind="editor" :model-value="html" @update:model-value="keepHtml" />
</template>

<script setup lang="ts">
import { provideDraftCommits } from '@numior/primitives';
import { ref } from 'vue';
import { NuiEditor, type NuiEditorProps, type NuiEditorValue } from '../../src';

const { editor, initial = '' } = defineProps<{
  editor: NuiEditorProps;
  initial?: string | undefined;
}>();

const html = ref(initial);
const drafts = provideDraftCommits();

const keepHtml = (value: NuiEditorValue | undefined): void => {
  if (typeof value !== 'string') {
    return;
  }

  html.value = value;
};

defineExpose({ drafts });
</script>
