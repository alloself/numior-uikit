const INDEX = /^(?:0|[1-9]\d*)$/;

const BRACKET_INDEX = /\[(\d+)\]/g;

export const isIndexSegment = (segment: string): boolean => INDEX.test(segment);

export const segmentsOf = (path: string): string[] => (path === '' ? [] : path.split('.'));

export const normalizePath = (path: string): string =>
  path.replace(BRACKET_INDEX, '.$1').replace(/^\./, '');

export const joinPath = (...parts: ReadonlyArray<string | number>): string =>
  parts
    .map(String)
    .filter((part) => part !== '')
    .join('.');

export const isUnder = (path: string, prefix: string): boolean =>
  prefix === '' || path === prefix || path.startsWith(`${prefix}.`);

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

export const toVeePath = (path: string): string =>
  segmentsOf(path).reduce((result, segment) => {
    if (isIndexSegment(segment)) {
      return `${result}[${segment}]`;
    }
    return result === '' ? segment : `${result}.${segment}`;
  }, '');
