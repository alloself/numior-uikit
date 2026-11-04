import { ref, useTemplateRef, watch, type ComputedRef, type Ref } from 'vue';
import {
  createIntent,
  Key,
  useFieldControl,
  useLocale,
  useMessages,
  useSplitAttrs,
  type FieldContext,
  type FieldControlAttrs,
  type FieldControlProps,
  type FieldFrame,
  type FloatingPlacement,
  type SplitAttrs,
} from '@numior/primitives';
import { datePickerMessages, type NuiDatePickerMessages } from './date-picker.messages';
import { usePickerPopover, type PickerPopover } from './use-picker-popover';

export interface DatePickerShellOptions {
  readonly control: () => FieldControlProps;
  readonly locale: () => string | undefined;
  readonly placement: () => FloatingPlacement;
  readonly focusDate: () => string | null;
  readonly openOnClick: () => boolean;
}

export interface DatePickerExposed {
  focus(): void;
  open(): void;
  close(): void;
}

export interface DatePickerShell {
  readonly split: SplitAttrs;
  readonly field: ComputedRef<FieldContext | null>;
  readonly fieldFrame: ComputedRef<FieldFrame>;
  readonly controlAttrs: ComputedRef<FieldControlAttrs>;
  readonly isInvalid: ComputedRef<boolean>;
  readonly isDisabled: ComputedRef<boolean>;
  readonly isReadonly: ComputedRef<boolean>;
  readonly locale: ComputedRef<string>;
  readonly messages: ComputedRef<NuiDatePickerMessages>;
  readonly month: Ref<string | undefined>;
  readonly popover: PickerPopover;
  readonly exposed: DatePickerExposed;
  focusInput(): void;
  onInputKeydown(event: KeyboardEvent): void;
  onInputClick(): void;
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

  const keepFocus = createIntent<true>();

  const canOpen = (): boolean =>
    !popover.open.value && !control.readonly.value && !control.disabled.value;

  const focusCalendar = (): void => {
    calendar.value?.focus(options.focusDate() ?? undefined);
  };

  const onInputKeydown = (event: KeyboardEvent): void => {
    if (event.key === Key.ArrowDown && canOpen()) {
      event.preventDefault();
      popover.show();
    } else if (event.key === Key.ArrowDown && popover.open.value) {
      event.preventDefault();
      focusCalendar();
    } else if (event.key === Key.Escape && popover.open.value) {
      event.preventDefault();
      popover.hide({ focus: true });
    }
  };

  const onInputClick = (): void => {
    if (options.openOnClick() && canOpen()) {
      keepFocus.set(true);
      popover.show();
    }
  };

  watch(popover.open, (isOpen) => {
    const quiet = keepFocus.take() === true;

    if (isOpen && !quiet) {
      focusCalendar();
    }
  });

  return {
    split: useSplitAttrs(),
    field: control.field,
    fieldFrame: control.frame,
    controlAttrs: control.attrs,
    isInvalid: control.invalid,
    isDisabled: control.disabled,
    isReadonly: control.readonly,
    locale,
    messages: useMessages(datePickerMessages, locale),
    month: ref<string>(),
    popover,
    exposed: { focus: focusInput, open: () => popover.show(), close: () => popover.hide() },
    focusInput,
    onInputKeydown,
    onInputClick,
  };
};
