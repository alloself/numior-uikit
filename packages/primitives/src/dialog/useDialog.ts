import {
  computed,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import { Key } from '../keyboard/key.types';

export interface DialogOptions {
  readonly open: Ref<boolean>;
  readonly closable?: MaybeRefOrGetter<boolean | undefined>;
  readonly closeOnBackdrop?: MaybeRefOrGetter<boolean | undefined>;
  readonly onClose?: ((returnValue: string) => void) | undefined;
}

export interface DialogAttrs {
  readonly onCancel: (event: Event) => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly onClose: () => void;
  readonly onPointerdown: (event: PointerEvent) => void;
  readonly onClick: (event: MouseEvent) => void;
}

export interface DialogControl {
  readonly open: ComputedRef<boolean>;
  readonly covered: ComputedRef<boolean>;
  readonly returnValue: Readonly<Ref<string>>;
  readonly attrs: DialogAttrs;
  show(): void;
  close(returnValue?: string): void;
}

type DialogRef = MaybeRefOrGetter<HTMLDialogElement | null | undefined>;

interface RootLock {
  readonly overflow: string;
  readonly padding: string;
}

const OPEN_POPOVER = ':popover-open';

const modalCapable = (
  element: HTMLDialogElement | null | undefined,
): element is HTMLDialogElement =>
  element !== null && element !== undefined && typeof element.showModal === 'function';

const openModals = shallowRef<readonly HTMLDialogElement[]>([]);

let rootLock: RootLock | undefined;

const scrollbarWidth = (root: HTMLElement): number => window.innerWidth - root.clientWidth;

const lockRoot = (): void => {
  if (rootLock !== undefined || typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  if (root.scrollHeight <= root.clientHeight) {
    return;
  }
  const width = scrollbarWidth(root);

  rootLock = { overflow: root.style.overflow, padding: root.style.paddingInlineEnd };
  root.style.overflow = 'hidden';
  if (width > 0) {
    root.style.paddingInlineEnd = `${width}px`;
  }
};

const unlockRoot = (): void => {
  if (rootLock === undefined) {
    return;
  }
  const root = document.documentElement;
  root.style.overflow = rootLock.overflow;
  root.style.paddingInlineEnd = rootLock.padding;
  rootLock = undefined;
};

const track = (dialog: HTMLDialogElement, isOpen: boolean): void => {
  const others = openModals.value.filter((entry) => entry !== dialog);
  openModals.value = isOpen ? [...others, dialog] : others;
  if (openModals.value.length > 0) {
    lockRoot();
  } else {
    unlockRoot();
  }
};

const outside = (element: HTMLDialogElement, point: { clientX: number; clientY: number }) => {
  const rect = element.getBoundingClientRect();
  return (
    point.clientX < rect.left ||
    point.clientX > rect.right ||
    point.clientY < rect.top ||
    point.clientY > rect.bottom
  );
};

const holdsOpenPopover = (dialog: HTMLElement): boolean => {
  try {
    return dialog.querySelector(OPEN_POPOVER) !== null;
  } catch {
    return false;
  }
};

const ownsKey = (dialog: HTMLElement, event: KeyboardEvent): boolean =>
  event.target instanceof Element &&
  event.target.closest('dialog') === dialog &&
  !holdsOpenPopover(dialog);

export const useDialog = (element: DialogRef, options: DialogOptions): DialogControl => {
  const returnValue = ref('');
  const pressedOutside = ref(false);
  const closable = (): boolean => toValue(options.closable) !== false;
  const closeOnBackdrop = (): boolean => toValue(options.closeOnBackdrop) !== false;

  const sync = (next: boolean): void => {
    const dialog = toValue(element);
    if (!modalCapable(dialog)) {
      return;
    }
    if (next && !dialog.open) {
      dialog.showModal();
      track(dialog, true);
    } else if (!next && dialog.open) {
      dialog.close();
    }
  };

  onMounted(() => {
    watch(() => options.open.value, sync, { immediate: true, flush: 'post' });
  });

  onScopeDispose(() => {
    const dialog = toValue(element);
    if (dialog) {
      track(dialog, false);
    }
  });

  const close = (value?: string): void => {
    const dialog = toValue(element);
    if (modalCapable(dialog) && dialog.open) {
      dialog.close(value);
      return;
    }
    returnValue.value = value ?? '';
    options.open.value = false;
  };

  const attrs: DialogAttrs = {
    onCancel: (event) => {
      if (!closable()) {
        event.preventDefault();
      }
    },
    onKeydown: (event) => {
      const dialog = toValue(element);

      if (event.key === Key.Escape && !closable() && dialog && ownsKey(dialog, event)) {
        event.preventDefault();
      }
    },
    onClose: () => {
      const dialog = toValue(element);
      if (dialog) {
        track(dialog, false);
      }
      returnValue.value = dialog?.returnValue ?? '';
      options.open.value = false;
      options.onClose?.(returnValue.value);
    },
    onPointerdown: (event) => {
      const dialog = toValue(element);
      pressedOutside.value = Boolean(dialog && event.target === dialog && outside(dialog, event));
    },
    onClick: (event) => {
      const dialog = toValue(element);
      if (!dialog || event.target !== dialog || !pressedOutside.value || !outside(dialog, event)) {
        return;
      }
      pressedOutside.value = false;
      if (closable() && closeOnBackdrop()) {
        close();
      }
    },
  };

  return {
    open: computed(() => options.open.value),
    covered: computed(() => {
      const dialog = toValue(element);
      const index = dialog ? openModals.value.indexOf(dialog) : -1;
      return index >= 0 && index < openModals.value.length - 1;
    }),
    returnValue,
    attrs,
    show: () => {
      options.open.value = true;
    },
    close,
  };
};
