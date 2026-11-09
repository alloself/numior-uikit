import { onMounted, watch, type Ref } from 'vue';
import { PopoverState } from '@numior/primitives';

export interface ShownPopover {
  readonly onToggle: (event: Event) => void;
}

export const takeFocus = (element: HTMLElement | null | undefined): boolean => {
  if (element === null || element === undefined) {
    return false;
  }

  element.focus({ preventScroll: true });

  return element.ownerDocument.activeElement === element;
};

export const useShownPopover = (
  open: Readonly<Ref<boolean>>,
  settle: () => boolean,
): ShownPopover => {
  let owed = false;

  const attempt = (): void => {
    if (owed && settle()) {
      owed = false;
    }
  };

  watch(open, (isOpen) => {
    owed = isOpen;
  });

  onMounted(() => {
    watch(
      open,
      (isOpen) => {
        if (isOpen) {
          attempt();
        }
      },
      { flush: 'post' },
    );
  });

  return {
    onToggle: (event) => {
      if ('newState' in event && event.newState === PopoverState.Open) {
        attempt();
      }
    },
  };
};
