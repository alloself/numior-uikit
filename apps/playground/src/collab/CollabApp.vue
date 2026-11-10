<template>
  <main class="collab">
    <div class="collab__bar">
      <NuiCollabPresence :peers="peers" data-testid="collab-peers" />
      <div class="collab__status">
        <NuiSwitch v-model="online" label="Связь" data-testid="collab-link" />
        <NuiButton
          variant="ghost"
          tone="neutral"
          size="sm"
          data-testid="collab-garble"
          @click="garble"
          >Сбой</NuiButton
        >
        <NuiPopover placement="bottom-end" padding="sm" class="collab__discussions">
          <template #trigger="{ attrs }">
            <NuiButton v-bind="attrs" variant="outline" tone="neutral" size="sm"
              >Обсуждения</NuiButton
            >
          </template>
          <NuiEditorComments :comments="comments" />
        </NuiPopover>
        <NuiBadge v-if="copy !== undefined" data-testid="collab-copy">{{ COPY[copy] }}</NuiBadge>
        <NuiBadge data-testid="collab-status">{{ status.kind }}</NuiBadge>
      </div>
    </div>
    <NuiCollabReport v-if="report !== undefined" :report="report" />
    <NuiCollabFailure
      v-if="failure !== undefined"
      :failure="failure"
      data-testid="collab-failure"
      @rejoin="rejoin"
    />
    <div class="collab__page">
      <NuiEditor
        v-if="ready && document !== undefined"
        ref="editor"
        v-model="document"
        format="json"
        label="Документ"
        toolbar="both"
        :plugins="editorPlugins"
        :selection-actions="[comments.action.value]"
        :ids="ids"
        :readonly="readOnly"
      >
        <template #overlay>
          <NuiCollabCarets :peers="peers" :editor="editorApi" />
          <NuiEditorCommentPopover :comments="comments" :editor="editorApi" />
        </template>
      </NuiEditor>
      <NuiEditorHistory :history="history" :alternatives="alternatives" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { webSocketTransport } from '@numior/collaboration';
import {
  NuiCollabCarets,
  NuiCollabFailure,
  NuiCollabPresence,
  NuiCollabReport,
  NuiEditorCommentPopover,
  NuiEditorComments,
  NuiEditorHistory,
  useCollabEditor,
  useEditorComments,
  useEditorHistory,
} from '@numior/collaboration/vue';
import { contentSchema } from '@numior/content';
import { NuiEditor, type NuiEditorApi } from '@numior/editor-vue';
import { OfflineCopy, offlinePersistence } from '@numior/offline';
import { NuiBadge, NuiButton, NuiPopover, NuiSwitch } from '@numior/vue';
import { computed, ref, useTemplateRef } from 'vue';
import { fakeComments } from './fake-comments';
import { fakeHistory } from './fake-history';
import { collabServerOf } from './collab-server';
import { useDemoLink } from './use-demo-link';

const COPY: Readonly<Record<OfflineCopy, string>> = {
  [OfflineCopy.Kept]: 'Копия пишется',
  [OfflineCopy.Failing]: 'Копия не пишется',
  [OfflineCopy.Elsewhere]: 'Копия в другой вкладке',
  [OfflineCopy.Unavailable]: 'Копии нет',
};

const params = new URLSearchParams(location.search);
const name = params.get('user') ?? 'Гость';
const server = collabServerOf(params);

const doc = params.get('doc') ?? 'demo';
const user = { id: name, name };

const copy = ref<OfflineCopy>();

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');
const editorApi = computed(() => editor.value?.editor);

const { online, transport, garble } = useDemoLink(webSocketTransport(server));

const {
  ready,
  document,
  plugins,
  ids,
  peers,
  status,
  alternatives,
  readOnly,
  report,
  failure,
  rejoin,
} = useCollabEditor({
  doc,
  user,
  schema: contentSchema,
  transport,
  editor: () => editorApi.value,
  persistence: params.has('offline')
    ? offlinePersistence(doc, {
        schema: contentSchema,
        plugins: { demo: Number(params.get('plugin') ?? 1) },
        onState: (state) => {
          copy.value = state;
        },
      })
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

const editorPlugins = computed(() => [...plugins.value, comments.plugin]);
</script>
