import { isUnder } from '../../paths/paths';
import { entryPath } from './items';
import { NuiSmartFormEntryKind, type NuiSmartFormEntry } from './smart-form.types';

export const stepPaths = <T extends object>(
  raw: T,
  entries: readonly NuiSmartFormEntry<T>[],
): string[] =>
  entries.flatMap((entry) =>
    entry.kind === NuiSmartFormEntryKind.Section
      ? stepPaths(raw, entry.fields)
      : [entryPath(raw, entry)],
  );

export const stepOf = (steps: readonly (readonly string[])[], path: string): number =>
  steps.findIndex((paths) => paths.some((prefix) => isUnder(path, prefix)));
