import { isObject } from './kinds';

type Entry = readonly [key: string, value: unknown];

const isDefined = ([, value]: Entry): boolean => value !== undefined;

const definedEntries = (value: object): Entry[] => Object.entries(value).filter(isDefined);

const equalRecords = (left: object, right: object): boolean => {
  const entries = definedEntries(left);

  return (
    entries.length === definedEntries(right).length &&
    entries.every(
      ([key, value]) => Object.hasOwn(right, key) && isEqualValue(value, Reflect.get(right, key)),
    )
  );
};

type Comparison = (left: object, right: object) => boolean | undefined;

const sameDates: Comparison = (left, right) =>
  left instanceof Date && right instanceof Date ? left.getTime() === right.getTime() : undefined;

const sameFileMeta = (left: Blob, right: Blob): boolean =>
  !(left instanceof File && right instanceof File) ||
  (left.name === right.name && left.lastModified === right.lastModified);

const sameBlobs: Comparison = (left, right) =>
  left instanceof Blob && right instanceof Blob
    ? left.size === right.size && left.type === right.type && sameFileMeta(left, right)
    : undefined;

const sameArrays: Comparison = (left, right) =>
  Array.isArray(left) && Array.isArray(right)
    ? left.length === right.length &&
      left.every((item: unknown, index) => isEqualValue(item, right[index]))
    : undefined;

const sameMaps: Comparison = (left, right) =>
  left instanceof Map && right instanceof Map
    ? left.size === right.size &&
      [...left].every(([key, value]) => right.has(key) && isEqualValue(value, right.get(key)))
    : undefined;

const sameSets: Comparison = (left, right) =>
  left instanceof Set && right instanceof Set
    ? left.size === right.size && [...left].every((value) => right.has(value))
    : undefined;

const COMPARISONS: readonly Comparison[] = [sameDates, sameBlobs, sameArrays, sameMaps, sameSets];

const equalObjects = (left: object, right: object): boolean =>
  COMPARISONS.reduce<boolean | undefined>(
    (found, compare) => found ?? compare(left, right),
    undefined,
  ) ?? equalRecords(left, right);

export const isEqualValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }
  if (!isObject(left) || !isObject(right)) {
    return false;
  }
  return Object.getPrototypeOf(left) === Object.getPrototypeOf(right) && equalObjects(left, right);
};
