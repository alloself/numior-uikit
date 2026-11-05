import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import { useDirection } from '../direction/direction-context';
import { AriaValue } from '../aria/aria.types';
import { Key } from '../keyboard/key.types';
import { ListFocusMode, ListMove, ListOrientation } from './list.types';
import { listMoveFor, listTargetIndex } from './moves';
import {
  emptyTypeahead,
  extendTypeahead,
  isTypeaheadActive,
  lowerLabels,
  matchTypeahead,
  type TypeaheadState,
} from './typeahead';

export interface ListNavigationOptions {
  readonly items: () => readonly HTMLElement[];
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
  items(): readonly HTMLElement[];
  has(element: HTMLElement): boolean;
  itemFrom(target: EventTarget | null): HTMLElement | null;
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

interface ItemIndex {
  readonly source: readonly HTMLElement[];
  readonly list: readonly HTMLElement[];
  readonly positions: ReadonlyMap<HTMLElement, number>;
  readonly ids: ReadonlyMap<string, HTMLElement>;
  lowered: readonly string[] | undefined;
}

interface ItemWatch {
  root: HTMLElement | null;
  observer: MutationObserver | null;
  index: ItemIndex | null;
}

const WATCHED: MutationObserverInit = {
  subtree: true,
  childList: true,
  characterData: true,
  attributeFilter: ['role', 'id', 'hidden', 'disabled', 'aria-disabled', 'aria-label'],
};

const EMPTY_INDEX: ItemIndex = {
  source: [],
  list: [],
  positions: new Map(),
  ids: new Map(),
  lowered: [],
};

const isUsable = (element: HTMLElement): boolean =>
  element.getAttribute('aria-disabled') !== AriaValue.True &&
  !element.hasAttribute('disabled') &&
  !element.hidden;

const defaultText = (element: HTMLElement): string =>
  (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();

const indexItems = (source: readonly HTMLElement[]): ItemIndex => {
  const list = source.filter(isUsable);

  return {
    source,
    list,
    positions: new Map(list.map((element, position) => [element, position] as const)),
    ids: new Map(
      list.flatMap((element) => (element.id === '' ? [] : [[element.id, element] as const])),
    ),
    lowered: undefined,
  };
};

const observe = (watch: ItemWatch, root: HTMLElement): void => {
  watch.observer?.disconnect();
  watch.root = root;
  watch.index = null;

  watch.observer =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(() => {
          watch.index = null;
        });

  watch.observer?.observe(root, WATCHED);
};

const settledIndex = (watch: ItemWatch, source: readonly HTMLElement[]): ItemIndex | null =>
  watch.observer === null ||
  watch.observer.takeRecords().length > 0 ||
  watch.index?.source !== source
    ? null
    : watch.index;

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

const itemFrom = (
  target: EventTarget | null,
  root: HTMLElement | null | undefined,
  index: ItemIndex,
): HTMLElement | null => {
  let node = target instanceof HTMLElement ? target : null;

  while (node !== null && node !== root && !index.positions.has(node)) {
    node = node.parentElement;
  }

  return node === null || node === root ? null : node;
};

const resolveTarget = (target: ListActiveTarget, index: ItemIndex): HTMLElement | null => {
  if (typeof target === 'number') {
    return index.list[target] ?? null;
  }

  if (typeof target === 'string') {
    return index.ids.get(target) ?? null;
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
  const watch: ItemWatch = { root: null, observer: null, index: null };
  const pending = { frame: 0 };

  const roving = (): boolean =>
    (toValue(options.mode) ?? ListFocusMode.Roving) === ListFocusMode.Roving;

  const itemIndex = (): ItemIndex => {
    const root = toValue(container);

    if (!root) {
      return EMPTY_INDEX;
    }
    if (watch.root !== root) {
      observe(watch, root);
    }

    const source = options.items();
    const index = settledIndex(watch, source) ?? indexItems(source);

    watch.index = index;
    return index;
  };

  const items = (): readonly HTMLElement[] => itemIndex().list;

  const activeElement = (): HTMLElement | null => {
    if (held.node?.isConnected) {
      return held.node;
    }

    held.node = activeId.value === undefined ? null : resolveTarget(activeId.value, itemIndex());

    return held.node;
  };

  const currentIndex = (index: ItemIndex): number => {
    const active = activeElement();
    return active ? (index.positions.get(active) ?? -1) : -1;
  };

  const loweredOf = (index: ItemIndex): readonly string[] => {
    index.lowered ??= lowerLabels(index.list.map(options.itemText ?? defaultText));
    return index.lowered;
  };

  const reveal = (): void => {
    const root = toValue(container);

    if (root) {
      revealIn(root, activeElement());
    }
  };

  const revealSoon = (): void => {
    if (typeof requestAnimationFrame !== 'function' || pending.frame !== 0) {
      return;
    }

    pending.frame = requestAnimationFrame(() => {
      pending.frame = 0;
      reveal();
    });
  };

  const setActive = (target: ListActiveTarget, settings: SetActiveOptions = {}): void => {
    const element = resolveTarget(target, itemIndex());
    const focus = settings.focus ?? true;

    if (roving()) {
      applyTabStop(activeElement(), element, focus);
    }

    held.node = element;
    activeId.value = typeof target === 'string' ? target : idOf(element);

    if (focus) {
      reveal();
    } else {
      revealSoon();
    }
  };

  const move = (kind: ListMove): void => {
    const index = itemIndex();

    if (index.list.length === 0) {
      return;
    }

    const target = listTargetIndex(
      kind,
      currentIndex(index),
      index.list.length,
      toValue(options.loop) ?? false,
      toValue(options.pageSize) ?? 10,
    );

    setActive(index.list[target] ?? null);
  };

  const match = (key: string): HTMLElement | null => {
    const index = itemIndex();

    typeahead.value = extendTypeahead(typeahead.value, key, Date.now());

    const found = matchTypeahead(loweredOf(index), typeahead.value.query, currentIndex(index));

    return found < 0 ? null : (index.list[found] ?? null);
  };

  const reset = (): void => {
    typeahead.value = emptyTypeahead;
    setActive(options.resting?.() ?? items()[0] ?? null, { focus: false });
  };

  const typing = (event: KeyboardEvent): boolean =>
    (toValue(options.typeahead) ?? true) &&
    isPrintable(event) &&
    (event.key !== Key.Space || isTypeaheadActive(typeahead.value, Date.now()));

  const onKeydown = (event: KeyboardEvent): void => {
    if (!toValue(container) || event.defaultPrevented) {
      return;
    }

    const orientation = toValue(options.orientation) ?? ListOrientation.Vertical;
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
    const index = itemIndex();
    const item = itemFrom(event.target, toValue(container), index);

    if (roving() && item && item !== activeElement()) {
      setActive(item, { focus: false });
    }
  };

  if (getCurrentScope()) {
    onScopeDispose(() => {
      watch.observer?.disconnect();
    });
  }

  return {
    activeId,
    typeaheadQuery: computed(() => typeahead.value.query),
    items,
    has: (element) => itemIndex().positions.has(element),
    itemFrom: (target) => itemFrom(target, toValue(container), itemIndex()),
    activeElement,
    setActive,
    reveal,
    focusFirst: () => move(ListMove.First),
    focusLast: () => move(ListMove.Last),
    focusNext: () => move(ListMove.Next),
    focusPrev: () => move(ListMove.Prev),
    matchTypeahead: match,
    reset,
    onKeydown,
    onFocusin,
  };
};
