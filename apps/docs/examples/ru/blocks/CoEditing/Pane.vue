<template>
  <section class="flex min-w-0 flex-col gap-3 rounded-lg border bg-surface p-4">
    <header class="flex min-h-8 flex-wrap items-center gap-3">
      <span class="text-sm font-medium">{{ user.name }}</span>
      <NuiBadge :tone="state.tone" variant="soft">{{ state.text }}</NuiBadge>
      <div class="ms-auto flex items-center gap-3">
        <slot />
        <NuiCollabPresence :peers="peers" />
      </div>
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
import { CollabStatusKind, type CollabStatus } from '@numior/collaboration';
import type { LoopbackLink } from '@numior/collaboration/room';
import { NuiCollabCarets, NuiCollabPresence, useCollabEditor } from '@numior/collaboration/vue';
import { contentSchema } from '@numior/content';
import { NuiEditor, type NuiEditorApi } from '@numior/editor-vue';
import { NuiBadge, NuiTone } from '@numior/vue';
import type { Employee } from '#demo/team';

const STATES: Readonly<Record<CollabStatus['kind'], { text: string; tone: NuiTone }>> = {
  [CollabStatusKind.Connecting]: { text: 'Подключение', tone: NuiTone.Neutral },
  [CollabStatusKind.Online]: { text: 'В сети', tone: NuiTone.Success },
  [CollabStatusKind.Offline]: { text: 'Нет связи', tone: NuiTone.Warning },
  [CollabStatusKind.Failed]: { text: 'Сбой', tone: NuiTone.Error },
};

const { link, user } = defineProps<{ link: LoopbackLink; user: Employee }>();

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const api = computed(() => editor.value?.editor);

const { ready, document, plugins, ids, peers, status, readOnly } = useCollabEditor({
  doc: 'oslo-chair',
  user,
  schema: contentSchema,
  transport: link,
  editor: () => api.value,
});

const state = computed(() => STATES[status.value.kind]);
</script>
