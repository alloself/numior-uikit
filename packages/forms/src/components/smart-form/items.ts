import { isIndexSegment, segmentsOf } from '../../paths/paths';
import { recordPath } from '../../paths/selector';
import { areaName } from './layout';
import type {
  NuiSmartFormArray,
  NuiSmartFormEntry,
  NuiSmartFormField,
  NuiSmartFormSection,
} from './smart-form.types';

interface ItemBase {
  readonly key: string;
  readonly area: string;
}

export type SmartItem<T> =
  | (ItemBase & {
      readonly kind: 'field';
      readonly path: string;
      readonly entry: NuiSmartFormField<T>;
    })
  | (ItemBase & { readonly kind: 'section'; readonly entry: NuiSmartFormSection<T> })
  | (ItemBase & {
      readonly kind: 'array';
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
  if (entry.kind === 'section') {
    return {
      kind: 'section',
      key: `section:${entry.name ?? entry.title}`,
      area: entry.area ?? areaName(entry.name ?? ''),
      entry,
    };
  }

  const path = entryPath(raw, entry);
  const area = entry.area ?? areaName(relativePath(path, prefix));

  return entry.kind === 'field'
    ? { kind: 'field', key: `field:${path}`, area, path, entry }
    : { kind: 'array', key: `array:${path}`, area, path, entry };
};

export const isSlotOf = <S extends object>(slots: S, name: PropertyKey): name is keyof S =>
  name in slots;
