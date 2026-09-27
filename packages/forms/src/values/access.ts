import { isIndexSegment, joinPath, segmentsOf } from '../paths/paths';
import { isObject, isPlainRecord } from './kinds';

type Branch = readonly [path: string, value: unknown];

export const getAt = (source: unknown, path: string): unknown =>
  segmentsOf(path).reduce<unknown>(
    (current, segment) => (isObject(current) ? Reflect.get(current, segment) : undefined),
    source,
  );

const containerAt = (current: object, segment: string, next: string): object => {
  const existing: unknown = Reflect.get(current, segment);

  if (isObject(existing)) {
    return existing;
  }
  Reflect.set(current, segment, isIndexSegment(next) ? [] : {});

  const created: unknown = Reflect.get(current, segment);

  return isObject(created) ? created : current;
};

export const setAt = (target: object, path: string, value: unknown): void => {
  const segments = segmentsOf(path);
  const last = segments.at(-1);

  if (last === undefined) {
    return;
  }

  const parent = segments
    .slice(0, -1)
    .reduce<object>(
      (current, segment, index) => containerAt(current, segment, segments[index + 1] ?? last),
      target,
    );

  Reflect.set(parent, last, value);
};

export const mergeInto = (target: object, source: object): void => {
  for (const [key, value] of Object.entries(source)) {
    const current: unknown = Reflect.get(target, key);

    if (isPlainRecord(current) && isPlainRecord(value)) {
      mergeInto(current, value);
    } else {
      Reflect.set(target, key, value);
    }
  }
};

export const replaceContents = (target: object, source: object): void => {
  for (const key of Object.keys(target)) {
    if (!Object.hasOwn(source, key)) {
      Reflect.deleteProperty(target, key);
    }
  }
  for (const [key, value] of Object.entries(source)) {
    Reflect.set(target, key, value);
  }
};

export const deleteAt = (target: object, path: string): void => {
  const segments = segmentsOf(path);
  const last = segments.pop();
  const parent = getAt(target, segments.join('.'));

  if (last === undefined || !isObject(parent)) {
    return;
  }
  if (!Array.isArray(parent)) {
    Reflect.deleteProperty(parent, last);
    return;
  }
  if (isIndexSegment(last) && Number(last) < parent.length) {
    Reflect.set(parent, last, undefined);
  }
};

const childrenOf = (value: unknown, segment: string): Branch[] => {
  if (segment === '*') {
    return Array.isArray(value)
      ? value.map((child: unknown, index) => [String(index), child] as const)
      : [];
  }
  return isObject(value) && Object.hasOwn(value, segment)
    ? [[segment, Reflect.get(value, segment)]]
    : [];
};

export const expandPattern = (source: unknown, pattern: string): string[] =>
  segmentsOf(pattern)
    .reduce<Branch[]>(
      (frontier, segment) =>
        frontier.flatMap(([path, value]) =>
          childrenOf(value, segment).map(([key, child]) => [joinPath(path, key), child] as const),
        ),
      [['', source]],
    )
    .map(([path]) => path);
