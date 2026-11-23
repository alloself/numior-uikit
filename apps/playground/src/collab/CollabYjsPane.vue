<template>
  <NuiEditor
    v-if="document !== undefined"
    ref="editor"
    v-model="document"
    format="json"
    :label="label"
    :plugins="plugins"
    :ids="binding.ids"
  />
</template>

<script setup lang="ts">
import { yjsBinding } from '@numior/collaboration/yjs';
import { contentSchema } from '@numior/content';
import { toJSON, type DocJSON } from '@numior/editor-core';
import { NuiEditor, type NuiEditorApi } from '@numior/editor-vue';
import { computed, onScopeDispose, ref, useTemplateRef } from 'vue';
import type { Doc as YDoc } from 'yjs';

const { ydoc, label } = defineProps<{
  ydoc: YDoc;
  label: string;
}>();

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const api = computed(() => editor.value?.editor);

const binding = yjsBinding(ydoc, 'document', {
  schema: contentSchema,
  getState: () => api.value?.state(),
  dispatch: (tr) => {
    api.value?.run((_state, apply) => {
      apply?.(tr);
      return true;
    });
  },
});

const plugins = [binding.plugin];

const opened = binding.read();

const document = ref<DocJSON | undefined>(opened === undefined ? undefined : toJSON(opened));

onScopeDispose(() => {
  binding.destroy();
});
</script>
