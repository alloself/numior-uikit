import { get, set } from 'lodash-es';
import { isIndexSegment, joinPath, segmentsOf } from '../paths/paths';
import { isObject, isPlainRecord } from './kinds';
import { PathToken } from '../paths/paths.types';

type Branch = readonly [path: string, value: unknown];

export const getAt = (source: unknown, path: string): unknown => {
  if (path === '') {
    return source;
  }
  const found: unknown = get(source, segmentsOf(path));

  return found;
};

export const setAt = (target: object, path: string, value: unknown): void => {
  const segments = segmentsOf(path);

  if (segments.length === 0) {
    return;
  }
  set(target, segments, value);
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
    if (Object.hasOwn(source, key)) {
      continue;
    }

    Reflect.deleteProperty(target, key);
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
  if (!isIndexSegment(last) || Number(last) >= parent.length) {
    return;
  }

  Reflect.set(parent, last, undefined);
};

const childrenOf = (value: unknown, segment: string): Branch[] => {
  if (segment === PathToken.Wildcard) {
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
