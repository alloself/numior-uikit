import { isIsoDate } from './iso';

export interface DateTimeParts {
  readonly date: string;
  readonly time: string;
}

const DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)$/;

export const splitDateTime = (value: string | null | undefined): DateTimeParts | null => {
  const match = DATE_TIME_PATTERN.exec(value ?? '');

  if (!match || !isIsoDate(match[1])) {
    return null;
  }

  return { date: match[1] ?? '', time: match[2] ?? '' };
};

export const joinDateTime = (date: string, time: string): string => `${date}T${time}`;
