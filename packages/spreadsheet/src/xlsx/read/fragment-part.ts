import { parseCell, parseRange } from '../../core/address';
import type { CellRange } from '../../core/cell.types';
import { anchorOf } from '../../core/layout/fragments';
import type {
  Fragment,
  FragmentPiece,
  FragmentSlot,
  SheetXml,
  SlotAxis,
  SlotPolicy,
} from '../../core/layout/fragments.types';
import { EN_FORMULAS } from '../../core/formula/locale';
import { parseFormula } from '../../core/formula/parser';
import type { XmlAttribute, XmlName } from '../xml/xml.types';
import { escapeAttribute, escapeText } from '../xml/writer';
import { X14 } from './conditional-part';
import { MAIN } from './ooxml';

export interface FragmentRecorder {
  open(name: XmlName, attributes: readonly XmlAttribute[]): void;
  text(text: string): void;
  close(name: XmlName): void;
  tail(): void;
  result(): SheetXml;
}

type SlotSpec =
  | { readonly kind: 'cell' | 'ranges'; readonly policy: SlotPolicy }
  | { readonly kind: 'line'; readonly base: number; readonly policy: SlotPolicy }
  | { readonly kind: 'split'; readonly axis: SlotAxis }
  | { readonly kind: 'offset' | 'formula' | 'count' };

interface ElementSpec {
  readonly fragment?: 'item' | 'group';
  readonly attributes?: Readonly<Record<string, SlotSpec>>;
  readonly text?: SlotSpec;
  readonly raw?: boolean;
}

interface Pending {
  readonly kind: 'pending';
  readonly text: string;
}

type Recorded = FragmentPiece | Pending;

interface Frame {
  readonly pieces: Recorded[];
  readonly group: boolean;
}

interface Open {
  readonly name: XmlName;
  readonly spec: ElementSpec | undefined;
  readonly frame: Frame | undefined;
  readonly axis: SlotAxis;
  text: string | undefined;
}

interface Top {
  readonly frame: Frame;
  readonly index: number;
  readonly opening: string;
  readonly prefixes: Map<string, string>;
}

const XM = 'http://schemas.microsoft.com/office/excel/2006/main';

const PREFIXES = /_xl(?:fn|ws|pm)\./gu;

const DROP_RANGES: SlotSpec = { kind: 'ranges', policy: 'drop' };

const FORMULA: SlotSpec = { kind: 'formula' };

const COUNT: SlotSpec = { kind: 'count' };

const ITEM_RANGES = (name: string): ElementSpec => ({
  fragment: 'item',
  attributes: { [name]: DROP_RANGES },
});

const GROUP: ElementSpec = { fragment: 'group' };

const BREAKS: ElementSpec = {
  fragment: 'group',
  attributes: { count: COUNT, manualBreakCount: COUNT },
};

const SPECS: Readonly<Record<string, ElementSpec>> = {
  'main:sheetView': { fragment: 'item' },
  'main:pane': {
    attributes: {
      topLeftCell: { kind: 'cell', policy: 'clamp' },
      xSplit: { kind: 'split', axis: 'cols' },
      ySplit: { kind: 'split', axis: 'rows' },
    },
  },
  'main:selection': {
    attributes: {
      activeCell: { kind: 'cell', policy: 'clamp' },
      sqref: { kind: 'ranges', policy: 'clamp' },
    },
  },
  'main:dataValidations': { fragment: 'group', attributes: { count: COUNT } },
  'main:dataValidation': ITEM_RANGES('sqref'),
  'main:formula1': { text: FORMULA },
  'main:formula2': { text: FORMULA },
  'main:hyperlinks': GROUP,
  'main:hyperlink': { fragment: 'item', attributes: { ref: DROP_RANGES, location: FORMULA } },
  'main:protectedRanges': GROUP,
  'main:protectedRange': ITEM_RANGES('sqref'),
  'main:ignoredErrors': GROUP,
  'main:ignoredError': ITEM_RANGES('sqref'),
  'main:rowBreaks': BREAKS,
  'main:colBreaks': BREAKS,
  'main:brk': { fragment: 'item', attributes: { id: { kind: 'line', base: 0, policy: 'drop' } } },
  'main:cellWatches': GROUP,
  'main:cellWatch': { fragment: 'item', attributes: { r: { kind: 'cell', policy: 'drop' } } },
  'main:autoFilter': ITEM_RANGES('ref'),
  'main:filterColumn': { fragment: 'item', attributes: { colId: { kind: 'offset' } } },
  'main:sortState': ITEM_RANGES('ref'),
  'main:sortCondition': ITEM_RANGES('ref'),
  'x14:conditionalFormattings': { raw: true },
  'x14:dataValidations': { fragment: 'group', attributes: { count: COUNT } },
  'x14:dataValidation': { fragment: 'item' },
  'x14:sparklineGroups': GROUP,
  'x14:sparklineGroup': GROUP,
  'x14:sparkline': { fragment: 'item' },
  'xm:sqref': { text: DROP_RANGES },
  'xm:f': { text: FORMULA },
};

