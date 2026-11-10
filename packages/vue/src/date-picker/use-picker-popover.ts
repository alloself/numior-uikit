import { ref, toValue, type MaybeRefOrGetter, type Ref, type ShallowRef } from 'vue';
import {
  FLOATING_OFFSET,
  useFloating,
  usePopover,
  type FloatingPlacement,
  type PopoverControl,
} from '@numior/primitives';
import { useTriggerElement, type NuiTriggerRef } from '../shared/trigger-ref';

export interface PickerPopoverOptions {
  readonly anchor: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly id: MaybeRefOrGetter<string>;
  readonly placement: MaybeRefOrGetter<FloatingPlacement>;
  readonly returnFocus: () => void;
}

export interface HideOptions {
  readonly focus?: boolean | undefined;
}

export interface PickerPopover {
  readonly open: Ref<boolean>;
  readonly panelElement: ShallowRef<HTMLElement | null>;
  readonly setPanel: NuiTriggerRef;
  readonly control: PopoverControl;
  show(): void;
  hide(options?: HideOptions): void;
  toggle(): void;
  contains(node: unknown): boolean;
  onFocusout(event: FocusEvent): void;
}

export const usePickerPopover = (options: PickerPopoverOptions): PickerPopover => {
  const open = ref(false);
  const { trigger: panelElement, setTrigger: setPanel } = useTriggerElement();
  const control = usePopover(panelElement, { open, id: options.id, mode: 'manual' });

  useFloating(options.anchor, panelElement, {
    placement: () => toValue(options.placement),
    offset: FLOATING_OFFSET,
    size: { fitHeight: true },
    enabled: open,
  });

  const contains = (node: unknown): boolean =>
    node instanceof Node &&
    (toValue(options.anchor)?.contains(node) === true ||
      panelElement.value?.contains(node) === true);

  const hide = ({ focus = false }: HideOptions = {}): void => {
    if (!open.value) {
      return;
    }

    control.hide();

    if (focus) {
      options.returnFocus();
    }
  };

  const onFocusout = (event: FocusEvent): void => {
    if (contains(event.relatedTarget)) {
      return;
    }

    if (event.relatedTarget !== null) {
      hide();

      return;
    }

    queueMicrotask(() => {
      if (!contains(document.activeElement)) {
        hide();
      }
    });
  };

  return {
    open,
    panelElement,
    setPanel,
    control,
    show: () => control.show(),
    hide,
    toggle: () => (open.value ? hide({ focus: true }) : control.show()),
    contains,
    onFocusout,
  };
};
