<template>
  <div class="grid w-full items-start gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
    <NuiEditor
      ref="editor"
      v-model="document"
      format="json"
      toolbar="bubble"
      aria-label="Product description"
    />
    <aside class="rounded-lg border bg-surface p-4">
      <NuiEditorHistory :history="history" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue';
import { NuiEditorHistory, useEditorHistory } from '@numior/kit/collaboration/vue';
import { contentSchema } from '@numior/kit/content';
import { fromHTML, toJSON, type DocJSON } from '@numior/kit/editor-core';
import { NuiEditor, type NuiEditorApi } from '@numior/kit/editor';
import { brief } from '#demo/description';
import { team } from '#demo/team';
import { memoryHistory } from './adapter';
import { versions } from './versions';

const [anna] = team;

const document = shallowRef<DocJSON>(toJSON(fromHTML(contentSchema, brief)));

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const api = computed(() => editor.value?.editor);

const history = useEditorHistory({
  doc: 'oslo-chair',
  user: anna,
  adapter: memoryHistory(versions),
  editor: () => api.value,
});
</script>
