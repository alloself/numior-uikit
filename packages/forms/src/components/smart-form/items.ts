import { isIndexSegment, segmentsOf } from '../../paths/paths';
import { recordPath } from '../../paths/selector';
import { areaName } from './layout';
import {
  NuiSmartFormEntryKind,
  type NuiSmartFormArray,
  type NuiSmartFormEntry,
  type NuiSmartFormField,
  type NuiSmartFormSection,
} from './smart-form.types';

interface ItemBase {
  readonly key: string;
  readonly area: string;
}

export type SmartItem<T> =
  | (ItemBase & {
      readonly kind: typeof NuiSmartFormEntryKind.Field;
      readonly path: string;
      readonly entry: NuiSmartFormField<T>;
    })
  | (ItemBase & {
      readonly kind: typeof NuiSmartFormEntryKind.Section;
      readonly entry: NuiSmartFormSection<T>;
    })
  | (ItemBase & {
      readonly kind: typeof NuiSmartFormEntryKind.Array;
      readonly path: string;
      readonly entry: NuiSmartFormArray<T>;
    });

const relativePath = (path: string, prefix: string): string =>
  prefix !== '' && path.startsWith(`${prefix}.`) ? path.slice(prefix.length + 1) : path;

export const slotNameOf = (path: string): string =>
  segmentsOf(path)
    .filter((segment) => !isIndexSegment(segment))
    .join('.');

export const entryPath = <T extends object>(
  raw: T,
  entry: NuiSmartFormField<T> | NuiSmartFormArray<T>,
): string => recordPath(raw, entry.name);

export const itemOf = <T extends object>(
  raw: T,
  entry: NuiSmartFormEntry<T>,
  prefix: string,
): SmartItem<T> => {
  if (entry.kind === NuiSmartFormEntryKind.Section) {
    return {
      kind: NuiSmartFormEntryKind.Section,
      key: `section:${entry.name ?? entry.title}`,
      area: entry.area ?? areaName(entry.name ?? ''),
      entry,
    };
  }

  const path = entryPath(raw, entry);
  const own = relativePath(path, prefix);
  const area = entry.area ?? areaName(own);

  return entry.kind === NuiSmartFormEntryKind.Field
    ? { kind: NuiSmartFormEntryKind.Field, key: `field:${own}`, area, path, entry }
    : { kind: NuiSmartFormEntryKind.Array, key: `array:${own}`, area, path, entry };
};
