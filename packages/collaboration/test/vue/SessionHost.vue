<template>
  <NuiCollabFailure v-if="failure !== undefined" :failure="failure" @rejoin="rejoin" />
  <NuiEditor
    v-if="ready && document !== undefined"
    ref="editor"
    v-model="document"
    format="json"
    :label="LABEL"
    :schema="fixtureSchema"
    :plugins="plugins"
    :ids="ids"
    :readonly="readOnly"
  />
</template>

<script setup lang="ts">
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { NuiEditor, type NuiEditorApi } from '@numior/editor-vue';
import { computed, useTemplateRef } from 'vue';
import type { CollabTransport, PresenceUser } from '../../src';
import { NuiCollabFailure, useCollabEditor } from '../../src/vue';

const LABEL = 'Document';

const { transport, user } = defineProps<{
  transport: CollabTransport;
  user: PresenceUser;
}>();

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const editorApi = computed(() => editor.value?.editor);

const { ready, document, plugins, ids, readOnly, failure, rejoin } = useCollabEditor({
  doc: 'doc',
  user,
  schema: fixtureSchema,
  transport,
  editor: () => editorApi.value,
});
</script>
