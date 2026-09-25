import { computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';
import { useDirection } from '../direction/direction-context';
import { listMoveFor, listTargetIndex, type ListMove, type ListOrientation } from './moves';
import {
  emptyTypeahead,
  extendTypeahead,
  isTypeaheadActive,
  matchTypeahead,
  type TypeaheadState,
} from './typeahead';

export type { ListOrientation } from './moves';
export type ListFocusMode = 'roving' | 'virtual';

export interface ListNavigationOptions {
  readonly selector: string;
  readonly scope?: string | undefined;
  readonly mode?: MaybeRefOrGetter<ListFocusMode | undefined>;
  readonly orientation?: MaybeRefOrGetter<ListOrientation | undefined>;
  readonly loop?: MaybeRefOrGetter<boolean | undefined>;
  readonly typeahead?: MaybeRefOrGetter<boolean | undefined>;
  readonly pageSize?: MaybeRefOrGetter<number | undefined>;
  readonly rtl?: MaybeRefOrGetter<boolean | undefined>;
  readonly resting?: (() => HTMLElement | null | undefined) | undefined;
  readonly itemText?: ((element: HTMLElement) => string) | undefined;
}

export interface SetActiveOptions {
  readonly focus?: boolean | undefined;
}

export type ListActiveTarget = HTMLElement | number | string | null;

export interface ListNavigation {
  readonly activeId: Readonly<Ref<string | undefined>>;
  readonly typeaheadQuery: ComputedRef<string>;
  items(): HTMLElement[];
  activeElement(): HTMLElement | null;
  setActive(target: ListActiveTarget, options?: SetActiveOptions): void;
  reveal(): void;
  focusFirst(): void;
  focusLast(): void;
  focusNext(): void;
  focusPrev(): void;
  matchTypeahead(key: string): HTMLElement | null;
  reset(): void;
  onKeydown(event: KeyboardEvent): void;
  onFocusin(event: FocusEvent): void;
}

const isUsable = (element: HTMLElement): boolean =>
  element.getAttribute('aria-disabled') !== 'true' &&
  !element.hasAttribute('disabled') &&
  !element.hidden;

const collect = (
  container: HTMLElement,
  selector: string,
  scope: string | undefined,
): HTMLElement[] =>
  Array.from(container.querySelectorAll(selector)).filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement &&
      isUsable(node) &&
      (scope === undefined || node.closest(scope) === container),
  );

