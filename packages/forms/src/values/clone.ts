import { toRaw } from 'vue';
import { isEqualValue } from './equal';
import { isPlainRecord } from './kinds';

const copyOf = (value: unknown): unknown => {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(copyOf);
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value instanceof Map) {
    return new Map([...value].map(([key, item]) => [key, copyOf(item)] as const));
  }
  if (value instanceof Set) {
    return new Set(value);
  }
  return isPlainRecord(value)
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyOf(item)] as const))
    : value;
};

const isCopyOf = <T>(copy: unknown, original: T): copy is T => isEqualValue(copy, original);

export const cloneValue = <T>(value: T): T => {
  const original = toRaw(value);
  const copy = copyOf(original);

  if (!isCopyOf(copy, original)) {
    throw new Error('A form value could not be copied');
  }
  return copy;
};
