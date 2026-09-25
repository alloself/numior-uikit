import { ref, watch, type ComputedRef, type Ref } from 'vue';
import { formatDateText, parseDateText } from '@numior/primitives';

export interface DateTextOptions {
  readonly value: () => string | null;
  readonly locale: ComputedRef<string>;
  readonly commit: (date: string | null) => void;
}

export interface DateText {
  readonly draft: Ref<string>;
  input(text: string): void;
  settle(): void;
}

export const useDateText = (options: DateTextOptions): DateText => {
  const display = (value: string | null): string =>
    value === null ? '' : formatDateText(value, options.locale.value);

  const draft = ref(display(options.value()));

  watch(
    () => [options.value(), options.locale.value],
    () => {
      const value = options.value();

      if (parseDateText(draft.value, options.locale.value) !== value) {
        draft.value = display(value);
      }
    },
  );

  const input = (text: string): void => {
    draft.value = text;
    const parsed = parseDateText(text, options.locale.value);

    if (parsed !== null) {
      options.commit(parsed);
    } else if (text.trim() === '') {
      options.commit(null);
    }
  };

  const settle = (): void => {
    const parsed = parseDateText(draft.value, options.locale.value);

    if (parsed === null && draft.value.trim() !== '') {
      draft.value = display(options.value());
    } else if (parsed !== null) {
      draft.value = display(parsed);
    }
  };

  return { draft, input, settle };
};
