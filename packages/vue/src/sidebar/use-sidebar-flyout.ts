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
  useDelayedOpen,
  useDirection,
  useFloating,
  useListNavigation,
  usePopover,
  type PopoverContentAttrs,
} from '@numior/primitives';

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

type Landing = 'first';

const OPEN_DELAY = 100;
const CLOSE_DELAY = 300;
const OFFSET = 4;

export const useSidebarFlyout = (options: SidebarFlyoutOptions): SidebarFlyout => {
  const open = ref(false);
  const direction = useDirection(options.trigger);
  const landing = createIntent<Landing>();

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

  const navigation = useListNavigation(options.content, {
    selector: '.nui-list-item__action',
    loop: () => true,
    typeahead: () => false,
  });

  const forwardKey = (): string => (direction.isRtl() ? 'ArrowLeft' : 'ArrowRight');
  const backKey = (): string => (direction.isRtl() ? 'ArrowRight' : 'ArrowLeft');

  const holdsFocus = (): boolean => {
    const content = options.content.value;
    return content !== null && content.contains(document.activeElement);
  };

  const closeAndReturn = (): void => {
    delay.closeNow();
    options.trigger.value?.focus({ preventScroll: true });
  };

  const onTriggerPointerenter = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') {
      delay.scheduleOpen();
    }
  };

  const onTriggerKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && open.value) {
      event.preventDefault();
      delay.closeNow();
      return;
    }
    if (event.key === forwardKey() || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      landing.set('first');
      delay.openNow();
    }
  };

  const onContentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' || event.key === backKey()) {
      event.preventDefault();
      closeAndReturn();
      return;
    }
    if (event.key === 'Tab') {
      delay.closeNow();
      return;
    }
    navigation.onKeydown(event);
  };

  const onContentFocusout = (event: FocusEvent): void => {
    const next = event.relatedTarget;

    const within =
      next instanceof Node &&
      (options.content.value?.contains(next) === true ||
        options.trigger.value?.contains(next) === true);

    if (!within) {
      delay.closeNow();
    }
  };

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
          if (landing.take() === 'first') {
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
      onPointerleave: () => delay.scheduleClose(),
      onKeydown: onTriggerKeydown,
    },
    contentHandlers: {
      onPointerenter: () => delay.cancel(),
      onPointerleave: () => delay.scheduleClose(),
      onKeydown: onContentKeydown,
      onFocusout: onContentFocusout,
    },
    toggle: () => {
      if (open.value) {
        delay.closeNow();
      } else {
        delay.openNow();
      }
    },
    dismiss: () => delay.closeNow(),
  };
};
