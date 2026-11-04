import { sameAttrs } from '../model/node';
import { ContentNodeKind, type AttrValue, type ElementNode } from '../model/node.types';
import { matchesSplice } from '../schema/content-match';
import type { Schema } from '../schema/schema.types';
import { selectionRange } from '../state/selection';
import type { Command, EditorState } from '../state/state.types';
import { fits } from '../transform/replace';

interface Candidate {
  readonly pos: number;
  readonly parent: ElementNode;
  readonly index: number;
  readonly node: ElementNode;
}

interface Scan {
  readonly candidates: readonly Candidate[];
  readonly settled: boolean;
}

const acceptsAll = (
  schema: Schema,
  parent: ElementNode,
  retyped: readonly Candidate[],
): boolean => {
  const type = schema.nodes.get(parent.type);
  const [only, ...others] = retyped;

  if (type !== undefined && only !== undefined && others.length === 0) {
    return matchesSplice(type.content, parent, only.index, only.index + 1, [only.node]);
  }

  const replaced = new Map(retyped.map((candidate) => [candidate.index, candidate.node]));

  return fits(schema, {
    ...parent,
    content: parent.content.map((child, index) => replaced.get(index) ?? child),
  });
};

const scanTextblocks = (
  state: EditorState,
  type: string,
  attrs: Readonly<Record<string, AttrValue>>,
  stopAtFirst: boolean,
): Scan => {
  const { doc } = state;
  const { schema } = doc;
  const range = selectionRange(doc, state.selection);
  const candidates: Candidate[] = [];
  let settled = false;

  doc.nodesBetween(range.from, Math.max(range.to, range.from + 1), (node, pos, parent, index) => {
    if (stopAtFirst && (settled || candidates.length > 0)) {
      return false;
    }
    if (
      node.kind !== ContentNodeKind.Element ||
      schema.nodes.get(node.type)?.inlineContent !== true
    ) {
      return true;
    }

    const target = schema.element(type, { id: node.id, attrs, content: node.content });

    if (target.type === node.type && sameAttrs(target.attrs, node.attrs)) {
      settled = true;
    } else if (fits(schema, target)) {
      const candidate = { pos, parent, index, node: target };

      if (!stopAtFirst || acceptsAll(schema, parent, [candidate])) {
        candidates.push(candidate);
      }
    }
    return false;
  });

  return { candidates, settled };
};

const byParent = (candidates: readonly Candidate[]): Map<ElementNode, Candidate[]> => {
  const groups = new Map<ElementNode, Candidate[]>();

  for (const candidate of candidates) {
    const group = groups.get(candidate.parent);

    if (group === undefined) {
      groups.set(candidate.parent, [candidate]);
    } else {
      group.push(candidate);
    }
  }
  return groups;
};

const accepted = (schema: Schema, candidates: readonly Candidate[]): Candidate[] =>
  [...byParent(candidates)].flatMap(([parent, group]) =>
    acceptsAll(schema, parent, group)
      ? group
      : group.filter((candidate) => acceptsAll(schema, parent, [candidate])),
  );

export const setBlockType =
  (type: string, attrs: Readonly<Record<string, AttrValue>> = {}): Command =>
  (state, dispatch) => {
    if (dispatch === undefined) {
      const scan = scanTextblocks(state, type, attrs, true);

      return scan.settled || scan.candidates.length > 0;
    }

    const scan = scanTextblocks(state, type, attrs, false);
    const changes = accepted(state.doc.schema, scan.candidates);

    if (changes.length === 0) {
      return scan.settled;
    }

    dispatch(
      state.tr.setNodesMarkup(
        changes.map((candidate) => ({
          pos: candidate.pos,
          type: candidate.node.type,
          attrs: candidate.node.attrs,
        })),
      ),
    );

    return true;
  };
