import type { ResolvedPos } from '../doc/doc.types';
import type { ElementNode } from '../model/node.types';
import { isCursor, selectionRange, textSelection } from '../state/selection';
import { SelectionKind, type Command, type EditorState } from '../state/state.types';
import { attempt } from './attempt';
import { PROBE_ID, followingTextblock, isList, isTextblock, splices } from './blocks';
import { sequence } from './format';
import { gapText } from './gap';
import { concealed } from './join';

interface Spot {
  readonly at: number;
  readonly parent: ElementNode;
  readonly index: number;
  readonly outer: ElementNode | undefined;
}

const spotAfter = ($pos: ResolvedPos, depth: number): Spot => ({
  at: $pos.after(depth),
  parent: $pos.node(depth - 1),
  index: $pos.indexAt(depth - 1) + 1,
  outer: depth >= 2 ? $pos.node(depth - 2) : undefined,
});

const spotAt = ($pos: ResolvedPos): Spot => ({
  at: $pos.pos,
  parent: $pos.parent,
  index: $pos.index,
  outer: $pos.depth >= 1 ? $pos.node($pos.depth - 1) : undefined,
});

const spotsAround = ($pos: ResolvedPos): Spot[] =>
  Array.from({ length: $pos.depth }, (_, step) => spotAfter($pos, $pos.depth - step));

const spotsOf = (state: EditorState): Spot[] => {
  const $end = state.doc.resolve(selectionRange(state.doc, state.selection).to);

  return state.selection.kind === SelectionKind.Text
    ? spotsAround($end)
    : [spotAt($end), ...spotsAround($end)];
};

const takesLine = (state: EditorState, spot: Spot): boolean => {
  const { schema } = state.doc;
  const type = followingTextblock(schema, spot.parent);

  return (
    type !== undefined &&
    !isList(schema, spot.parent) &&
    !isList(schema, spot.outer) &&
    !concealed(state, spot.parent, spot.index) &&
    splices(schema, spot.parent, spot.index, spot.index, [schema.element(type, { id: PROBE_ID })])
  );
};

const lineAt =
  (spot: Spot): Command =>
  (state, dispatch) => {
    const type = followingTextblock(state.doc.schema, spot.parent);

    return (
      type !== undefined &&
      attempt(state, dispatch, (tr) => {
        tr.insert(spot.at, [tr.doc.schema.element(type, { id: tr.newId() })]);
        tr.setSelection(textSelection(spot.at + 1));
        return true;
      })
    );
  };

const onEmptyLine = (state: EditorState): boolean => {
  const { doc, selection } = state;

  if (selection.kind !== SelectionKind.Text || !isCursor(selection)) {
    return false;
  }
  const $head = doc.resolve(selection.head);

  return (
    isTextblock(doc.schema, $head.parent) &&
    $head.parent.content.length === 0 &&
    !($head.depth >= 2 && isList(doc.schema, $head.node($head.depth - 2)))
  );
};

export const insertBelow =
  (command: Command): Command =>
  (state, dispatch) => {
    if (state.selection.kind === SelectionKind.Gap) {
      return command(state, dispatch) || sequence(gapText(''), command)(state, dispatch);
    }
    if (onEmptyLine(state) && command(state, dispatch)) {
      return true;
    }
    return (
      spotsOf(state).some(
        (spot) => takesLine(state, spot) && sequence(lineAt(spot), command)(state, dispatch),
      ) || command(state, dispatch)
    );
  };
