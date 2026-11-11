import { useEventListener } from '@vueuse/core';
import { Key, PointerType, useDelayedOpen } from '@numior/primitives';
import { computed, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';
import type { NuiPopoverHoverAttrs } from './popover.types';

export interface HoverTriggerOptions {
  readonly open: Ref<boolean>;
  readonly enabled: () => boolean;
  readonly openDelay: MaybeRefOrGetter<number>;
  readonly closeDelay: MaybeRefOrGetter<number>;
  readonly content: () => HTMLElement | null;
  readonly trigger: () => HTMLElement | null;
}

export interface HoverTrigger {
  readonly triggerAttrs: ComputedRef<NuiPopoverHoverAttrs>;
  readonly contentAttrs: ComputedRef<NuiPopoverHoverAttrs>;
}

const POINTER_FOCUS_WINDOW = 500;

const within = (target: EventTarget | null, ...roots: readonly (HTMLElement | null)[]): boolean =>
  target instanceof Node && roots.some((root) => root?.contains(target) === true);

const pageDocument = (): Document | undefined =>
  typeof document === 'undefined' ? undefined : document;

export const useHoverTrigger = (options: HoverTriggerOptions): HoverTrigger => {
  const delay = useDelayedOpen(options.open, {
    openDelay: options.openDelay,
    closeDelay: options.closeDelay,
  });

  let pointerPressedAt = 0;
  let returning = false;

  const onPointerenter = (event: PointerEvent): void => {
    if (event.pointerType === PointerType.Touch) {
      return;
    }
    delay.scheduleOpen();
  };

  const onPointerleave = (event: PointerEvent): void => {
    if (event.pointerType === PointerType.Touch) {
      return;
    }

    delay.scheduleClose();
  };

  const onPointerdown = (event: PointerEvent): void => {
    pointerPressedAt = Date.now();

    if (event.pointerType !== PointerType.Touch) {
      return;
    }

    if (options.open.value) {
      delay.closeNow();
    } else {
      delay.openNow();
    }
  };

  const onFocus = (): void => {
    if (returning) {
      returning = false;
    } else if (Date.now() - pointerPressedAt > POINTER_FOCUS_WINDOW) {
      delay.openNow();
    }
  };

  const onFocusout = (event: FocusEvent): void => {
    if (within(event.relatedTarget, options.content(), options.trigger())) {
      return;
    }

    delay.closeNow();
  };

  const onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key !== Key.Escape || !options.open.value) {
      return;
    }
    delay.closeNow();

    if (!within(document.activeElement, options.content())) {
      return;
    }

    returning = true;
    options.trigger()?.focus();
  };

  useEventListener(
    () => (options.enabled() && options.open.value ? pageDocument() : undefined),
    'keydown',
    onDocumentKeydown,
  );

  const triggerAttrs = computed<NuiPopoverHoverAttrs>(() =>
    options.enabled() ? { onPointerenter, onPointerleave, onPointerdown, onFocus, onFocusout } : {},
  );

  const contentAttrs = computed<NuiPopoverHoverAttrs>(() =>
    options.enabled()
      ? {
          onPointerenter: () => {
            delay.cancel();
          },
          onPointerleave,
          onFocusout,
        }
      : {},
  );

  return { triggerAttrs, contentAttrs };
};
