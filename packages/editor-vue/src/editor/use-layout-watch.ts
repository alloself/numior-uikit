import { useEventListener, useMutationObserver, useResizeObserver } from '@vueuse/core';
import { onScopeDispose, toValue, type MaybeRefOrGetter } from 'vue';
import { PlayState } from './editor.types';

export interface LayoutWatch {
  readonly watch: (listener: () => void) => () => void;
}

const LOOK = ['class', 'style', 'dir', 'hidden', 'open'];

const isPassing = (animation: Animation): boolean =>
  animation.playState === PlayState.Running &&
  animation.effect?.getComputedTiming().iterations !== Infinity;

export const useLayoutWatch = (
  frame: MaybeRefOrGetter<HTMLElement | null>,
  content: MaybeRefOrGetter<HTMLElement | null>,
): LayoutWatch => {
  const listeners = new Set<() => void>();

  let pending: number | undefined;

  const inMotion = (): boolean => {
    const element = toValue(content);

    return (
      typeof element?.getAnimations === 'function' &&
      element.getAnimations({ subtree: true }).some(isPassing)
    );
  };

  const schedule = (): void => {
    pending ??= requestAnimationFrame(() => {
      pending = undefined;

      listeners.forEach((listener) => {
        listener();
      });

      if (listeners.size === 0 || !inMotion()) {
        return;
      }

      schedule();
    });
  };

  const follow = (): void => {
    if (listeners.size === 0) {
      return;
    }

    schedule();
  };

  useResizeObserver(content, follow);

  useMutationObserver(frame, follow, { childList: true, subtree: true });

  useMutationObserver(content, follow, {
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: LOOK,
  });

  useEventListener(content, ['transitionrun', 'animationstart'], follow, { passive: true });

  useEventListener(content, 'load', follow, { capture: true, passive: true });

  useEventListener(() => toValue(content)?.ownerDocument.fonts, 'loadingdone', follow, {
    passive: true,
  });

  onScopeDispose(() => {
    listeners.clear();

    if (pending === undefined) {
      return;
    }

    cancelAnimationFrame(pending);
  });

  return {
    watch: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};
