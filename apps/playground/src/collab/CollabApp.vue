<template>
  <main class="collab">
    <div class="collab__bar">
      <NuiCollabPresence :peers="peers" data-testid="collab-peers" />
      <NuiBadge data-testid="collab-status">{{ status.kind }}</NuiBadge>
    </div>
    <div class="collab__page">
      <NuiEditor
        v-if="ready && document !== undefined"
        ref="editor"
        v-model="document"
        format="json"
        label="Документ"
        :plugins="editorPlugins"
        :ids="ids"
      >
        <template #overlay>
          <NuiCollabCarets :peers="peers" :editor="editorApi" />
        </template>
      </NuiEditor>
      <NuiTabs v-model="side">
        <NuiTabList label="Панели документа">
          <NuiTab value="comments">Комментарии</NuiTab>
          <NuiTab value="history">История</NuiTab>
        </NuiTabList>
        <NuiTabPanel value="comments"><NuiEditorComments :comments="comments" /></NuiTabPanel>
        <NuiTabPanel value="history"
          ><NuiEditorHistory :history="history" :alternatives="alternatives"
        /></NuiTabPanel>
      </NuiTabs>
    </div>
  </main>
</template>

<script setup lang="ts">
import { webSocketTransport } from '@numior/collaboration';
import {
  NuiCollabCarets,
  NuiCollabPresence,
  NuiEditorComments,
  NuiEditorHistory,
  useCollabEditor,
  useEditorComments,
  useEditorHistory,
} from '@numior/collaboration/vue';
import { contentSchema } from '@numior/content';
import { NuiEditor, type NuiEditorApi } from '@numior/editor-vue';
import { offlinePersistence } from '@numior/offline';
import { NuiBadge, NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';
import { computed, ref, useTemplateRef } from 'vue';
import { fakeComments } from './fake-comments';
import { fakeHistory } from './fake-history';

const params = new URLSearchParams(location.search);
const name = params.get('user') ?? 'Гость';
const server = params.get('server') ?? `ws://${location.hostname}:4175`;

const doc = params.get('doc') ?? 'demo';
const user = { id: name, name };

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');
const editorApi = computed(() => editor.value?.editor);

const { ready, document, plugins, ids, peers, status, alternatives } = useCollabEditor({
  doc,
  user,
  schema: contentSchema,
  transport: webSocketTransport(server),
  editor: () => editorApi.value,
  persistence: params.has('offline')
    ? offlinePersistence(doc, { schema: contentSchema })
    : undefined,
});

const comments = useEditorComments({
  doc,
  user,
  adapter: fakeComments(),
  editor: () => editorApi.value,
});

const history = useEditorHistory({
  doc,
  user,
  adapter: fakeHistory(),
  editor: () => editorApi.value,
});

const side = ref('comments');

const editorPlugins = computed(() => [...plugins.value, comments.plugin]);
</script>
