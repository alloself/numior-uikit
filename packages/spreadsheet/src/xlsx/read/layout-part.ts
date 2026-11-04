import { MAX_COLS, parseRange } from '../../core/address';
import type { CellRange } from '../../core/cell.types';
import type {
  LineLayout,
  LineStyle,
  SheetDefaults,
  SheetLayout,
  SheetView,
} from '../../core/layout/layout.types';
import { DEFAULT_SIZES, DEFAULT_VIEW, lineLayoutsOf } from '../../core/layout/line-layouts';
import type { Workbook } from '../../core/workbook';
import { XmlBoolean, type XmlAttribute } from '../xml/xml.types';
import { attributeOf, numberOf, truthy } from './ooxml';
import { FormatCode } from '../../core/format/format.types';

export interface LayoutCollector {
  row(row: number, attributes: readonly XmlAttribute[]): void;
  col(attributes: readonly XmlAttribute[]): void;
  merge(reference: string | undefined): void;
  view(attributes: readonly XmlAttribute[]): void;
  pane(attributes: readonly XmlAttribute[]): void;
  format(attributes: readonly XmlAttribute[]): void;
  layout(): SheetLayout;
}

export interface LayoutStyles {
  readonly book: Workbook;
  readonly formats: readonly string[];
  readonly decorations: readonly number[];
}

interface Modeled {
  readonly size: string;
  readonly custom: string;
  readonly styled: (attributes: readonly XmlAttribute[]) => boolean;
  readonly known: ReadonlySet<string>;
}

const ROW: Modeled = {
  size: 'ht',
  custom: 'customHeight',
  styled: (attributes) => truthy(attributeOf(attributes, 'customFormat')),
  known: new Set([
    'r',
    'spans',
    's',
    'customFormat',
    'ht',
    'customHeight',
    'hidden',
    'outlineLevel',
    'collapsed',
  ]),
};

const COL: Modeled = {
  size: 'width',
  custom: 'customWidth',
  styled: (attributes) => attributeOf(attributes, 'style') !== undefined,
  known: new Set([
    'min',
    'max',
    'style',
    'width',
    'customWidth',
    'hidden',
    'outlineLevel',
    'collapsed',
  ]),
};

const styleOf = (styles: LayoutStyles, index: number): LineStyle => {
  const code = styles.formats[index];

  return {
    format: code === undefined || code === FormatCode.General ? 0 : styles.book.formats.id(code),
    decoration: styles.decorations[index] ?? 0,
  };
};

const layoutOf = (
  attributes: readonly XmlAttribute[],
  modeled: Modeled,
  style: (attributes: readonly XmlAttribute[]) => LineStyle | undefined,
): LineLayout => {
  const size = attributeOf(attributes, modeled.size);

  return {
    size: size === undefined ? undefined : numberOf(size, 0),
    custom: truthy(attributeOf(attributes, modeled.custom)),
    hidden: truthy(attributeOf(attributes, 'hidden')),
    level: numberOf(attributeOf(attributes, 'outlineLevel'), 0),
    collapsed: truthy(attributeOf(attributes, 'collapsed')),
    style: modeled.styled(attributes) ? style(attributes) : undefined,
    extra: attributes.reduce<[string, string][]>((found, attribute) => {
      if (attribute.name.uri !== '' || !modeled.known.has(attribute.name.local)) {
        found.push([attribute.name.qname, attribute.value]);
      }
      return found;
    }, []),
  };
};

const FROZEN = new Set(['frozen', 'frozenSplit']);

const sizeOf = (text: string | undefined): number | undefined => {
  const size = text === undefined ? Number.NaN : Number(text);

  return Number.isFinite(size) && size > 0 ? size : undefined;
};

const splitOf = (text: string | undefined): number => Math.max(0, Math.round(numberOf(text, 0)));

const viewOf = (attributes: readonly XmlAttribute[]): SheetView => ({
  ...DEFAULT_VIEW,
  gridlines: attributeOf(attributes, 'showGridLines') !== XmlBoolean.Zero,
  rightToLeft: truthy(attributeOf(attributes, 'rightToLeft')),
  zoom: sizeOf(attributeOf(attributes, 'zoomScale')) ?? DEFAULT_VIEW.zoom,
});

const defaultsOf = (attributes: readonly XmlAttribute[]): SheetDefaults => ({
  rowHeight: sizeOf(attributeOf(attributes, 'defaultRowHeight')),
  colWidth: sizeOf(attributeOf(attributes, 'defaultColWidth')),
  baseColWidth: sizeOf(attributeOf(attributes, 'baseColWidth')) ?? DEFAULT_SIZES.baseColWidth,
});

const blank = (layout: LineLayout): boolean =>
  layout.size === undefined &&
  !layout.custom &&
  !layout.hidden &&
  layout.level === 0 &&
  !layout.collapsed &&
  layout.style === undefined &&
  layout.extra.length === 0;

export const createLayoutCollector = (styles: LayoutStyles): LayoutCollector => {
  const interned = new Map<string, LineLayout>();
  const rows: [number, LineLayout][] = [];
  const cols: [number, LineLayout][] = [];
  const merges: CellRange[] = [];
  let view: SheetView | undefined;
  let views = 0;
  let defaults = DEFAULT_SIZES;

  const shared = (layout: LineLayout): LineLayout => {
    const key = JSON.stringify(layout);
    const known = interned.get(key);

    if (known !== undefined) {
      return known;
    }
    interned.set(key, layout);
    return layout;
  };

  const style = (name: string) => (attributes: readonly XmlAttribute[]) =>
    styleOf(styles, numberOf(attributeOf(attributes, name), 0));

  return {
    row: (row, attributes) => {
      const layout = layoutOf(attributes, ROW, style('s'));

      if (!blank(layout)) {
        rows.push([row, shared(layout)]);
      }
    },
    col: (attributes) => {
      const layout = layoutOf(attributes, COL, style('style'));
      const first = numberOf(attributeOf(attributes, 'min'), 0) - 1;
      const last = Math.min(numberOf(attributeOf(attributes, 'max'), first + 1) - 1, MAX_COLS - 1);

      if (first < 0 || blank(layout)) {
        return;
      }

      const kept = shared(layout);

      for (let col = first; col <= last; col += 1) {
        cols.push([col, kept]);
      }
    },
    merge: (reference) => {
      const range = reference === undefined ? undefined : parseRange(reference);

      if (range !== undefined) {
        merges.push(range);
      }
    },
    view: (attributes) => {
      views += 1;
      view = views === 1 ? viewOf(attributes) : view;
    },
    pane: (attributes) => {
      if (
        views !== 1 ||
        view === undefined ||
        !FROZEN.has(attributeOf(attributes, 'state') ?? '')
      ) {
        return;
      }

      view = {
        ...view,
        frozenRows: splitOf(attributeOf(attributes, 'ySplit')),
        frozenCols: splitOf(attributeOf(attributes, 'xSplit')),
      };
    },
    format: (attributes) => {
      defaults = defaultsOf(attributes);
    },
    layout: () => ({
      rows: lineLayoutsOf(rows),
      cols: lineLayoutsOf(cols),
      merges,
      view: view ?? DEFAULT_VIEW,
      defaults,
      xml: undefined,
      parts: [],
    }),
  };
};
