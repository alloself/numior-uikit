<template>
  <section class="flex min-w-0 flex-col gap-3 rounded-lg border bg-surface p-4">
    <header class="flex min-h-8 items-center justify-between gap-3">
      <span class="text-sm font-medium">{{ user.name }}</span>
      <NuiCollabPresence :peers="peers" />
    </header>
    <NuiEditor
      v-if="ready"
      ref="editor"
      v-model="document"
      format="json"
      toolbar="bubble"
      :aria-label="`Описание товара, правит ${user.name}`"
      :plugins="plugins"
      :ids="ids"
      :readonly="readOnly"
    >
      <template #overlay>
        <NuiCollabCarets :peers="peers" :editor="api" />
      </template>
    </NuiEditor>
  </section>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { contentSchema } from '@numior/kit/content';
import type { LoopbackLink } from '@numior/kit/collaboration/room';
import { NuiCollabCarets, NuiCollabPresence, useCollabEditor } from '@numior/kit/collaboration/vue';
import { NuiEditor, type NuiEditorApi } from '@numior/kit/editor';
import type { Employee } from '#demo/team';

const { link, user } = defineProps<{ link: LoopbackLink; user: Employee }>();

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const api = computed(() => editor.value?.editor);

const { ready, document, plugins, ids, peers, readOnly } = useCollabEditor({
  doc: 'oslo-chair',
  user,
  schema: contentSchema,
  transport: link,
  editor: () => api.value,
});
</script>