const defaultText = (element: HTMLElement): string =>
  (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();

const applyTabStop = (
  previous: HTMLElement | null,
  next: HTMLElement | null,
  focus: boolean,
): void => {
  if (previous && previous !== next) {
    previous.tabIndex = -1;
  }

  if (!next) {
    return;
  }

  next.tabIndex = 0;

  if (focus) {
    next.focus({ preventScroll: true });
  }
};

const revealAxis = (
  start: number,
  size: number,
  scroll: number,
  viewport: number,
): number | undefined => {
  if (start < scroll) {
    return start;
  }

  if (start + size > scroll + viewport) {
    return start + size - viewport;
  }

  return undefined;
};

const revealIn = (container: HTMLElement, element: HTMLElement | null): void => {
  if (!element || element.offsetParent !== container) {
    return;
  }

  const top = revealAxis(
    element.offsetTop,
    element.offsetHeight,
    container.scrollTop,
    container.clientHeight,
  );

  if (top !== undefined) {
    container.scrollTop = top;
  }

  const left = revealAxis(
    element.offsetLeft,
    element.offsetWidth,
    container.scrollLeft,
    container.clientWidth,
  );

  if (left !== undefined) {
    container.scrollLeft = left;
  }
};

const idOf = (element: HTMLElement | null): string | undefined =>
  element && element.id !== '' ? element.id : undefined;

const isPrintable = (event: KeyboardEvent): boolean =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

const itemFrom = (target: EventTarget | null, selector: string): HTMLElement | null => {
  const item = target instanceof HTMLElement ? target.closest(selector) : null;
  return item instanceof HTMLElement ? item : null;
};

const resolveTarget = (target: ListActiveTarget, list: HTMLElement[]): HTMLElement | null => {
  if (typeof target === 'number') {
    return list[target] ?? null;
  }

  if (typeof target === 'string') {
    return list.find((item) => item.id === target) ?? null;
  }

  return target;
};

export const useListNavigation = (
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: ListNavigationOptions,
): ListNavigation => {
  const activeId = ref<string | undefined>();
  const typeahead = ref<TypeaheadState>(emptyTypeahead);
  const direction = useDirection(container);
  const held: { node: HTMLElement | null } = { node: null };
  const roving = (): boolean => (toValue(options.mode) ?? 'roving') === 'roving';

  const items = (): HTMLElement[] => {
    const root = toValue(container);
    return root ? collect(root, options.selector, options.scope) : [];
  };

  const activeElement = (): HTMLElement | null => {
    if (held.node?.isConnected) {
      return held.node;
    }

    held.node = activeId.value === undefined ? null : resolveTarget(activeId.value, items());

    return held.node;
  };

  const currentIndex = (list: HTMLElement[]): number => {
    const active = activeElement();
    return active ? list.indexOf(active) : -1;
  };

  const reveal = (): void => {
    const root = toValue(container);

    if (root) {
      revealIn(root, activeElement());
    }
  };

  const setActive = (target: ListActiveTarget, settings: SetActiveOptions = {}): void => {
    const element = resolveTarget(target, items());

    if (roving()) {
      applyTabStop(activeElement(), element, settings.focus ?? true);
    }

    held.node = element;
    activeId.value = typeof target === 'string' ? target : idOf(element);
    reveal();
  };

  const move = (kind: ListMove): void => {
    const list = items();

    if (list.length === 0) {
      return;
    }

    const index = listTargetIndex(
      kind,
      currentIndex(list),
      list.length,
      toValue(options.loop) ?? false,
      toValue(options.pageSize) ?? 10,
    );

    setActive(list[index] ?? null);
  };

  const match = (key: string): HTMLElement | null => {
    const list = items();
    typeahead.value = extendTypeahead(typeahead.value, key, Date.now());
    const labels = list.map((element) => (options.itemText ?? defaultText)(element));
    const found = matchTypeahead(labels, typeahead.value.query, currentIndex(list));
    return found < 0 ? null : (list[found] ?? null);
  };

  const reset = (): void => {
    typeahead.value = emptyTypeahead;
    setActive(options.resting?.() ?? items()[0] ?? null, { focus: false });
  };

  const typing = (event: KeyboardEvent): boolean =>
    (toValue(options.typeahead) ?? true) &&
    isPrintable(event) &&
    (event.key !== ' ' || isTypeaheadActive(typeahead.value, Date.now()));

  const onKeydown = (event: KeyboardEvent): void => {
    if (!toValue(container) || event.defaultPrevented) {
      return;
    }

    const orientation = toValue(options.orientation) ?? 'vertical';
    const rtl = toValue(options.rtl) ?? direction.isRtl();
    const kind = listMoveFor(event.key, orientation, rtl);

    if (kind) {
      event.preventDefault();
      move(kind);
    } else if (typing(event)) {
      event.preventDefault();
      setActive(match(event.key) ?? activeElement());
    }
  };

  const onFocusin = (event: FocusEvent): void => {
    const item = itemFrom(event.target, options.selector);

    if (roving() && item && item !== activeElement() && items().includes(item)) {
      setActive(item, { focus: false });
    }
  };

  return {
    activeId,
    typeaheadQuery: computed(() => typeahead.value.query),
    items,
    activeElement,
    setActive,
    reveal,
    focusFirst: () => move('first'),
    focusLast: () => move('last'),
    focusNext: () => move('next'),
    focusPrev: () => move('prev'),
    matchTypeahead: match,
    reset,
    onKeydown,
    onFocusin,
  };
};
