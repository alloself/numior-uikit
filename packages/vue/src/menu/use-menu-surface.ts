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
  createIntent,
  useFloating,
  useListNavigation,
  usePopover,
  type FloatingPlacement,
  type FloatingSize,
  type ListNavigation,
  type PopoverControl,
} from '@numior/primitives';
import type { MenuContext, MenuFocusRequest } from './menu-context';

export interface MenuSurfaceOptions {
  readonly open: Ref<boolean>;
  readonly id?: MaybeRefOrGetter<string | undefined>;
  readonly trigger: Readonly<Ref<HTMLElement | null>>;
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

const MENU_ITEMS = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

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

  const opening = createIntent<Exclude<MenuFocusRequest, 'none'>>();
  let inside = false;
  let pointer = false;

  const close = (): void => {
    if (options.close === undefined) {
      control.hide();
    } else {
      options.close();
    }
  };

  const context: MenuContext = {
    level: (options.parent?.level ?? -1) + 1,
    closeOnSelect: computed(() => toValue(options.closeOnSelect)),
    close,
    closeAll: () => {
      close();
      options.parent?.closeAll();
    },
    requestFocus: (target) => {
      opening.set(target === 'none' ? undefined : target);
    },
  };

  const activateOnOpen = (): void => {
    navigation.reset();

    switch (opening.peek()) {
      case 'first':
        navigation.setActive(0, { focus: false });
        break;
      case 'last':
        navigation.setActive(navigation.items().length - 1, { focus: false });
        break;
      case undefined:
        break;
    }
  };

  const requestedItem = (request: Exclude<MenuFocusRequest, 'none'>): HTMLElement | null => {
    const items = navigation.items();
    return (request === 'first' ? items[0] : items.at(-1)) ?? null;
  };

  const focusOnOpen = (): void => {
    const request = opening.take();

    focusElement(
      request === undefined
        ? options.content.value
        : (navigation.activeElement() ?? requestedItem(request)),
    );
  };

  const onClosed = (): void => {
    if (inside) {
      inside = false;
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
        pointer = false;
        if (event.key === 'Tab') {
          context.closeAll();
          return;
        }
        navigation.onKeydown(event);
      },
      onFocusin: (event) => {
        inside = true;
        navigation.onFocusin(event);
      },
      onFocusout: (event) => {
        if (within(event.relatedTarget)) {
          return;
        }
        inside = false;
        if (options.open.value) {
          close();
        }
      },
      onPointermove: (event) => {
        const item = itemAt(event.target);
        if (item && item !== navigation.activeElement() && navigation.has(item)) {
          pointer = true;
          navigation.setActive(item);
        }
      },
      onPointerleave: () => {
        if (!pointer || holdsOpenSubmenu(navigation.activeElement())) {
          return;
        }
        pointer = false;
        navigation.reset();
        focusElement(options.content.value);
      },
    },
  };
};
