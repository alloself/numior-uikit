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
import { useEventListener, useMutationObserver, useResizeObserver } from '@vueuse/core';
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue';
import type { NuiCollabCaretsProps } from './collab.types';

const FLAG_ROOM = 20;

const LOOK = ['class', 'style', 'dir', 'hidden', 'open'];

const isMoving = (animation: Animation, apart: Element | null): boolean => {
  const { effect } = animation;
  const target = effect instanceof KeyframeEffect ? effect.target : null;

  return (
    animation.playState === 'running' &&
    effect?.getComputedTiming().iterations !== Infinity &&
    !(target !== null && apart?.contains(target) === true)
  );
};

const { peers, editor } = defineProps<NuiCollabCaretsProps>();

const layer = useTemplateRef<HTMLElement>('layer');

const shown = computed(() => peers.filter((peer) => peer.head !== undefined));
const host = computed(() => layer.value?.closest<HTMLElement>('.nui-editor'));

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

const inMotion = (): boolean => {
  const element = host.value;

  return (
    typeof element?.getAnimations === 'function' &&
    element.getAnimations({ subtree: true }).some((each) => isMoving(each, layer.value))
  );
};

const schedule = (): void => {
  frame ??= requestAnimationFrame(() => {
    frame = undefined;
    measure();

    if (inMotion()) {
      schedule();
    }
  });
};

const follow = (): void => {
  if (shown.value.length > 0) {
    schedule();
  }
};

const onMutations = (records: readonly MutationRecord[]): void => {
  if (records.some((record) => layer.value?.contains(record.target) !== true)) {
    follow();
  }
};

watch(
  shown,
  () => {
    measure();

    if (inMotion()) {
      follow();
    }
  },
  { flush: 'post' },
);

useResizeObserver(layer, follow);

useMutationObserver(host, onMutations, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: LOOK,
});

useEventListener(host, ['transitionrun', 'animationstart'], follow, { passive: true });

useEventListener(host, 'load', follow, { capture: true, passive: true });

useEventListener(() => layer.value?.ownerDocument.fonts, 'loadingdone', follow, { passive: true });

useEventListener(() => layer.value?.ownerDocument, 'scroll', follow, {
  capture: true,
  passive: true,
});

onBeforeUnmount(() => {
  if (frame !== undefined) {
    cancelAnimationFrame(frame);
  }
});
</script>
