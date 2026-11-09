<template>
  <div ref="layer" class="nui-collab-carets" aria-hidden="true">
    <div
      v-for="peer in shown"
      :key="peer.clientId"
      class="nui-collab-carets__caret"
      :class="`nui-collab-colour--${peer.colour}`"
    >
      <span class="nui-collab-carets__flag" dir="auto">{{ peer.user.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener, useResizeObserver } from '@vueuse/core';
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue';
import type { NuiCollabCaretsProps } from './collab.types';

const FLAG_ROOM = 20;

const { peers, editor } = defineProps<NuiCollabCaretsProps>();

const layer = useTemplateRef<HTMLElement>('layer');

const shown = computed(() => peers.filter((peer) => peer.head !== undefined));

let frame: number | undefined;

const flagShift = (element: HTMLElement, left: number, room: number): number => {
  const flag = element.firstElementChild;

  if (!(flag instanceof HTMLElement)) {
    return 0;
  }

  return Math.max(-left, Math.min(0, room - left - flag.offsetWidth));
};

const place = (element: HTMLElement, head: number): void => {
  const coords = editor?.coordsAt(head);
  const box = editor?.contentBox();
  const origin = layer.value?.getBoundingClientRect();

  if (
    coords === undefined ||
    box === undefined ||
    origin === undefined ||
    coords.bottom < box.top ||
    coords.top > box.bottom
  ) {
    element.style.opacity = '0';
    return;
  }

  const left = coords.left - origin.left;
  const top = coords.top - origin.top;
  const height = coords.bottom - coords.top;

  element.style.opacity = '1';
  element.style.transform = `translate(${left}px, ${top}px)`;
  element.style.setProperty('--_height', `${height}px`);
  element.style.setProperty('--_flag-x', `${flagShift(element, left, origin.width)}px`);
  element.style.setProperty('--_flag-shift', top < FLAG_ROOM ? `calc(100% + ${height}px)` : '0');
};

const measure = (): void => {
  const carets = layer.value?.children ?? [];

  shown.value.forEach((peer, index) => {
    const element = carets[index];

    if (element instanceof HTMLElement && peer.head !== undefined) {
      place(element, peer.head);
    }
  });
};

const schedule = (): void => {
  frame ??= requestAnimationFrame(() => {
    frame = undefined;
    measure();
  });
};

watch(shown, measure, { flush: 'post' });

useResizeObserver(layer, schedule);

useEventListener(() => layer.value?.ownerDocument, 'scroll', schedule, {
  capture: true,
  passive: true,
});

onBeforeUnmount(() => {
  if (frame !== undefined) {
    cancelAnimationFrame(frame);
  }
});
</script>
