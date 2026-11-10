import { useEventListener } from '@vueuse/core';
import {
  computed,
  onMounted,
  ref,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
  type ShallowRef,
} from 'vue';
import {
  createIntent,
  Key,
  ListMove,
  PointerType,
  useDelayedOpen,
  useDirection,
  useFloating,
  useListNavigation,
  usePopover,
  type PopoverContentAttrs,
} from '@numior/primitives';
import { provideListItems } from '../list/list-context';
import { createListItems } from '../list/list-items';

export interface SidebarFlyoutOptions {
  readonly enabled: Readonly<Ref<boolean>>;
  readonly id: MaybeRefOrGetter<string | undefined>;
  readonly trigger: Readonly<Ref<HTMLElement | null>>;
  readonly content: Readonly<ShallowRef<HTMLElement | null>>;
}

export interface SidebarFlyoutTriggerHandlers {
  readonly onPointerenter: (event: PointerEvent) => void;
  readonly onPointerleave: () => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
}

export interface SidebarFlyoutContentHandlers {
  readonly onPointerenter: () => void;
  readonly onPointerleave: () => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly onFocusout: (event: FocusEvent) => void;
}

export interface SidebarFlyout {
  readonly open: Readonly<Ref<boolean>>;
  readonly id: ComputedRef<string>;
  readonly contentAttrs: ComputedRef<PopoverContentAttrs>;
  readonly triggerHandlers: SidebarFlyoutTriggerHandlers;
  readonly contentHandlers: SidebarFlyoutContentHandlers;
  toggle(): void;
  dismiss(): void;
}

const OPEN_DELAY = 100;
const CLOSE_DELAY = 300;
const OFFSET = 4;

const pageDocument = (): Document | undefined =>
  typeof document === 'undefined' ? undefined : document;

export const useSidebarFlyout = (options: SidebarFlyoutOptions): SidebarFlyout => {
  const open = ref(false);
  const direction = useDirection(options.trigger);
  const landing = createIntent<typeof ListMove.First>();
  let pinned = false;

  const popover = usePopover(options.content, { open, id: options.id, mode: 'manual' });

  const delay = useDelayedOpen(open, {
    openDelay: () => OPEN_DELAY,
    closeDelay: () => CLOSE_DELAY,
  });

  useFloating(options.trigger, options.content, {
    placement: () => (direction.isRtl() ? 'left-start' : 'right-start'),
    offset: () => OFFSET,
    enabled: open,
  });

  const items = createListItems();

  provideListItems(items);

  const navigation = useListNavigation(options.content, {
    items: items.elements.elements,
    loop: () => true,
    typeahead: () => false,
  });

  const forwardKey = (): string => (direction.isRtl() ? Key.ArrowLeft : Key.ArrowRight);
  const backKey = (): string => (direction.isRtl() ? Key.ArrowRight : Key.ArrowLeft);

  const holds = (target: EventTarget | null): boolean =>
    target instanceof Node &&
    (options.content.value?.contains(target) === true ||
      options.trigger.value?.contains(target) === true);

  const holdsFocus = (): boolean => {
    const content = options.content.value;
    return content !== null && content.contains(document.activeElement);
  };

  const pin = (): void => {
    pinned = true;
    delay.openNow();
  };

  const leave = (): void => {
    if (!pinned) {
      delay.scheduleClose();
    }
  };

  const closeAndReturn = (): void => {
    delay.closeNow();
    options.trigger.value?.focus({ preventScroll: true });
  };

  const onTriggerPointerenter = (event: PointerEvent): void => {
    if (event.pointerType !== PointerType.Touch) {
      delay.scheduleOpen();
    }
  };

  const onTriggerKeydown = (event: KeyboardEvent): void => {
    if (event.key === Key.Escape && open.value) {
      event.preventDefault();
      delay.closeNow();
      return;
    }
    if (event.key !== forwardKey() && event.key !== Key.Enter && event.key !== Key.Space) {
      return;
    }

    event.preventDefault();
    landing.set(ListMove.First);
    pin();
  };

  const onContentKeydown = (event: KeyboardEvent): void => {
    if (event.key === Key.Escape || event.key === backKey()) {
      event.preventDefault();
      closeAndReturn();
      return;
    }
    if (event.key === Key.Tab) {
      delay.closeNow();
      return;
    }
    navigation.onKeydown(event);
  };

  const onContentFocusout = (event: FocusEvent): void => {
    if (!holds(event.relatedTarget)) {
      delay.closeNow();
    }
  };

  const onPagePointerdown = (event: PointerEvent): void => {
    if (!holds(event.target)) {
      delay.closeNow();
    }
  };

  useEventListener(
    () => (open.value ? pageDocument() : undefined),
    'pointerdown',
    onPagePointerdown,
    {
      capture: true,
    },
  );

  watch(
    open,
    (isOpen) => {
      if (!isOpen) {
        pinned = false;
      }
    },
    { flush: 'sync' },
  );

  watch(options.enabled, (isEnabled) => {
    if (!isEnabled) {
      delay.closeNow();
    }
  });

  onMounted(() => {
    watch(
      open,
      (isOpen) => {
        if (isOpen) {
          if (landing.take() === ListMove.First) {
            navigation.focusFirst();
          }
        } else if (holdsFocus()) {
          options.trigger.value?.focus({ preventScroll: true });
        }
      },
      { flush: 'post' },
    );
  });

  return {
    open: computed(() => open.value),
    id: popover.id,
    contentAttrs: popover.contentAttrs,
    triggerHandlers: {
      onPointerenter: onTriggerPointerenter,
      onPointerleave: leave,
      onKeydown: onTriggerKeydown,
    },
    contentHandlers: {
      onPointerenter: () => delay.cancel(),
      onPointerleave: leave,
      onKeydown: onContentKeydown,
      onFocusout: onContentFocusout,
    },
    toggle: () => {
      if (open.value && pinned) {
        delay.closeNow();
      } else {
        pin();
      }
    },
    dismiss: () => delay.closeNow(),
  };
};
