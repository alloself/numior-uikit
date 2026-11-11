import {
  DecorationTag,
  type BlockDecoration,
  type DecorationSet,
  type InlineDecoration,
} from '../decorations/decorations.types';
import { ContentNodeKind, type ElementNode, type NodeId } from '../model/node.types';
import type { EditorState } from '../state/state.types';

export interface LocalDecoration {
  readonly from: number;
  readonly to: number;
  readonly class: string;
  readonly tag: DecorationTag;
}

interface PlacedDecoration {
  readonly id: NodeId;
  readonly decoration: LocalDecoration;
}

interface PlacedRanges {
  readonly root: ElementNode;
  readonly blocks: BlockDecorations;
}

export type BlockDecorations = ReadonlyMap<NodeId, readonly LocalDecoration[]>;

export interface TextSegment {
  readonly from: number;
  readonly to: number;
  readonly classes: readonly string[];
  readonly tag: DecorationTag;
}

export const decorationSets = (state: EditorState): readonly DecorationSet[] =>
  state.plugins.flatMap((plugin) => {
    const set = plugin.props.decorations?.(state);

    return set === undefined ? [] : [set];
  });

const fitsBlock = (state: EditorState, decoration: BlockDecoration): boolean => {
  const node = state.doc.byId(decoration.block);

  return (
    node !== undefined &&
    state.doc.schema.nodes.get(node.type)?.inlineContent === true &&
    decoration.from >= 0 &&
    decoration.to <= node.size - 2
  );
};

const piece = (
  id: NodeId,
  start: number,
  size: number,
  decoration: InlineDecoration,
): PlacedDecoration | undefined => {
  const from = Math.max(decoration.from - start, 0);
  const to = Math.min(decoration.to - start, size);

  return to > from
    ? { id, decoration: { from, to, class: decoration.class, tag: decoration.tag } }
    : undefined;
};

const piecesOf = (
  state: EditorState,
  decoration: InlineDecoration,
): readonly PlacedDecoration[] => {
  const { doc } = state;
  const resolved = doc.resolve(decoration.from);

  if (
    doc.schema.nodes.get(resolved.parent.type)?.inlineContent === true &&
    decoration.to <= resolved.end(resolved.depth)
  ) {
    const one = piece(
      resolved.parent.id,
      resolved.start(resolved.depth),
      resolved.parent.size - 2,
      decoration,
    );

    return one === undefined ? [] : [one];
  }

  const found: PlacedDecoration[] = [];

  doc.nodesBetween(decoration.from, decoration.to, (node, pos) => {
    if (node.kind !== ContentNodeKind.Element || !doc.schema.nodes.get(node.type)?.inlineContent) {
      return true;
    }

    const part = piece(node.id, pos + 1, node.size - 2, decoration);

    if (part !== undefined) {
      found.push(part);
    }
    return false;
  });

  return found;
};

const addTo = (
  blocks: Map<NodeId, LocalDecoration[]>,
  id: NodeId,
  decoration: LocalDecoration,
): void => {
  const list = blocks.get(id);

  if (list === undefined) {
    blocks.set(id, [decoration]);
  } else {
    list.push(decoration);
  }
};

export const sameSets = (
  left: readonly DecorationSet[],
  right: readonly DecorationSet[],
): boolean => left.length === right.length && left.every((set, index) => set === right[index]);

const NONE: BlockDecorations = new Map();

const ranges = new WeakMap<DecorationSet, PlacedRanges>();

const anchored = new WeakMap<DecorationSet, BlockDecorations>();

const rangesOf = (state: EditorState, set: DecorationSet): BlockDecorations => {
  if (set.decorations.length === 0) {
    return NONE;
  }

  const known = ranges.get(set);

  if (known?.root === state.doc.root) {
    return known.blocks;
  }

  const blocks = new Map<NodeId, LocalDecoration[]>();
  const limit = state.doc.root.size - 2;

  for (const decoration of set.decorations) {
    if (decoration.from < 0 || decoration.to > limit) {
      continue;
    }

    piecesOf(state, decoration).forEach((part) => {
      addTo(blocks, part.id, part.decoration);
    });
  }

  ranges.set(set, { root: state.doc.root, blocks });
  return blocks;
};

const anchoredOf = (state: EditorState, set: DecorationSet): BlockDecorations => {
  if (set.blocks.length === 0) {
    return NONE;
  }

  const known = anchored.get(set);

  if (known !== undefined) {
    return known;
  }

  const blocks = new Map<NodeId, LocalDecoration[]>();

  for (const decoration of set.blocks) {
    if (!fitsBlock(state, decoration)) {
      continue;
    }

    addTo(blocks, decoration.block, {
      from: decoration.from,
      to: decoration.to,
      class: decoration.class,
      tag: decoration.tag,
    });
  }

  anchored.set(set, blocks);
  return blocks;
};

const laidOver = (
  blocks: Map<NodeId, readonly LocalDecoration[]>,
  part: BlockDecorations,
): void => {
  for (const [id, list] of part) {
    const known = blocks.get(id);

    blocks.set(id, known === undefined ? list : [...known, ...list]);
  }
};

export const blockDecorations = (
  state: EditorState,
  sets: readonly DecorationSet[],
): BlockDecorations => {
  const blocks = new Map<NodeId, readonly LocalDecoration[]>();

  for (const set of sets) {
    laidOver(blocks, rangesOf(state, set));
    laidOver(blocks, anchoredOf(state, set));
  }
  return blocks;
};

const signatureOf = (decorations: readonly LocalDecoration[] | undefined): string =>
  (decorations ?? [])
    .map(
      (decoration) => `${decoration.from}:${decoration.to}:${decoration.tag}:${decoration.class}`,
    )
    .join(' ');

export const changedBlocks = (before: BlockDecorations, after: BlockDecorations): NodeId[] =>
  [...new Set([...before.keys(), ...after.keys()])].filter((id) => {
    const earlier = before.get(id);
    const later = after.get(id);

    return earlier !== later && signatureOf(earlier) !== signatureOf(later);
  });

export const segmentsOf = (
  decorations: readonly LocalDecoration[],
  start: number,
  length: number,
): TextSegment[] => {
  const edges = new Set([0, length]);

  for (const decoration of decorations) {
    for (const edge of [decoration.from - start, decoration.to - start]) {
      if (edge <= 0 || edge >= length) {
        continue;
      }

      edges.add(edge);
    }
  }

  const sorted = [...edges].toSorted((left, right) => left - right);

  return sorted.slice(1).map((to, index) => {
    const from = sorted[index] ?? 0;

    const covering = decorations.filter(
      (decoration) => decoration.from - start < to && decoration.to - start > from,
    );

    return {
      from,
      to,
      classes: covering.map((decoration) => decoration.class),
      tag: covering.some((decoration) => decoration.tag === DecorationTag.Mark) ? 'mark' : 'span',
    };
  });
};
