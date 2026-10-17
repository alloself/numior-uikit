import type {
  BlockDecoration,
  DecorationSet,
  InlineDecoration,
} from '../decorations/decorations.types';
import type { NodeId } from '../model/node.types';
import type { EditorState } from '../state/state.types';

export interface LocalDecoration {
  readonly from: number;
  readonly to: number;
  readonly class: string;
}

export type BlockDecorations = ReadonlyMap<NodeId, readonly LocalDecoration[]>;

export interface TextSegment {
  readonly from: number;
  readonly to: number;
  readonly classes: readonly string[];
}

const setsOf = (state: EditorState): readonly DecorationSet[] =>
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

const localOf = (state: EditorState, decoration: InlineDecoration) => {
  const resolved = state.doc.resolve(decoration.from);
  const type = state.doc.schema.nodes.get(resolved.parent.type);

  if (type?.inlineContent !== true) {
    return undefined;
  }

  const start = resolved.start(resolved.depth);
  const to = Math.min(decoration.to, resolved.end(resolved.depth)) - start;

  return to > decoration.from - start
    ? {
        id: resolved.parent.id,
        decoration: { from: decoration.from - start, to, class: decoration.class },
      }
    : undefined;
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

export const blockDecorations = (state: EditorState): BlockDecorations => {
  const blocks = new Map<NodeId, LocalDecoration[]>();
  const limit = state.doc.root.size - 2;

  for (const set of setsOf(state)) {
    for (const decoration of set.decorations) {
      const local =
        decoration.from < 0 || decoration.to > limit ? undefined : localOf(state, decoration);

      if (local !== undefined) {
        addTo(blocks, local.id, local.decoration);
      }
    }
    for (const decoration of set.blocks) {
      if (fitsBlock(state, decoration)) {
        addTo(blocks, decoration.block, {
          from: decoration.from,
          to: decoration.to,
          class: decoration.class,
        });
      }
    }
  }
  return blocks;
};

const signatureOf = (decorations: readonly LocalDecoration[] | undefined): string =>
  (decorations ?? [])
    .map((decoration) => `${decoration.from}:${decoration.to}:${decoration.class}`)
    .join(' ');

export const changedBlocks = (before: BlockDecorations, after: BlockDecorations): NodeId[] =>
  [...new Set([...before.keys(), ...after.keys()])].filter(
    (id) => signatureOf(before.get(id)) !== signatureOf(after.get(id)),
  );

export const segmentsOf = (
  decorations: readonly LocalDecoration[],
  start: number,
  length: number,
): TextSegment[] => {
  const edges = new Set([0, length]);

  for (const decoration of decorations) {
    for (const edge of [decoration.from - start, decoration.to - start]) {
      if (edge > 0 && edge < length) {
        edges.add(edge);
      }
    }
  }

  const sorted = [...edges].toSorted((left, right) => left - right);

  return sorted.slice(1).map((to, index) => {
    const from = sorted[index] ?? 0;

    return {
      from,
      to,
      classes: decorations
        .filter((decoration) => decoration.from - start < to && decoration.to - start > from)
        .map((decoration) => decoration.class),
    };
  });
};
