import { OFFICE_THEME, type ThemePalette } from './theme';

export type StyleColor =
  | { readonly kind: 'rgb'; readonly argb: string }
  | { readonly kind: 'theme'; readonly theme: number; readonly tint: number }
  | { readonly kind: 'indexed'; readonly index: number }
  | { readonly kind: 'auto' };

export type UnderlineStyle = 'single' | 'double' | 'singleAccounting' | 'doubleAccounting';

export interface FontStyle {
  readonly name?: string | undefined;
  readonly size?: number | undefined;
  readonly bold?: boolean | undefined;
  readonly italic?: boolean | undefined;
  readonly underline?: UnderlineStyle | undefined;
  readonly strike?: boolean | undefined;
  readonly color?: StyleColor | undefined;
  readonly script?: 'superscript' | 'subscript' | undefined;
  readonly family?: number | undefined;
  readonly scheme?: 'major' | 'minor' | undefined;
}

export interface FillStyle {
  readonly pattern: string;
  readonly foreground?: StyleColor | undefined;
  readonly background?: StyleColor | undefined;
}

export interface BorderSide {
  readonly style: string;
  readonly color?: StyleColor | undefined;
}

export interface BorderStyle {
  readonly left?: BorderSide | undefined;
  readonly right?: BorderSide | undefined;
  readonly top?: BorderSide | undefined;
  readonly bottom?: BorderSide | undefined;
  readonly diagonal?: BorderSide | undefined;
  readonly diagonalUp?: boolean | undefined;
  readonly diagonalDown?: boolean | undefined;
}

export interface AlignmentStyle {
  readonly horizontal?: string | undefined;
  readonly vertical?: string | undefined;
  readonly wrap?: boolean | undefined;
  readonly indent?: number | undefined;
  readonly rotation?: number | undefined;
  readonly shrink?: boolean | undefined;
}

export interface ProtectionStyle {
  readonly locked?: boolean | undefined;
  readonly hidden?: boolean | undefined;
}

export interface CellDecoration {
  readonly font?: FontStyle | undefined;
  readonly fill?: FillStyle | undefined;
  readonly border?: BorderStyle | undefined;
  readonly alignment?: AlignmentStyle | undefined;
  readonly protection?: ProtectionStyle | undefined;
}

export interface CellDecorations {
  id(decoration: CellDecoration): number;
  get(id: number): CellDecoration;
  defaultFont: FontStyle;
  theme: ThemePalette;
  readonly size: number;
}

const NONE: CellDecoration = {};

const LIMIT = 65_535;

const DEFAULT_FONT: FontStyle = { name: 'Calibri', size: 11, family: 2, scheme: 'minor' };

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    return `{${Object.entries(value)
      .reduce<[string, unknown][]>((kept, entry) => {
        if (entry[1] !== undefined) {
          kept.push(entry);
        }
        return kept;
      }, [])
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const decorationKey = (decoration: CellDecoration): string => canonical(decoration);

export const createDecorations = (): CellDecorations => {
  const items: CellDecoration[] = [NONE];
  const ids = new Map<string, number>([[decorationKey(NONE), 0]]);

  return {
    id: (decoration) => {
      const key = decorationKey(decoration);
      const known = ids.get(key);

      if (known !== undefined) {
        return known;
      }
      if (items.length > LIMIT) {
        throw new RangeError('A workbook holds at most 65 535 cell decorations');
      }
      ids.set(key, items.length);
      items.push(decoration);
      return items.length - 1;
    },
    get: (id) => items[id] ?? NONE,
    defaultFont: DEFAULT_FONT,
    theme: OFFICE_THEME,
    get size() {
      return items.length;
    },
  };
};
