import type { InlineDecoration } from '../decorations/decorations.types';
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

const collect = (state: EditorState): readonly InlineDecoration[] =>
  state.plugins.flatMap((plugin) => plugin.props.decorations?.(state)?.decorations ?? []);

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

export const blockDecorations = (state: EditorState): BlockDecorations => {
  const blocks = new Map<NodeId, LocalDecoration[]>();
  const limit = state.doc.root.size - 2;

  for (const decoration of collect(state)) {
    const local =
      decoration.from < 0 || decoration.to > limit ? undefined : localOf(state, decoration);

    if (local !== undefined) {
      blocks.set(local.id, [...(blocks.get(local.id) ?? []), local.decoration]);
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
