<template>
  <section class="panel" aria-labelledby="editor-title">
    <div class="section-heading">
      <h2 id="editor-title">Редактор</h2>
      <span class="tag">NuiEditor · NuiContent</span>
    </div>
    <div class="editor-demo__switches">
      <NuiSwitch v-model="readonly" label="Только чтение" data-testid="editor-readonly" />
      <NuiSwitch v-model="uploading" label="Загрузка файлов" data-testid="editor-uploads" />
      <NuiSwitch v-model="failing" label="Загрузка с ошибкой" data-testid="editor-upload-fail" />
      <NuiSwitch v-model="liveLinks" label="Метаданные из сети" data-testid="editor-live-links" />
      <NuiButton
        variant="outline"
        size="sm"
        data-testid="editor-anchor"
        @mousedown.prevent
        @click="markSelection"
      >
        Отметить выделение
      </NuiButton>
    </div>
    <div class="editor-demo">
      <NuiEditor
        ref="editorView"
        v-model="document"
        format="json"
        label="Заметка"
        description="Markdown: # заголовок, - список, **жирный**, Ctrl+Z — отмена"
        placeholder="Начните писать…"
        :readonly="readonly"
        :schema="playgroundSchema"
        :blocks="blocks"
        :upload="uploading ? upload : undefined"
        :embeds="EMBEDS"
        :link-metadata="liveLinks ? liveLinkMetadata : fakeLinkMetadata"
        :mentions="fakeMentions"
        :max-size="MAX_SIZE"
        toolbar="both"
        data-testid="editor"
        @change="changes++"
        @paste="pasted = $event.source"
      />
      <div class="editor-demo__preview">
        <h3 class="editor-demo__title">Опубликованный вид</h3>
        <NuiContent
          :document="document"
          :schema="playgroundSchema"
          :views="views"
          :embeds="EMBEDS"
          data-testid="editor-preview"
        />
      </div>
    </div>
    <pre class="output" data-testid="editor-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { NuiContent } from '@numior/content';
import { NuiContentCode } from '@numior/content/code';
import { contentMediaViews } from '@numior/content/media';
import { NuiContentTable } from '@numior/content/table';
import { setAnchor, type PasteSource } from '@numior/editor-core';
import { editorBlocks, NuiEditor, type NuiEditorApi } from '@numior/editor-vue';
import { NuiButton, NuiSwitch } from '@numior/vue';
import { computed, ref, useTemplateRef } from 'vue';
import { playgroundSchema, taskStatusBlock } from './editor-blocks';
import { fakeLinkMetadata, liveLinkMetadata } from './editor-links';
import { fakeMentions } from './editor-mentions';
import { fakeUpload } from './editor-upload';
import { blockCount, editorSample } from './editor-sample';

const blocks = [...editorBlocks, taskStatusBlock];
const MAX_SIZE = 20 * 1024 * 1024;

const EMBEDS = ['youtube', 'vimeo', 'loom', 'figma', 'maps', 'codepen'] as const;

const views = { ...contentMediaViews, table: NuiContentTable, code_block: NuiContentCode };
const document = ref(editorSample());
const readonly = ref(false);
const uploading = ref(true);
const failing = ref(false);
const liveLinks = ref(true);
const upload = fakeUpload(() => failing.value);
const changes = ref(0);
const pasted = ref<PasteSource | null>(null);
const anchors = ref(0);
const editorView = useTemplateRef<{ editor: NuiEditorApi }>('editorView');

const markSelection = (): void => {
  if (editorView.value?.editor.run(setAnchor(`c${String(anchors.value + 1)}`)) === true) {
    anchors.value += 1;
  }
};

const output = computed(() =>
  JSON.stringify({
    blocks: blockCount(document.value),
    changes: changes.value,
    paste: pasted.value,
    anchors: anchors.value,
  }),
);
</script>
