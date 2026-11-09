<template>
  <NuiEditor ref="editor" v-model="value" format="json" :label="LABEL" :schema="fixtureSchema" />
  <NuiEditorHistory :history="history" :alternatives="alternatives" :labels="labels" />
</template>

<script setup lang="ts">
import type { DocJSON } from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { NuiEditor, type NuiEditorApi } from '@numior/editor-vue';
import { computed, ref, useTemplateRef } from 'vue';
import type { HistoryAdapter, PresenceUser } from '../../src';
import {
  NuiEditorHistory,
  useEditorHistory,
  type CollabAlternatives,
  type NuiEditorHistoryProps,
} from '../../src/vue';

const LABEL = 'Document';

const { initial, adapter, user, alternatives, labels } = defineProps<{
  initial: DocJSON;
  adapter: HistoryAdapter;
  user: PresenceUser;
  alternatives?: CollabAlternatives | undefined;
  labels?: NuiEditorHistoryProps['labels'];
}>();

const value = ref(initial);

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const editorApi = computed(() => editor.value?.editor);

const history = useEditorHistory({
  doc: 'doc',
  user,
  adapter,
  editor: () => editorApi.value,
});
</script>
