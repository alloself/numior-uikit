import { isIndexSegment, joinPath, segmentsOf } from '../paths/paths';

type Branch = readonly [path: string, value: unknown];

const isContainer = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;

export const getAt = (source: unknown, path: string): unknown =>
  segmentsOf(path).reduce<unknown>(
    (current, segment) => (isContainer(current) ? Reflect.get(current, segment) : undefined),
    source,
  );

export const deleteAt = (target: object, path: string): void => {
  const segments = segmentsOf(path);
  const last = segments.pop();
  const parent = getAt(target, segments.join('.'));

  if (last === undefined || !isContainer(parent)) {
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
  return isContainer(value) && Object.hasOwn(value, segment)
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