const FREE = new Set([
  'sheetPr',
  'dimension',
  'sheetViews',
  'sheetFormatPr',
  'cols',
  'sheetCalcPr',
  'sheetProtection',
  'protectedRanges',
  'autoFilter',
  'sortState',
  'mergeCells',
  'phoneticPr',
  'conditionalFormatting',
  'dataValidations',
  'hyperlinks',
  'printOptions',
  'pageMargins',
  'pageSetup',
  'headerFooter',
  'rowBreaks',
  'colBreaks',
  'customProperties',
  'cellWatches',
  'ignoredErrors',
  'legacyDrawingHF',
  'drawingHF',
  'picture',
  'tableParts',
  'extLst',
]);

const FROZEN = new Set(['frozen', 'frozenSplit']);

const spaceOf = (uri: string): string => {
  if (MAIN.has(uri)) {
    return 'main';
  }
  if (uri === X14) {
    return 'x14';
  }
  return uri === XM ? 'xm' : 'other';
};

const rangesOf = (text: string): CellRange[] | undefined => {
  const parts = text.trim().split(/\s+/u);

  const ranges = parts.reduce<CellRange[]>((found, part) => {
    const cell = part.includes(':') ? undefined : parseCell(part);
    const range = cell === undefined ? parseRange(part) : parseRange(`${part}:${part}`);

    if (range !== undefined) {
      found.push(range);
    }
    return found;
  }, []);

  return ranges.length === parts.length ? ranges : undefined;
};

const wholeNumber = (text: string): number | undefined => {
  const value = Number(text);

  return text.trim() !== '' && Number.isInteger(value) ? value : undefined;
};

const slotOf = (spec: SlotSpec, value: string, axis: SlotAxis): Recorded | undefined => {
  switch (spec.kind) {
    case 'cell': {
      const cell = parseCell(value);

      return cell === undefined
        ? undefined
        : { kind: 'cell', cell: { row: cell.row, col: cell.col }, policy: spec.policy };
    }
    case 'ranges': {
      const ranges = rangesOf(value);

      return ranges === undefined ? undefined : { kind: 'ranges', ranges, policy: spec.policy };
    }
    case 'line': {
      const line = wholeNumber(value);

      return line === undefined
        ? undefined
        : { kind: 'line', axis, line: line - spec.base, base: spec.base, policy: spec.policy };
    }
    case 'split': {
      const count = wholeNumber(value);

      return count === undefined ? undefined : { kind: 'split', axis: spec.axis, count };
    }
    case 'offset': {
      const offset = wholeNumber(value);

      return offset === undefined ? undefined : { kind: 'offset', offset };
    }
    case 'formula':
      return { kind: 'pending', text: value };
    case 'count':
      return { kind: 'count' };
  }
};

const isPending = (piece: Recorded): piece is Pending =>
  typeof piece !== 'string' && 'kind' in piece && piece.kind === 'pending';

const settled = (frame: Frame, opaque: string[]): Fragment => {
  const known = frame.pieces.reduce<FragmentPiece[]>((found, piece) => {
    if (!isPending(piece)) {
      found.push(piece);
    }
    return found;
  }, []);

  const anchor = anchorOf({ pieces: known, group: frame.group });

  return {
    group: frame.group,
    pieces: frame.pieces.map((piece): FragmentPiece => {
      if (!isPending(piece)) {
        return piece;
      }

      const parsed = parseFormula(piece.text.replaceAll(PREFIXES, ''), EN_FORMULAS, anchor);

      if (!parsed.ok) {
        opaque.push('formula');
        return escapeAttribute(piece.text);
      }
      return { kind: 'formula', ast: parsed.ast } satisfies FragmentSlot;
    }),
  };
};

