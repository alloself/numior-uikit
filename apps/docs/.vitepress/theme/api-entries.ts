import type { CatalogReference, ComponentReference } from '../reference/reference.types';

export interface ApiEntry {
  readonly component: ComponentReference;
  readonly catalog: CatalogReference | undefined;
}

const claim = (shown: Set<string>, key: string | undefined): boolean => {
  if (key === undefined || shown.has(key)) {
    return false;
  }
  shown.add(key);
  return true;
};

export const withoutRepeats = (entries: readonly ApiEntry[]): ApiEntry[] => {
  const catalogs = new Set<string>();

  return entries.map((entry) => ({
    component: entry.component,
    catalog: claim(catalogs, entry.component.messages) ? entry.catalog : undefined,
  }));
};
