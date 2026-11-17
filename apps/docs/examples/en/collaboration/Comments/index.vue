<template>
  <div class="flex w-full flex-col gap-3">
    <div class="flex justify-end">
      <NuiPopover placement="bottom-end" padding="sm">
        <template #trigger="{ attrs }">
          <NuiButton v-bind="attrs" variant="outline" tone="neutral" size="sm" icon="comment">
            Discussions
          </NuiButton>
        </template>
        <NuiEditorComments :comments="comments" />
      </NuiPopover>
    </div>
    <NuiEditor
      ref="editor"
      v-model="document"
      format="json"
      toolbar="bubble"
      aria-label="Product description"
      :plugins="plugins"
      :selection-actions="[comments.action.value]"
    >
      <template #overlay>
        <NuiEditorCommentPopover :comments="comments" :editor="api" />
      </template>
    </NuiEditor>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue';
import {
  NuiEditorCommentPopover,
  NuiEditorComments,
  useEditorComments,
} from '@numior/kit/collaboration/vue';
import { contentSchema } from '@numior/kit/content';
import { fromHTML, toJSON, type DocJSON } from '@numior/kit/editor-core';
import { NuiEditor, type NuiEditorApi } from '@numior/kit/editor';
import { NuiButton, NuiPopover } from '@numior/kit';
import { brief } from '#demo/description';
import { team } from '#demo/team';
import { memoryComments } from './adapter';
import { threadsOf } from './threads';

const [anna] = team;

const source = fromHTML(contentSchema, brief);

const document = shallowRef<DocJSON>(toJSON(source));

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const api = computed(() => editor.value?.editor);

const comments = useEditorComments({
  doc: 'oslo-chair',
  user: anna,
  adapter: memoryComments(threadsOf(source)),
  editor: () => api.value,
});

const plugins = [comments.plugin];
</script>
