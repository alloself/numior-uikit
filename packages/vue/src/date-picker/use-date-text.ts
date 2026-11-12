import { ref, watch, type ComputedRef, type Ref } from 'vue';
import {
  createIntent,
  formatDateText,
  formatTimeModel,
  joinDateTime,
  parseDateText,
  parseTime,
  splitDateTime,
} from '@numior/primitives';
import { dateTimeParts } from './date-time-model';

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
  tidy(text: string): string | undefined;
}

const displayDateTime = (value: string, locale: string): string => {
  const parts = dateTimeParts(value);

  return parts ? `${formatDateText(parts.date, locale)} ${parts.time}` : '';
};

const displayDate = (value: string, locale: string): string =>
  formatDateText(dateTimeParts(value)?.date ?? value, locale);

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
      : displayDate(value, options.locale.value);
  };

  const parseAny = (text: string): string | null => {
    if (!options.time()) {
      return parseDateText(text, options.locale.value);
    }

    const current = dateTimeParts(options.value())?.time ?? '00:00';

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
  const echo = createIntent<string | null>();

  watch(
    () => [options.value(), options.locale.value],
    () => {
      const value = options.value();

      if (echo.take() !== value && parse(draft.value) !== value) {
        draft.value = display(value);
      }
    },
  );

  const commit = (value: string | null): void => {
    echo.set(value);
    options.commit(value);
  };

  const input = (text: string): void => {
    draft.value = text;
    const parsed = parse(text);

    if (parsed !== null) {
      commit(parsed);
    } else if (text.trim() === '') {
      commit(null);
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

  const tidy = (text: string): string | undefined => {
    const parsed = parseAny(text);

    return parsed === null ? undefined : display(parsed);
  };

  return { draft, input, settle, tidy };
};
