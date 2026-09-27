import {
  onMounted,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

export interface ScrollSpyOptions {
  readonly root?: MaybeRefOrGetter<Element | null | undefined>;
  readonly rootMargin?: MaybeRefOrGetter<string | undefined>;
}

const DEFAULT_ROOT_MARGIN = '0px 0px -60% 0px';

const idsOf = (entries: readonly IntersectionObserverEntry[]): string[] =>
  entries.map((entry) => entry.target.id);

const bandTopOf = (entry: IntersectionObserverEntry): number => entry.rootBounds?.top ?? 0;

const elementsIn = (scope: ParentNode, order: readonly string[]): Element[] => {
  const wanted = new Set(order);

  return [...scope.querySelectorAll('[id]')].filter((element) => wanted.has(element.id));
};

export const useScrollSpy = (
  ids: MaybeRefOrGetter<readonly string[]>,
  options: ScrollSpyOptions = {},
): Readonly<Ref<string | undefined>> => {
  const activeId = ref<string>();
  const visible = new Set<string>();
  let observer: IntersectionObserver | undefined;

  const disconnect = (): void => {
    observer?.disconnect();
    observer = undefined;
    visible.clear();
  };

  const settle = (entries: IntersectionObserverEntry[], order: readonly string[]): void => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        visible.add(entry.target.id);
      } else {
        visible.delete(entry.target.id);
      }
    }
    const first = order.find((id) => visible.has(id));

    if (first !== undefined) {
      activeId.value = first;
      return;
    }
    const left = entries.filter((entry) => !entry.isIntersecting);

    const above = new Set(
      idsOf(left.filter((entry) => entry.boundingClientRect.top < bandTopOf(entry))),
    );

    const lastAbove = order.findLast((id) => above.has(id));

    if (lastAbove !== undefined) {
      activeId.value = lastAbove;
      return;
    }
    const below = new Set(idsOf(left));
    const firstBelow = order.findIndex((id) => below.has(id));

    if (firstBelow >= 0) {
      activeId.value = order[firstBelow - 1];
    }
  };

  const observe = (): void => {
    disconnect();

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const order = toValue(ids);
    const root = toValue(options.root) ?? null;

    observer = new IntersectionObserver((entries) => settle(entries, order), {
      root,
      rootMargin: toValue(options.rootMargin) ?? DEFAULT_ROOT_MARGIN,
    });

    for (const element of elementsIn(root ?? document, order)) {
      observer.observe(element);
    }
  };

  onMounted(() => {
    observe();

    watch(() => [toValue(ids), toValue(options.root), toValue(options.rootMargin)], observe, {
      flush: 'post',
    });
  });

  onScopeDispose(disconnect);

  return activeId;
};
