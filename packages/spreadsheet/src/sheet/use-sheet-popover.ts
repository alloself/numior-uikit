import { PopoverState } from '@numior/primitives';
import { ref, shallowRef, useId, type ComponentPublicInstance } from 'vue';
import type { SheetPopover, SheetPopoverOptions } from './sheet.types';

export const useSheetPopover = (options: SheetPopoverOptions): SheetPopover => {
  const open = ref(false);
  const shown = ref(false);
  const titleId = useId();
  const anchor = shallowRef<HTMLElement>();

  const holdAnchor = (element: Element | ComponentPublicInstance | null): void => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    anchor.value = element;
  };

  const show = (): void => {
    shown.value = true;
    open.value = true;
  };

  const hide = (): void => {
    open.value = false;
    options.back();
  };

  const setOpen = (next: boolean): void => {
    open.value = next;
  };

  const onToggle = (event: Event): void => {
    if (!('newState' in event)) {
      return;
    }
    if (event.newState === PopoverState.Open) {
      options.focusStart();
      return;
    }

    shown.value = false;
    options.closed();
  };

  return { open, shown, titleId, anchor, holdAnchor, show, hide, setOpen, onToggle };
};
