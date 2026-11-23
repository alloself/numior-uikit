<template>
  <NuiEditor
    v-if="document !== undefined"
    ref="editor"
    v-model="document"
    format="json"
    :label="LABEL"
    :schema="fixtureSchema"
    :plugins="plugins"
    :ids="binding.ids"
  />
</template>

<script setup lang="ts">
import { toJSON, type DocJSON } from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { NuiEditor, type NuiEditorApi } from '@numior/editor-vue';
import { computed, onScopeDispose, ref, useTemplateRef } from 'vue';
import type { Doc as YDoc } from 'yjs';
import { yjsBinding } from '../../src/yjs';

const LABEL = 'Document';

const { ydoc } = defineProps<{
  ydoc: YDoc;
}>();

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const api = computed(() => editor.value?.editor);

const binding = yjsBinding(ydoc, 'document', {
  schema: fixtureSchema,
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
