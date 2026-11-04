import {
  computed,
  onMounted,
  ref,
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

export const usePopover = (
  content: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: PopoverOptions,
): PopoverControl => {
  const id = useControlId(options.id);
  const mode = computed<PopoverMode>(() => toValue(options.mode) ?? PopoverMode.Auto);
  const visible = ref(false);

  const setOpen = (next: boolean): void => {
    if (options.open.value !== next) {
      options.open.value = next;
    }
  };

  const sync = (next: boolean): void => {
    const element = toValue(content);
    if (!canToggle(element)) {
      return;
    }
    if (next && !visible.value) {
      element.showPopover();
    } else if (!next && visible.value) {
      element.hidePopover();
    }
  };

  onMounted(() => {
    watch(() => options.open.value, sync, { immediate: true, flush: 'post' });
  });

  const raise = (): void => {
    const element = toValue(content);
    if (!canToggle(element) || !visible.value) {
      return;
    }
    element.hidePopover();
    element.showPopover();
  };

  const onBeforetoggle = (event: Event): void => {
    const next = 'newState' in event && event.newState === PopoverState.Open;
    visible.value = next;
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
    hide: () => setOpen(false),
    toggle: () => setOpen(!options.open.value),
    raise,
  };
};
