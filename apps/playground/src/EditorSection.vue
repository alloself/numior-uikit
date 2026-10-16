<template>
  <section class="panel" aria-labelledby="editor-title">
    <div class="section-heading">
      <h2 id="editor-title">Редактор</h2>
      <span class="tag">NuiEditor · NuiContent</span>
    </div>
    <NuiSwitch v-model="readonly" label="Только чтение" data-testid="editor-readonly" />
    <div class="editor-demo">
      <NuiEditor
        v-model:document="document"
        label="Заметка"
        description="Markdown: # заголовок, - список, **жирный**, Ctrl+Z — отмена"
        placeholder="Начните писать…"
        :readonly="readonly"
        :schema="playgroundSchema"
        :blocks="blocks"
        toolbar="both"
        data-testid="editor"
        @change="changes++"
        @paste="pasted = $event.source"
      />
      <div class="editor-demo__preview">
        <h3 class="editor-demo__title">Опубликованный вид</h3>
        <NuiContent :document="document" :schema="playgroundSchema" data-testid="editor-preview" />
      </div>
    </div>
    <pre class="output" data-testid="editor-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { NuiContent } from '@numior/content';
import type { PasteSource } from '@numior/editor-core';
import { editorBlocks, NuiEditor } from '@numior/editor-vue';
import { NuiSwitch } from '@numior/vue';
import { computed, ref } from 'vue';
import { playgroundSchema, taskStatusBlock } from './editor-blocks';
import { blockCount, editorSample } from './editor-sample';

const blocks = [...editorBlocks, taskStatusBlock];
const document = ref(editorSample());
const readonly = ref(false);
const changes = ref(0);
const pasted = ref<PasteSource | null>(null);

const output = computed(() =>
  JSON.stringify({
    blocks: blockCount(document.value),
    changes: changes.value,
    paste: pasted.value,
  }),
);
</script>
