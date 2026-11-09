<template>
  <article
    class="nui-collab-comments__thread"
    :class="{
      'nui-collab-comments__thread--active': comments.active.value === thread.id,
      'nui-collab-comments__thread--inline': inline,
      'nui-collab-comments__thread--resolved': thread.resolved,
    }"
    @click="onClick"
  >
    <NuiEditorCommentEntry :entry="thread" :time-of="timeOf" />
    <p class="nui-collab-comments__body">{{ thread.body }}</p>
    <NuiBadge v-if="thread.lost" size="sm" tone="warning">{{ text.lost }}</NuiBadge>
    <NuiBadge v-if="thread.resolved" size="sm" tone="success">{{ text.resolved }}</NuiBadge>

    <ul v-if="thread.replies.length > 0" class="nui-collab-comments__replies">
      <li v-for="item in thread.replies" :key="item.id">
        <NuiEditorCommentEntry :entry="item" :time-of="timeOf" />
        <p class="nui-collab-comments__body">{{ item.body }}</p>
      </li>
    </ul>

    <NuiEditorCommentForm
      v-if="replying"
      :placeholder="text.replyPlaceholder"
      :text="text"
      :submit="sendReply"
      @cancel="replying = false"
    />

    <div v-else class="nui-collab-comments__actions">
      <NuiButton size="sm" variant="ghost" tone="neutral" @click="replying = true">{{
        text.reply
      }}</NuiButton>
      <div class="nui-collab-comments__tools">
        <NuiTooltip v-for="tool in tools" :key="tool.key" placement="bottom">
          <template #trigger="{ attrs }">
            <NuiButton
              v-bind="attrs"
              size="sm"
              variant="ghost"
              :tone="tool.tone"
              :icon="tool.icon"
              :aria-label="tool.label"
              @click="tool.run"
            />
          </template>
          {{ tool.label }}
        </NuiTooltip>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { IconAlias } from '@numior/primitives';
import { NuiBadge, NuiButton, NuiTooltip } from '@numior/vue';
import { computed, ref } from 'vue';
import type { NuiEditorCommentThreadProps } from './collab.types';
import NuiEditorCommentEntry from './NuiEditorCommentEntry.vue';
import NuiEditorCommentForm from './NuiEditorCommentForm.vue';

interface ThreadTool {
  readonly key: string;
  readonly label: string;
  readonly icon: IconAlias;
  readonly tone: 'neutral' | 'error';
  readonly run: () => void;
}

const {
  comments,
  thread,
  text,
  timeOf,
  inline = false,
} = defineProps<NuiEditorCommentThreadProps>();

const replying = ref(false);

const tools = computed<readonly ThreadTool[]>(() => {
  const show: ThreadTool = {
    key: 'show',
    label: text.show,
    icon: 'search',
    tone: 'neutral',
    run: () => {
      comments.activate(thread.id);
    },
  };

  const resolve: ThreadTool = {
    key: 'resolve',
    label: thread.resolved ? text.reopen : text.resolve,
    icon: thread.resolved ? 'refresh' : 'check',
    tone: 'neutral',
    run: () => {
      void comments.resolve(thread.id, !thread.resolved);
    },
  };

  const remove: ThreadTool = {
    key: 'remove',
    label: text.remove,
    icon: 'trash',
    tone: 'error',
    run: () => {
      void comments.remove(thread.id);
    },
  };

  return [
    ...(thread.lost || thread.resolved || inline ? [] : [show]),
    resolve,
    ...(thread.author.id === comments.user.id ? [remove] : []),
  ];
});

const sendReply = async (body: string): Promise<boolean> => {
  const sent = await comments.reply(thread.id, body);

  replying.value = !sent;
  return sent;
};

const onClick = (event: MouseEvent): void => {
  if (event.target instanceof Element && event.target.closest('button, textarea, a') === null) {
    comments.activate(thread.id);
  }
};
</script>
