import { parseCell, parseRange } from '../../core/address';
import type { CellRange, LineAxis } from '../../core/cell.types';
import { anchorOf } from '../../core/layout/fragments';
import type {
  Fragment,
  FragmentPiece,
  FragmentSlot,
  SheetXml,
} from '../../core/layout/fragments.types';
import { EN_FORMULAS } from '../../core/formula/locale';
import { parseFormula } from '../../core/formula/parser';
import { XmlPrefix, type XmlAttribute, type XmlName } from '../xml/xml.types';
import { escapeAttribute, escapeText } from '../xml/writer';
import {
  AnchorMode,
  FragmentSpecKind,
  type ElementSpec,
  FragmentPieceKind,
  type RecorderOptions,
  type SlotSpec,
} from './fragment.types';
import { spaceOf } from './fragment-specs';
import { PivotLineKind } from '../../core/pivot/pivot.types';
import { OoxmlAttribute, OoxmlElement } from '../ooxml.types';

export interface FragmentRecorder {
  open(name: XmlName, attributes: readonly XmlAttribute[]): void;
  text(text: string): void;
  close(name: XmlName): void;
  tail(): void;
  result(): SheetXml;
}

interface Pending {
  readonly kind: typeof FragmentPieceKind.Pending;
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
  readonly axis: LineAxis;
  readonly mode: AnchorMode | undefined;
  readonly inTo: boolean;
  readonly inherit: string;
  text: string | undefined;
}

interface Top {
  readonly frame: Frame;
  readonly index: number;
  readonly opening: string;
  readonly prefixes: Map<string, string>;
}

const PREFIXES = /_xl(?:fn|ws|pm)\./gu;

const FROZEN = new Set(['frozen', 'frozenSplit']);

const ANCHOR_LINES: ReadonlyMap<number, LineAxis> = new Map([
  [0, 'cols'],
  [2, 'rows'],
  [4, 'cols'],
  [6, 'rows'],
]);

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

const slotOf = (spec: SlotSpec, value: string, axis: LineAxis): Recorded | undefined => {
  switch (spec.kind) {
    case FragmentSpecKind.Cell: {
      const cell = parseCell(value);

      return cell === undefined
        ? undefined
        : { kind: 'cell', cell: { row: cell.row, col: cell.col }, policy: spec.policy };
    }
    case FragmentSpecKind.Ranges: {
      const ranges = rangesOf(value);

      return ranges === undefined ? undefined : { kind: 'ranges', ranges, policy: spec.policy };
    }
    case FragmentSpecKind.Line: {
      const line = wholeNumber(value);

      return line === undefined
        ? undefined
        : {
            kind: 'line',
            axis: spec.axis ?? axis,
            line: line - spec.base,
            base: spec.base,
            policy: spec.policy,
          };
    }
    case FragmentSpecKind.Split: {
      const count = wholeNumber(value);

      return count === undefined ? undefined : { kind: 'split', axis: spec.axis, count };
    }
    case FragmentSpecKind.Offset: {
      const offset = wholeNumber(value);

      return offset === undefined ? undefined : { kind: 'offset', offset };
    }
    case FragmentSpecKind.Formula:
      return { kind: 'pending', text: value };
    case FragmentSpecKind.Count:
      return { kind: 'count' };
    case FragmentSpecKind.Anchor:
      return undefined;
  }
};

const anchorPieces = (text: string): Recorded[] | undefined => {
  const values = text.split(',').map((value) => value.trim());

  const pieces = values.flatMap((value, index): Recorded[] => {
    const axis = ANCHOR_LINES.get(index);

    const slot =
      axis === undefined
        ? undefined
        : slotOf({ kind: 'line', base: 0, policy: 'clamp', axis }, value, axis);

    return [index === 0 ? '' : ', ', slot ?? escapeText(value)];
  });

  return values.length === 8 && values.every((value) => wholeNumber(value) !== undefined)
    ? pieces
    : undefined;
};

const modeOf = (
  name: XmlName,
  attributes: readonly XmlAttribute[],
  parent: AnchorMode | undefined,
): AnchorMode | undefined => {
  if (name.local === OoxmlElement.OneCellAnchor) {
    return 'oneCell';
  }
  if (name.local !== OoxmlElement.TwoCellAnchor) {
    return parent;
  }

  const edit = attributes.find(
    (attribute) => attribute.name.local === OoxmlAttribute.EditAs,
  )?.value;

  return edit === AnchorMode.OneCell || edit === AnchorMode.Absolute ? edit : 'twoCell';
};

