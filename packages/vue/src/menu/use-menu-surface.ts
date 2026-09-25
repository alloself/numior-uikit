import {
  computed,
  onMounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
  type ShallowRef,
} from 'vue';
import {
  useFloating,
  useListNavigation,
  usePopover,
  type FloatingPlacement,
  type FloatingSize,
  type ListNavigation,
  type PopoverControl,
} from '@numior/primitives';
import type { MenuContext, MenuFocusRequest } from './menu-context';

const MENU_ITEMS = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

export interface MenuSurfaceOptions {
  readonly open: Ref<boolean>;
  readonly id?: MaybeRefOrGetter<string | undefined>;
  readonly trigger: Readonly<ShallowRef<HTMLElement | null>>;
  readonly content: Readonly<ShallowRef<HTMLElement | null>>;
  readonly placement: MaybeRefOrGetter<FloatingPlacement>;
  readonly offset: MaybeRefOrGetter<number>;
  readonly size?: MaybeRefOrGetter<FloatingSize | undefined>;
  readonly loop: MaybeRefOrGetter<boolean>;
  readonly typeahead: MaybeRefOrGetter<boolean>;
  readonly closeOnSelect: MaybeRefOrGetter<boolean>;
  readonly parent: MenuContext | null;
  readonly close?: (() => void) | undefined;
}

export interface MenuSurfaceAttrs {
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly onFocusin: (event: FocusEvent) => void;
  readonly onFocusout: (event: FocusEvent) => void;
  readonly onPointermove: (event: PointerEvent) => void;
  readonly onPointerleave: () => void;
}

export interface MenuSurface {
  readonly control: PopoverControl;
  readonly navigation: ListNavigation;
  readonly context: MenuContext;
  readonly attrs: MenuSurfaceAttrs;
}

const itemAt = (target: EventTarget | null): HTMLElement | null => {
  const item = target instanceof HTMLElement ? target.closest(MENU_ITEMS) : null;
  return item instanceof HTMLElement ? item : null;
};

const focusElement = (element: HTMLElement | null | undefined): void => {
  element?.focus({ preventScroll: true });
};

const holdsOpenSubmenu = (element: HTMLElement | null): boolean =>
  element?.getAttribute('aria-expanded') === 'true';

const labelOf = (element: HTMLElement): string =>
  (element.querySelector('.nui-menu-item__label')?.textContent ?? element.textContent ?? '').trim();

export const useMenuSurface = (options: MenuSurfaceOptions): MenuSurface => {
  const control = usePopover(options.content, { open: options.open, id: options.id, mode: 'auto' });

  useFloating(options.trigger, options.content, {
    placement: options.placement,
    offset: options.offset,
    size: options.size,
    enabled: options.open,
  });

  const navigation = useListNavigation(options.content, {
    selector: MENU_ITEMS,
    scope: '[role="menu"]',
    loop: options.loop,
    typeahead: options.typeahead,
    itemText: labelOf,
  });

  const state = { pending: 'none' satisfies MenuFocusRequest, inside: false, pointer: false };
  const close = (): void => (options.close ?? control.hide)();

  const context: MenuContext = {
    level: (options.parent?.level ?? -1) + 1,
    closeOnSelect: computed(() => toValue(options.closeOnSelect)),
    close,
    closeAll: () => {
      close();
      options.parent?.closeAll();
    },
    requestFocus: (target) => {
      state.pending = target;
    },
  };

  const activateOnOpen = (): void => {
    navigation.reset();

    if (state.pending === 'first') {
      navigation.setActive(0, { focus: false });
    } else if (state.pending === 'last') {
      navigation.setActive(navigation.items().length - 1, { focus: false });
    }
  };

  const focusOnOpen = (): void => {
    focusElement(state.pending === 'none' ? options.content.value : navigation.activeElement());
    state.pending = 'none';
  };

  const onClosed = (): void => {
    if (state.inside) {
      state.inside = false;
      focusElement(options.trigger.value);
    }
  };

  watch(
    () => options.open.value,
    (isOpen) => {
      if (isOpen) {
        activateOnOpen();
      } else {
        navigation.reset();
      }
    },
  );

  onMounted(() => {
    watch(
      () => options.open.value,
      (isOpen) => {
        if (isOpen) {
          focusOnOpen();
        } else {
          onClosed();
        }
      },
      { flush: 'post' },
    );
  });

  const within = (node: EventTarget | null): boolean =>
    node instanceof Node &&
    (options.content.value?.contains(node) === true ||
      options.trigger.value?.contains(node) === true);

  return {
    control,
    navigation,
    context,
    attrs: {
      onKeydown: (event) => {
        state.pointer = false;
        if (event.key === 'Tab') {
          context.closeAll();
          return;
        }
        navigation.onKeydown(event);
      },
      onFocusin: (event) => {
        state.inside = true;
        navigation.onFocusin(event);
      },
      onFocusout: (event) => {
        if (within(event.relatedTarget)) {
          return;
        }
        state.inside = false;
        if (options.open.value) {
          close();
        }
      },
      onPointermove: (event) => {
        const item = itemAt(event.target);
        if (item && item !== navigation.activeElement() && navigation.items().includes(item)) {
          state.pointer = true;
          navigation.setActive(item);
        }
      },
      onPointerleave: () => {
        if (!state.pointer || holdsOpenSubmenu(navigation.activeElement())) {
          return;
        }
        state.pointer = false;
        navigation.reset();
        focusElement(options.content.value);
      },
    },
  };
};
