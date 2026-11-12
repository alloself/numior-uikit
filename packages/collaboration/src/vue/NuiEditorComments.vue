<template>
  <section class="nui-collab-comments" :aria-label="text.comments">
    <h2 class="nui-collab-comments__title">{{ text.comments }}</h2>

    <NuiAlert v-if="comments.failed.value" tone="error" :title="text.failed" />

    <NuiEmpty v-if="comments.threads.value.length === 0" size="sm" hide-icon :title="text.empty" />

    <ol v-else class="nui-collab-comments__list">
      <li v-for="thread in comments.threads.value" :key="thread.id">
        <NuiEditorCommentThread
          :comments="comments"
          :thread="thread"
          :text="text"
          :time-of="timeOf"
        />
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { useLocale, useMessages } from '@numior/primitives';
import { NuiAlert, NuiEmpty } from '@numior/vue';
import { computed } from 'vue';
import { collabMessages } from './collab.messages';
import type { NuiEditorCommentsProps } from './collab.types';
import NuiEditorCommentThread from './NuiEditorCommentThread.vue';

const { comments, labels } = defineProps<NuiEditorCommentsProps>();

const messages = useMessages(collabMessages);
const locale = useLocale();

const text = computed(() => ({ ...messages.value, ...labels }));

const formatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'short' }),
);

const timeOf = (value: string): string => formatter.value.format(new Date(value));
</script>
