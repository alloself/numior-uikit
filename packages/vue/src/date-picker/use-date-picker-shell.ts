import { ref, useTemplateRef, watch, type ComputedRef, type Ref } from 'vue';
import {
  useFieldContext,
  useFieldControl,
  useLocale,
  useMessages,
  useSplitAttrs,
  type FieldContext,
  type FieldControlAttrs,
  type FieldControlProps,
  type FloatingPlacement,
  type SplitAttrs,
} from '@numior/primitives';
import { datePickerMessages, type NuiDatePickerMessages } from './date-picker.messages';
import { usePickerPopover, type PickerPopover } from './use-picker-popover';

export interface DatePickerShellOptions {
  readonly control: () => FieldControlProps;
  readonly locale: () => string | undefined;
  readonly placement: () => FloatingPlacement;
  readonly readonly: () => boolean;
  readonly focusDate: () => string | null;
}

export interface DatePickerExposed {
  focus(): void;
  open(): void;
  close(): void;
}

export interface DatePickerShell {
  readonly split: SplitAttrs;
  readonly field: FieldContext | null;
  readonly controlAttrs: ComputedRef<FieldControlAttrs>;
  readonly isInvalid: ComputedRef<boolean>;
  readonly isDisabled: ComputedRef<boolean>;
  readonly locale: ComputedRef<string>;
  readonly messages: ComputedRef<NuiDatePickerMessages>;
  readonly month: Ref<string | undefined>;
  readonly popover: PickerPopover;
  readonly exposed: DatePickerExposed;
  focusInput(): void;
  onInputKeydown(event: KeyboardEvent): void;
}

export const useDatePickerShell = (options: DatePickerShellOptions): DatePickerShell => {
  const control = useFieldControl(options.control);
  const locale = useLocale(options.locale);
  const frame = useTemplateRef<{ root: HTMLElement | null }>('frame');
  const input = useTemplateRef<{ focus: () => void }>('input');
  const calendar = useTemplateRef<{ focus: (date?: string) => void }>('calendar');

  const focusInput = (): void => {
    input.value?.focus();
  };

  const popover = usePickerPopover({
    anchor: () => frame.value?.root ?? null,
    id: () => `${control.attrs.value.id}-panel`,
    placement: options.placement,
    returnFocus: focusInput,
  });

  const canOpen = (): boolean =>
    !popover.open.value && !options.readonly() && !control.disabled.value;

  const onInputKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' && canOpen()) {
      event.preventDefault();
      popover.show();
    } else if (event.key === 'Escape' && popover.open.value) {
      event.preventDefault();
      popover.hide({ focus: true });
    }
  };

  watch(popover.open, (isOpen) => {
    if (isOpen) {
      calendar.value?.focus(options.focusDate() ?? undefined);
    }
  });

  return {
    split: useSplitAttrs(),
    field: useFieldContext(),
    controlAttrs: control.attrs,
    isInvalid: control.invalid,
    isDisabled: control.disabled,
    locale,
    messages: useMessages(datePickerMessages, locale),
    month: ref<string>(),
    popover,
    exposed: { focus: focusInput, open: () => popover.show(), close: () => popover.hide() },
    focusInput,
    onInputKeydown,
  };
};
