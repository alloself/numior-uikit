<template>
  <span ref="layer" class="nui-collab-comment-layer">
    <span ref="anchor" class="nui-collab-comment-layer__anchor"></span>
  </span>
  <NuiPopover
    v-model:open="shown"
    :anchor="anchor"
    placement="bottom-start"
    size="auto"
    :offset="6"
    padding="sm"
  >
    <section class="nui-collab-comments nui-collab-comment-popover" :aria-label="text.comments">
      <NuiAlert v-if="comments.failed.value" tone="error" :title="text.failed" />
      <NuiEditorCommentForm
        v-if="comments.drafting.value"
        autofocus
        :placeholder="text.placeholder"
        :text="text"
        :submit="comments.submit"
        @cancel="comments.cancel"
      />
      <NuiEditorCommentThread
        v-else-if="thread !== undefined"
        inline
        :comments="comments"
        :thread="thread"
        :text="text"
        :time-of="timeOf"
      />
    </section>
  </NuiPopover>
</template>

<script setup lang="ts">
import { useLocale, useMessages } from '@numior/primitives';
import { NuiAlert, NuiPopover } from '@numior/vue';
import { promiseTimeout, useEventListener } from '@vueuse/core';
import { computed, useTemplateRef, watch } from 'vue';
import { collabMessages } from './collab.messages';
import type { NuiEditorCommentPopoverProps } from './collab.types';
import NuiEditorCommentForm from './NuiEditorCommentForm.vue';
import NuiEditorCommentThread from './NuiEditorCommentThread.vue';

const MARK = '.nui-editor__comment';

const EDITOR = '.nui-editor';

const CLICK_SLOP = 4;

const { comments, editor, labels } = defineProps<NuiEditorCommentPopoverProps>();

const layer = useTemplateRef<HTMLElement>('layer');
const anchor = useTemplateRef<HTMLElement>('anchor');

let pressed: { readonly x: number; readonly y: number } | undefined;

const messages = useMessages(collabMessages);
const locale = useLocale();

const text = computed(() => ({ ...messages.value, ...labels }));

const formatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'short' }),
);

const thread = computed(() =>
  comments.threads.value.find((item) => item.id === comments.opened.value),
);

const shown = computed({
  get: () => comments.drafting.value || thread.value !== undefined,
  set: (open) => {
    if (!open) {
      comments.close();
    }
  },
});

const timeOf = (value: string): string => formatter.value.format(new Date(value));

const place = (): void => {
  const spot = shown.value ? comments.spot() : undefined;
  const element = anchor.value;

  if (spot === undefined || element === null) {
    return;
  }

  const start = editor?.coordsAt(spot.from);
  const end = editor?.coordsAt(spot.to);
  const origin = layer.value?.getBoundingClientRect();

  if (start === undefined || end === undefined || origin === undefined) {
    return;
  }

  const left = Math.min(start.left, end.left);
  const right = Math.max(start.right, end.right);

  element.style.left = `${String(left - origin.left)}px`;
  element.style.top = `${String(start.top - origin.top)}px`;
  element.style.width = `${String(Math.max(1, right - left))}px`;
  element.style.height = `${String(Math.max(1, end.bottom - start.top))}px`;
};

const onPointerdown = (event: PointerEvent): void => {
  pressed = { x: event.clientX, y: event.clientY };
};

const onPointerup = async (event: PointerEvent): Promise<void> => {
  const still =
    pressed !== undefined &&
    Math.abs(event.clientX - pressed.x) + Math.abs(event.clientY - pressed.y) <= CLICK_SLOP;

  const hit = still && document.elementFromPoint(event.clientX, event.clientY)?.closest(MARK);
  const pos = hit ? editor?.posAt(event.clientX, event.clientY) : undefined;

  if (pos !== undefined) {
    await promiseTimeout(0);
    comments.openAt(pos);
  }
};

useEventListener(() => layer.value?.closest<HTMLElement>(EDITOR), 'pointerdown', onPointerdown);

useEventListener(() => layer.value?.closest<HTMLElement>(EDITOR), 'pointerup', onPointerup);

watch([shown, comments.revision, comments.opened], place, { flush: 'post' });

watch(comments.drafting, (now, was) => {
  if (was && !now) {
    editor?.focus();
  }
});
</script>
