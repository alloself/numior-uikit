import {
  computed,
  onMounted,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import { useControlId } from '../id/useControlId';
import { PopoverMode, PopoverState } from './popover.types';

export interface PopoverOptions {
  readonly open: Ref<boolean>;
  readonly id?: MaybeRefOrGetter<string | undefined>;
  readonly mode?: MaybeRefOrGetter<PopoverMode | undefined>;
}

export interface PopoverContentAttrs {
  readonly id: string;
  readonly popover: PopoverMode;
  readonly onBeforetoggle: (event: Event) => void;
}

export interface PopoverInvokerAttrs {
  readonly popovertarget: string;
  readonly 'aria-expanded': 'true' | 'false';
  readonly 'aria-controls': string;
}

export interface PopoverControl {
  readonly id: ComputedRef<string>;
  readonly open: ComputedRef<boolean>;
  readonly contentAttrs: ComputedRef<PopoverContentAttrs>;
  readonly invokerAttrs: ComputedRef<PopoverInvokerAttrs>;
  show(): void;
  hide(): void;
  toggle(): void;
  raise(): void;
}

const canToggle = (element: HTMLElement | null | undefined): element is HTMLElement =>
  element !== null &&
  element !== undefined &&
  typeof element.showPopover === 'function' &&
  element.isConnected;

const focusLeftIn = (element: HTMLElement): boolean => {
  const active = document.activeElement;

  return active === null || active === document.body || element.contains(active);
};

const canFocus = (opener: Element | null): opener is HTMLElement =>
  opener instanceof HTMLElement && opener.isConnected;

const concealed = (element: HTMLElement, opener: Element | null): void => {
  const held = element.contains(document.activeElement);

  element.hidePopover();

  const orphaned = held && focusLeftIn(element);

  if (!orphaned || !canFocus(opener)) {
    return;
  }

  opener.focus({ preventScroll: true });
};

export const usePopover = (
  content: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: PopoverOptions,
): PopoverControl => {
  const id = useControlId(options.id);
  const mode = computed<PopoverMode>(() => toValue(options.mode) ?? PopoverMode.Auto);
  let shown: HTMLElement | undefined;
  let opener: Element | null = null;

  const setOpen = (next: boolean): void => {
    if (options.open.value === next) {
      return;
    }

    options.open.value = next;
  };

  const sync = (next: boolean): void => {
    const element = toValue(content);
    if (!canToggle(element)) {
      return;
    }
    if (next && shown !== element) {
      element.showPopover();
    } else if (!next && shown === element) {
      concealed(element, opener);
    }
  };

  onMounted(() => {
    watch([() => options.open.value, () => toValue(content)], ([next]) => sync(next), {
      immediate: true,
      flush: 'post',
    });
  });

  const hide = (): void => {
    const element = toValue(content);

    if (canToggle(element) && shown === element) {
      concealed(element, opener);
    }
    setOpen(false);
  };

  const raise = (): void => {
    const element = toValue(content);
    if (!canToggle(element) || shown !== element) {
      return;
    }
    element.hidePopover();
    element.showPopover();
  };

  const onBeforetoggle = (event: Event): void => {
    const next = 'newState' in event && event.newState === PopoverState.Open;
    shown = next ? (toValue(content) ?? undefined) : undefined;
    opener = next ? document.activeElement : null;
    setOpen(next);
  };

  return {
    id,
    open: computed(() => options.open.value),
    contentAttrs: computed(() => ({ id: id.value, popover: mode.value, onBeforetoggle })),
    invokerAttrs: computed(() => ({
      popovertarget: id.value,
      'aria-expanded': options.open.value ? 'true' : 'false',
      'aria-controls': id.value,
    })),
    show: () => setOpen(true),
    hide,
    toggle: () => {
      if (options.open.value) {
        hide();
        return;
      }

      setOpen(true);
    },
    raise,
  };
};
