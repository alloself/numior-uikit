<template>
  <section class="nui-collab-comments" :aria-label="text.comments">
    <header class="nui-collab-comments__header">
      <h2 class="nui-collab-comments__title">{{ text.comments }}</h2>
      <NuiButton
        size="sm"
        variant="soft"
        :disabled="!comments.canAdd.value || comments.drafting.value"
        @click="comments.start"
      >
        {{ text.add }}
      </NuiButton>
    </header>

    <NuiAlert v-if="comments.failed.value" tone="error" :title="text.failed" />

    <NuiEditorCommentForm
      v-if="comments.drafting.value"
      :placeholder="text.placeholder"
      :text="text"
      :submit="comments.submit"
      @cancel="comments.cancel"
    />

    <NuiEmpty
      v-if="comments.threads.value.length === 0 && !comments.drafting.value"
      size="sm"
      hide-icon
      :title="text.empty"
    />

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
import { NuiAlert, NuiButton, NuiEmpty } from '@numior/vue';
import { computed } from 'vue';
import { collabMessages } from './collab.messages';
import type { NuiEditorCommentsProps } from './collab.types';
import NuiEditorCommentForm from './NuiEditorCommentForm.vue';
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
