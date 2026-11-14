import { sortBy, uniq } from 'lodash-es';

const BUNDLE_FILE = 'styles.css';
const SHEET_RE = /\/styles\/[^/]+\.css$/;

const isBundle = (path: string): boolean => path.endsWith(`/${BUNDLE_FILE}`);

export const bundleOf = (path: string): string => path.replace(SHEET_RE, `/${BUNDLE_FILE}`);

export const orderedStylesheets = (
  paths: readonly string[],
  order: readonly string[],
): string[] => {
  const bundles = new Set(paths.filter(isBundle));
  const kept = uniq(paths).filter((path) => isBundle(path) || !bundles.has(bundleOf(path)));

  return sortBy(kept, (path) => order.indexOf(path));
};
