<template>
  <NuiEditor
    ref="editor"
    v-model="value"
    format="json"
    :label="LABEL"
    :schema="fixtureSchema"
    :plugins="[comments.plugin]"
    :selection-actions="[comments.action.value]"
  >
    <template #overlay>
      <NuiEditorCommentPopover :comments="comments" :editor="editorApi" :labels="labels" />
    </template>
  </NuiEditor>
  <NuiEditorComments :comments="comments" :labels="labels" />
</template>

<script setup lang="ts">
import type { DocJSON } from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { NuiEditor, type NuiEditorApi } from '@numior/editor-vue';
import { computed, ref, useTemplateRef } from 'vue';
import type { CommentsAdapter, PresenceUser } from '../../src';
import {
  NuiEditorCommentPopover,
  NuiEditorComments,
  useEditorComments,
  type NuiEditorCommentsProps,
} from '../../src/vue';

const LABEL = 'Document';

const { initial, adapter, user, labels } = defineProps<{
  initial: DocJSON;
  adapter: CommentsAdapter;
  user: PresenceUser;
  labels?: NuiEditorCommentsProps['labels'];
}>();

const value = ref(initial);

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const editorApi = computed(() => editor.value?.editor);

const comments = useEditorComments({
  doc: 'doc',
  user,
  adapter,
  editor: () => editorApi.value,
});
</script>