const adjusted = (
  spec: SlotSpec | undefined,
  open: Pick<Open, 'mode' | 'inTo'>,
): SlotSpec | undefined => {
  if (spec?.kind !== FragmentSpecKind.Line || open.mode === undefined) {
    return spec;
  }
  if (open.mode === AnchorMode.Absolute) {
    return undefined;
  }
  return open.mode === AnchorMode.OneCell && open.inTo ? { ...spec, policy: 'follow' } : spec;
};

const isPending = (piece: Recorded): piece is Pending =>
  typeof piece !== 'string' && 'kind' in piece && piece.kind === FragmentPieceKind.Pending;

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

export const createFragmentRecorder = (options: RecorderOptions): FragmentRecorder => {
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

    if (top !== undefined && prefix !== '' && prefix !== XmlPrefix.Xml) {
      top.prefixes.set(prefix, name.uri);
    }
  };

  const attributeXml = (
    attribute: XmlAttribute,
    spec: ElementSpec | undefined,
    context: { readonly axis: LineAxis; readonly frozen: boolean },
  ): void => {
    const slotSpec =
      raw > 0 || attribute.name.uri !== '' ? undefined : spec?.attributes?.[attribute.name.local];

    const usable = slotSpec?.kind !== FragmentSpecKind.Split || context.frozen;

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
    if (stack.length === 0 && options.opaqueTop?.(name) === true) {
      opaque.push(name.local);
    }
    if (spec?.fragment !== undefined) {
      frames.push({ pieces: [], group: spec.fragment === PivotLineKind.Group });
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
    context: { readonly axis: LineAxis; readonly inherit: string },
  ): void => {
    const frozen = FROZEN.has(
      attributes.find((attribute) => attribute.name.local === OoxmlAttribute.State)?.value ?? '',
    );

    note(name);
    push(`<${name.qname}`);
    if (!name.qname.includes(':') && name.uri !== context.inherit) {
      push(` xmlns="${escapeAttribute(name.uri)}"`);
    }

    attributes.forEach((attribute) => {
      attributeXml(attribute, spec, { axis: context.axis, frozen });
    });

    push('>');
  };

  const textSlots = (open: Open): Recorded[] | undefined => {
    const spec = adjusted(open.spec?.text, open);
    const text = open.text ?? '';

    if (spec === undefined) {
      return [escapeText(text)];
    }
    if (spec.kind === FragmentSpecKind.Anchor) {
      return anchorPieces(text);
    }

    const slot = slotOf(spec, text.trim(), open.axis);

    return slot === undefined ? undefined : [slot];
  };

  const openOf = (
    name: XmlName,
    attributes: readonly XmlAttribute[],
    spec: ElementSpec | undefined,
    parent: Open | undefined,
  ): Open => {
    const inherit = parent?.inherit ?? options.inherit;

    return {
      name,
      spec,
      frame: undefined,
      axis: parent?.name.local === OoxmlElement.ColBreaks ? 'cols' : 'rows',
      mode: modeOf(name, attributes, parent?.mode),
      inTo: name.local === OoxmlElement.To || parent?.inTo === true,
      inherit: name.qname.includes(':') ? inherit : name.uri,
      text: spec?.text === undefined ? undefined : '',
    };
  };

  return {
    open: (name, attributes) => {
      const parent = stack.at(-1);
      const spec = raw > 0 ? undefined : options.specs[`${spaceOf(name.uri)}:${name.local}`];
      const entry = openOf(name, attributes, spec, parent);

      begin(name, spec);

      openingXml(name, attributes, spec, {
        axis: entry.axis,
        inherit: parent?.inherit ?? options.inherit,
      });

      raw += spec?.raw === true || raw > 0 ? 1 : 0;
      stack.push({ ...entry, frame: spec?.fragment === undefined ? undefined : current() });
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

      raw -= raw > 0 ? 1 : 0;
      if (open?.text !== undefined) {
        const pieces = textSlots(open);

        if (pieces === undefined) {
          opaque.push(open.name.local);
        }
        (pieces ?? [escapeText(open.text)]).forEach(push);
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
