import type { AttrSpec, AttrSpecs } from './schema.types';

type SpecEntry = readonly [string, AttrSpec];

const entriesBySpecs = new WeakMap<AttrSpecs, readonly SpecEntry[]>();

export const specEntries = (specs: AttrSpecs): readonly SpecEntry[] => {
  const known = entriesBySpecs.get(specs);

  if (known !== undefined) {
    return known;
  }

  const entries = Object.entries(specs);

  entriesBySpecs.set(specs, entries);
  return entries;
};
