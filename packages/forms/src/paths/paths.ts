import { toPath } from 'lodash-es';

const INDEX = /^(?:0|[1-9]\d*)$/;

const DOT = 46;

export const isIndexSegment = (segment: string): boolean => INDEX.test(segment);

export const segmentsOf = (path: string): string[] => toPath(path);

export const normalizePath = (path: string): string => toPath(path).join('.');

export const joinPath = (...parts: ReadonlyArray<string | number>): string =>
  parts
    .map(String)
    .filter((part) => part !== '')
    .join('.');

export const isUnder = (path: string, prefix: string): boolean =>
  prefix === '' ||
  path === prefix ||
  (path.startsWith(prefix) && path.charCodeAt(prefix.length) === DOT);

export const prefixesOf = (path: string): string[] => {
  const prefixes = [''];

  if (path === '') {
    return prefixes;
  }

  let dot = path.indexOf('.');

  while (dot !== -1) {
    prefixes.push(path.slice(0, dot));
    dot = path.indexOf('.', dot + 1);
  }
  prefixes.push(path);
  return prefixes;
};

export const patternOf = (path: string): string =>
  segmentsOf(path)
    .map((segment) => (isIndexSegment(segment) ? '*' : segment))
    .join('.');

const segmentMatches = (segment: string | undefined, expected: string): boolean =>
  segment === expected || (expected === '*' && segment !== undefined && isIndexSegment(segment));

export const matchesPattern = (path: string, pattern: string): boolean => {
  const segments = segmentsOf(path);
  const expected = segmentsOf(pattern);

  return (
    segments.length === expected.length &&
    expected.every((segment, index) => segmentMatches(segments[index], segment))
  );
};
