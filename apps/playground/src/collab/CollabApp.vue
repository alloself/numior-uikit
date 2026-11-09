<template>
  <main class="collab">
    <div class="collab__bar">
      <NuiCollabPresence :peers="peers" data-testid="collab-peers" />
      <NuiBadge data-testid="collab-status">{{ status.kind }}</NuiBadge>
    </div>
    <NuiEditor
      v-if="ready && document !== undefined"
      ref="editor"
      v-model="document"
      format="json"
      label="Документ"
      :plugins="plugins"
      :ids="ids"
    >
      <template #overlay>
        <NuiCollabCarets :peers="peers" :editor="editorApi" />
      </template>
    </NuiEditor>
  </main>
</template>

<script setup lang="ts">
import { webSocketTransport } from '@numior/collaboration';
import { NuiCollabCarets, NuiCollabPresence, useCollabEditor } from '@numior/collaboration/vue';
import { contentSchema } from '@numior/content';
import { NuiEditor, type NuiEditorApi } from '@numior/editor-vue';
import { NuiBadge } from '@numior/vue';
import { computed, useTemplateRef } from 'vue';

const params = new URLSearchParams(location.search);
const name = params.get('user') ?? 'Гость';
const server = params.get('server') ?? `ws://${location.hostname}:4175`;

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');
const editorApi = computed(() => editor.value?.editor);

const { ready, document, plugins, ids, peers, status } = useCollabEditor({
  doc: params.get('doc') ?? 'demo',
  user: { id: name, name },
  schema: contentSchema,
  transport: webSocketTransport(server),
  editor: () => editorApi.value,
});
</script>
