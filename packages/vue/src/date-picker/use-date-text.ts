import { ref, watch, type ComputedRef, type Ref } from 'vue';
import {
  formatDateText,
  formatTimeModel,
  joinDateTime,
  parseDateText,
  parseTime,
  splitDateTime,
} from '@numior/primitives';

export interface DateTextOptions {
  readonly value: () => string | null;
  readonly locale: ComputedRef<string>;
  readonly time: () => boolean;
  readonly accepts: (date: string) => boolean;
  readonly commit: (date: string | null) => void;
}

export interface DateText {
  readonly draft: Ref<string>;
  input(text: string): void;
  settle(): void;
}

const displayDateTime = (value: string, locale: string): string => {
  const parts = splitDateTime(value);

  return parts ? `${formatDateText(parts.date, locale)} ${parts.time}` : '';
};

const parseDateTimeText = (text: string, locale: string, fallback: string): string | null => {
  const trimmed = text.trim();
  const at = trimmed.search(/\s\S+$/u);
  const datePart = at < 0 ? trimmed : trimmed.slice(0, at);
  const timePart = at < 0 ? fallback : trimmed.slice(at + 1);
  const date = parseDateText(datePart, locale);
  const time = parseTime(timePart);

  return date && time ? joinDateTime(date, formatTimeModel(time, false)) : null;
};

export const useDateText = (options: DateTextOptions): DateText => {
  const display = (value: string | null): string => {
    if (value === null) {
      return '';
    }

    return options.time()
      ? displayDateTime(value, options.locale.value)
      : formatDateText(value, options.locale.value);
  };

  const parseAny = (text: string): string | null => {
    if (!options.time()) {
      return parseDateText(text, options.locale.value);
    }

    const current = splitDateTime(options.value())?.time ?? '00:00';

    return parseDateTimeText(text, options.locale.value, current);
  };

  const parse = (text: string): string | null => {
    const parsed = parseAny(text);

    if (parsed === null) {
      return null;
    }

    return options.accepts(splitDateTime(parsed)?.date ?? parsed) ? parsed : null;
  };

  const draft = ref(display(options.value()));

  watch(
    () => [options.value(), options.locale.value],
    () => {
      const value = options.value();

      if (parse(draft.value) !== value) {
        draft.value = display(value);
      }
    },
  );

  const input = (text: string): void => {
    draft.value = text;
    const parsed = parse(text);

    if (parsed !== null) {
      options.commit(parsed);
    } else if (text.trim() === '') {
      options.commit(null);
    }
  };

  const settle = (): void => {
    const parsed = parse(draft.value);

    if (parsed === null && draft.value.trim() !== '') {
      draft.value = display(options.value());
    } else if (parsed !== null) {
      draft.value = display(parsed);
    }
  };

  return { draft, input, settle };
};
