import { toValue, type ComputedRef, type MaybeRefOrGetter, type Ref, type ShallowRef } from 'vue';
import {
  useFloating,
  useListNavigation,
  usePopover,
  type FloatingPlacement,
  type ListFocusMode,
  type ListNavigation,
  type PopoverControl,
  type PopoverMode,
} from '@numior/primitives';
import { useTriggerElement, type NuiTriggerRef } from './trigger-ref';

export interface ListboxSurfaceOptions {
  readonly anchor: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly open: Ref<boolean>;
  readonly id: MaybeRefOrGetter<string>;
  readonly mode: PopoverMode;
  readonly placement: MaybeRefOrGetter<FloatingPlacement>;
  readonly maxBlockSize?: number | undefined;
  readonly focus?: ListFocusMode | undefined;
  readonly loop: MaybeRefOrGetter<boolean>;
  readonly typeahead: boolean;
  readonly restOnSelected: boolean;
}

export interface ListboxSurface {
  readonly listboxElement: ShallowRef<HTMLElement | null>;
  readonly setListbox: NuiTriggerRef;
  readonly control: PopoverControl;
  readonly floatingStyles: ComputedRef<Record<string, string>>;
  readonly navigation: ListNavigation;
  activateHovered(event: PointerEvent): void;
}

const selectedOptionIn = (container: HTMLElement | null): HTMLElement | null => {
  const found = container?.querySelector('[role="option"][aria-selected="true"]');
  return found instanceof HTMLElement ? found : null;
};

export const useListboxSurface = (options: ListboxSurfaceOptions): ListboxSurface => {
  const { trigger: listboxElement, setTrigger: setListbox } = useTriggerElement();

  const control = usePopover(listboxElement, {
    open: options.open,
    id: options.id,
    mode: options.mode,
  });

  const { floatingStyles } = useFloating(options.anchor, listboxElement, {
    placement: () => toValue(options.placement),
    offset: 4,
    size: { matchWidth: true, fitHeight: true, maxBlockSize: options.maxBlockSize },
    enabled: options.open,
  });

  const navigation = useListNavigation(listboxElement, {
    selector: '[role="option"]',
    mode: options.focus,
    loop: () => toValue(options.loop),
    typeahead: options.typeahead,
    ...(options.restOnSelected ? { resting: () => selectedOptionIn(listboxElement.value) } : {}),
  });

  const activateHovered = (event: PointerEvent): void => {
    const option =
      event.target instanceof HTMLElement ? event.target.closest('[role="option"]') : null;

    if (option instanceof HTMLElement && option !== navigation.activeElement()) {
      navigation.setActive(option);
    }
  };

  return { listboxElement, setListbox, control, floatingStyles, navigation, activateHovered };
};
