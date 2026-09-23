import { computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';
import {
  emptyTypeahead,
  extendTypeahead,
  isTypeaheadActive,
  matchTypeahead,
  type TypeaheadState,
} from './typeahead';

export type ListOrientation = 'vertical' | 'horizontal' | 'both';
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
  readonly onActiveChange?: ((element: HTMLElement | null) => void) | undefined;
}

export interface SetActiveOptions {
  readonly focus?: boolean | undefined;
}

export interface ListNavigation {
  readonly activeId: Readonly<Ref<string | undefined>>;
  readonly activeIndex: Readonly<Ref<number>>;
  readonly typeaheadQuery: ComputedRef<string>;
  items(): HTMLElement[];
  activeElement(): HTMLElement | null;
  setActive(target: HTMLElement | number | null, options?: SetActiveOptions): void;
  focusFirst(): void;
  focusLast(): void;
  focusNext(): void;
  focusPrev(): void;
  matchTypeahead(key: string): HTMLElement | null;
  sync(): void;
  reset(): void;
  onKeydown(event: KeyboardEvent): void;
  onFocusin(event: FocusEvent): void;
}

type Move = 'first' | 'last' | 'next' | 'prev' | 'page-next' | 'page-prev';

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

const isRtl = (container: HTMLElement, explicit: boolean | undefined): boolean =>
  explicit ?? container.closest('[dir]')?.getAttribute('dir') === 'rtl';

const horizontalMoves = (rtl: boolean): Record<string, Move> =>
  rtl ? { ArrowLeft: 'next', ArrowRight: 'prev' } : { ArrowRight: 'next', ArrowLeft: 'prev' };

const movesFor = (orientation: ListOrientation, rtl: boolean): Record<string, Move> => ({
  ...(orientation === 'horizontal' ? {} : { ArrowDown: 'next', ArrowUp: 'prev' }),
  ...(orientation === 'vertical' ? {} : horizontalMoves(rtl)),
  Home: 'first',
  End: 'last',
  PageDown: 'page-next',
  PageUp: 'page-prev',
});

const clamp = (value: number, last: number): number => Math.min(last, Math.max(0, value));

const wrapIndex = (value: number, length: number, loop: boolean): number =>
  loop ? (value + length) % length : clamp(value, length - 1);

const targetIndex = (
  move: Move,
  current: number,
  length: number,
  loop: boolean,
  page: number,
): number => {
  const last = length - 1;
  const targets: Record<Move, number> = {
    first: 0,
    last,
    next: current < 0 ? 0 : wrapIndex(current + 1, length, loop),
    prev: current < 0 ? last : wrapIndex(current - 1, length, loop),
    'page-next': clamp(Math.max(0, current) + page, last),
    'page-prev': Math.max(0, current - page),
  };
  return targets[move];
};

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

const reveal = (container: HTMLElement, element: HTMLElement | null): void => {
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

export const useListNavigation = (
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: ListNavigationOptions,
): ListNavigation => {
  const activeId = ref<string | undefined>();
  const activeIndex = ref(-1);
  const typeahead = ref<TypeaheadState>(emptyTypeahead);
  let active: HTMLElement | null = null;
  const roving = (): boolean => (toValue(options.mode) ?? 'roving') === 'roving';
  const items = (): HTMLElement[] => {
    const root = toValue(container);
    return root ? collect(root, options.selector, options.scope) : [];
  };
  const currentIndex = (list: HTMLElement[]): number => (active ? list.indexOf(active) : -1);

  const setActive = (
    target: HTMLElement | number | null,
    settings: SetActiveOptions = {},
  ): void => {
    const list = items();
    const element = typeof target === 'number' ? (list[target] ?? null) : target;
    if (roving()) {
      applyTabStop(active, element, settings.focus ?? true);
    }
    const root = toValue(container);
    if (root) {
      reveal(root, element);
    }
    active = element;
    activeIndex.value = element ? list.indexOf(element) : -1;
    activeId.value = idOf(element);
    options.onActiveChange?.(element);
  };

  const move = (kind: Move): void => {
    const list = items();
    if (list.length === 0) {
      return;
    }
    const index = targetIndex(
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

  const sync = (): void => {
    if (!active || !active.isConnected || !items().includes(active)) {
      reset();
    }
  };

  const typing = (event: KeyboardEvent): boolean =>
    (toValue(options.typeahead) ?? true) &&
    isPrintable(event) &&
    (event.key !== ' ' || isTypeaheadActive(typeahead.value, Date.now()));

  const onKeydown = (event: KeyboardEvent): void => {
    const root = toValue(container);
    if (!root || event.defaultPrevented) {
      return;
    }
    const orientation = toValue(options.orientation) ?? 'vertical';
    const kind = movesFor(orientation, isRtl(root, toValue(options.rtl)))[event.key];
    if (kind) {
      event.preventDefault();
      move(kind);
    } else if (typing(event)) {
      event.preventDefault();
      setActive(match(event.key) ?? active);
    }
  };

  const onFocusin = (event: FocusEvent): void => {
    const item = itemFrom(event.target, options.selector);
    if (roving() && item && item !== active && items().includes(item)) {
      setActive(item, { focus: false });
    }
  };

  return {
    activeId,
    activeIndex,
    typeaheadQuery: computed(() => typeahead.value.query),
    items,
    activeElement: () => active,
    setActive,
    focusFirst: () => move('first'),
    focusLast: () => move('last'),
    focusNext: () => move('next'),
    focusPrev: () => move('prev'),
    matchTypeahead: match,
    sync,
    reset,
    onKeydown,
    onFocusin,
  };
};
