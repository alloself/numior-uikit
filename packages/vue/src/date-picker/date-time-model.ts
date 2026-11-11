import { isIsoDate, splitDateTime, type DateTimeParts } from '@numior/primitives';

const MIDNIGHT = '00:00';

export const dateTimeParts = (value: string | null): DateTimeParts | null => {
  const parts = splitDateTime(value);

  if (parts !== null) {
    return parts;
  }

  return value !== null && isIsoDate(value) ? { date: value, time: MIDNIGHT } : null;
};
