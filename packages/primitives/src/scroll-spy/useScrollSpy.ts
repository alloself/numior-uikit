import { useEventListener, useTimeoutFn } from '@vueuse/core';
import { onMounted, ref, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

export interface ScrollSpyOptions {
  readonly root?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly line?: MaybeRefOrGetter<number | undefined>;
}

export interface ScrollSpy {
  readonly activeId: Readonly<Ref<string | undefined>>;
  activate(id: string): void;
  measure(): void;
}

const DEFAULT_LINE = 0.2;
const SETTLE_DELAY = 150;
const TOLERANCE = 1;

const elementsIn = (scope: ParentNode, order: readonly string[]): HTMLElement[] => {
  const wanted = new Set(order);

  return [...scope.querySelectorAll('[id]')].filter(
    (element): element is HTMLElement => element instanceof HTMLElement && wanted.has(element.id),
  );
};

const pageWindow = (): Window | undefined => (typeof window === 'undefined' ? undefined : window);

const lineOf = (root: HTMLElement | null, fraction: number): number => {
  if (root === null) {
    return window.innerHeight * fraction;
  }
  const rect = root.getBoundingClientRect();

  return rect.top + rect.height * fraction;
};

export const useScrollSpy = (
  ids: MaybeRefOrGetter<readonly string[]>,
  options: ScrollSpyOptions = {},
): ScrollSpy => {
  const activeId = ref<string>();
  const targets = shallowRef<HTMLElement[]>([]);
  let locked = false;

  const rootOf = (): HTMLElement | null => toValue(options.root) ?? null;
  const scrollerOf = (): HTMLElement | Window | undefined => rootOf() ?? pageWindow();

  const unlock = useTimeoutFn(
    () => {
      locked = false;
    },
    SETTLE_DELAY,
    { immediate: false },
  );

  const measure = (): void => {
    if (locked || typeof window === 'undefined') {
      return;
    }
    const line = lineOf(rootOf(), toValue(options.line) ?? DEFAULT_LINE) + TOLERANCE;

    activeId.value = targets.value.findLast(
      (element) => element.getBoundingClientRect().top <= line,
    )?.id;
  };

  const activate = (id: string): void => {
    activeId.value = id;
    locked = true;
    unlock.start();
  };

  const onScroll = (): void => {
    if (locked) {
      unlock.start();
      return;
    }
    measure();
  };

  const onScrollEnd = (): void => {
    unlock.stop();
    locked = false;
  };

  const refresh = (): void => {
    targets.value = elementsIn(rootOf() ?? document, toValue(ids));
    measure();
  };

  onMounted(() => {
    refresh();
    useEventListener(scrollerOf, 'scroll', onScroll, { passive: true });
    useEventListener(scrollerOf, 'scrollend', onScrollEnd, { passive: true });
    useEventListener(pageWindow, 'resize', measure, { passive: true });

    watch(() => [toValue(ids), toValue(options.root), toValue(options.line)], refresh, {
      flush: 'post',
    });
  });

  return { activeId, activate, measure };
};