export const createFragmentRecorder = (): FragmentRecorder => {
  const opaque: string[] = [];
  const head: Frame = { pieces: [], group: false };
  const tail: Frame = { pieces: [], group: false };
  const frames: Frame[] = [head];
  const stack: Open[] = [];
  let top: Top | undefined;
  let raw = 0;

  const current = (): Frame => frames.at(-1) ?? head;

  const push = (piece: Recorded): void => {
    current().pieces.push(piece);
  };

  const note = (name: XmlName): void => {
    const colon = name.qname.indexOf(':');
    const prefix = colon > 0 ? name.qname.slice(0, colon) : '';

    if (top !== undefined && prefix !== '' && prefix !== 'xml') {
      top.prefixes.set(prefix, name.uri);
    }
  };

  const markOpaque = (name: XmlName): void => {
    const space = spaceOf(name.uri);

    if (space !== 'main' || !FREE.has(name.local)) {
      opaque.push(name.local);
    }
  };

  const attributeXml = (
    attribute: XmlAttribute,
    spec: ElementSpec | undefined,
    context: { readonly axis: SlotAxis; readonly frozen: boolean },
  ): void => {
    const slotSpec =
      raw > 0 || attribute.name.uri !== '' ? undefined : spec?.attributes?.[attribute.name.local];

    const usable = slotSpec?.kind !== 'split' || context.frozen;

    const slot =
      slotSpec === undefined || !usable
        ? undefined
        : slotOf(slotSpec, attribute.value, context.axis);

    note(attribute.name);
    if (slot === undefined) {
      if (slotSpec !== undefined && usable) {
        opaque.push(attribute.name.local);
      }
      push(` ${attribute.name.qname}="${escapeAttribute(attribute.value)}"`);
      return;
    }
    push(` ${attribute.name.qname}="`);
    push(slot);
    push('"');
  };

  const begin = (name: XmlName, spec: ElementSpec | undefined): void => {
    if (stack.length === 0) {
      markOpaque(name);
    }
    if (spec?.fragment !== undefined) {
      frames.push({ pieces: [], group: spec.fragment === 'group' });
    }
    if (stack.length === 0) {
      top = {
        frame: current(),
        index: current().pieces.length,
        opening: `<${name.qname}`,
        prefixes: new Map(),
      };
    }
  };

  const openingXml = (
    name: XmlName,
    attributes: readonly XmlAttribute[],
    spec: ElementSpec | undefined,
    axis: SlotAxis,
  ): void => {
    const frozen = FROZEN.has(
      attributes.find((attribute) => attribute.name.local === 'state')?.value ?? '',
    );

    note(name);
    push(`<${name.qname}`);
    if (!name.qname.includes(':') && spaceOf(name.uri) !== 'main') {
      push(` xmlns="${escapeAttribute(name.uri)}"`);
    }

    attributes.forEach((attribute) => {
      attributeXml(attribute, spec, { axis, frozen });
    });

    push('>');
  };

  return {
    open: (name, attributes) => {
      const spec = raw > 0 ? undefined : SPECS[`${spaceOf(name.uri)}:${name.local}`];
      const axis: SlotAxis = stack.at(-1)?.name.local === 'colBreaks' ? 'cols' : 'rows';

      begin(name, spec);
      openingXml(name, attributes, spec, axis);
      raw += spec?.raw === true || raw > 0 ? 1 : 0;

      stack.push({
        name,
        spec,
        frame: spec?.fragment === undefined ? undefined : current(),
        axis,
        text: spec?.text === undefined ? undefined : '',
      });
    },
    text: (text) => {
      const open = stack.at(-1);

      if (open?.text !== undefined) {
        open.text += text;
      } else {
        push(escapeText(text));
      }
    },
    close: (name) => {
      const open = stack.pop();
      const slotSpec = open?.spec?.text;

      raw -= raw > 0 ? 1 : 0;
      if (open?.text !== undefined && slotSpec !== undefined) {
        const slot = slotOf(slotSpec, open.text.trim(), open.axis);

        if (slot === undefined) {
          opaque.push(open.name.local);
        }
        push(slot ?? escapeText(open.text));
      }
      push(`</${name.qname}>`);

      if (stack.length === 0 && top !== undefined) {
        const declarations = [...top.prefixes]
          .map(([prefix, uri]) => ` xmlns:${prefix}="${escapeAttribute(uri)}"`)
          .join('');

        top.frame.pieces[top.index] = `${top.opening}${declarations}`;
        top = undefined;
      }
      if (open?.frame !== undefined) {
        frames.pop();
        push(settled(open.frame, opaque));
      }
    },
    tail: () => {
      frames.splice(0, frames.length, tail);
    },
    result: () => ({ head: settled(head, opaque), tail: settled(tail, opaque), opaque }),
  };
};
