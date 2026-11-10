import { toValue, type MaybeRefOrGetter, type Ref, type ShallowRef } from 'vue';
import {
  FLOATING_OFFSET,
  useFloating,
  useListNavigation,
  usePopover,
  type FloatingPlacement,
  type ListFocusMode,
  type ListNavigation,
  type PopoverControl,
  type PopoverMode,
} from '@numior/primitives';
import { provideListItems } from '../list/list-context';
import { createListItems } from '../list/list-items';
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
  readonly isSelected?: ((key: string) => boolean) | undefined;
}

export interface ListboxSurface {
  readonly listboxElement: ShallowRef<HTMLElement | null>;
  readonly setListbox: NuiTriggerRef;
  readonly control: PopoverControl;
  readonly navigation: ListNavigation;
  activateHovered(event: PointerEvent): void;
  restActive(): void;
}

export const useListboxSurface = (options: ListboxSurfaceOptions): ListboxSurface => {
  const { trigger: listboxElement, setTrigger: setListbox } = useTriggerElement();

  const control = usePopover(listboxElement, {
    open: options.open,
    id: options.id,
    mode: options.mode,
  });

  useFloating(options.anchor, listboxElement, {
    placement: () => toValue(options.placement),
    offset: FLOATING_OFFSET,
    size: { matchWidth: true, fitHeight: true, maxBlockSize: options.maxBlockSize },
    enabled: options.open,
  });

  const items = createListItems();

  provideListItems(items);

  const selected = options.isSelected;

  const navigation = useListNavigation(listboxElement, {
    items: items.elements.elements,
    mode: options.focus,
    loop: () => toValue(options.loop),
    typeahead: options.typeahead,
    ...(selected === undefined
      ? {}
      : { resting: () => items.elements.first((key) => typeof key === 'string' && selected(key)) }),
  });

  const activateHovered = (event: PointerEvent): void => {
    const option = navigation.itemFrom(event.target);

    if (option !== null && option !== navigation.activeElement()) {
      navigation.setActive(option);
    }
  };

  return {
    listboxElement,
    setListbox,
    control,
    navigation,
    activateHovered,
    restActive: () => navigation.reset(),
  };
};
