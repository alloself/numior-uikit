import type { Doc, Slice } from '../doc/doc.types';
import { emptyTextblock } from '../doc/empty';
import { sharedDepth } from '../doc/resolve';
import { withContent } from '../model/node';
import { ContentNodeKind, type ContentNode, type IdSource } from '../model/node.types';
import { createMapping } from '../transform/mapping';
import { sliceSize } from '../transform/replace';
import { createTransform } from '../transform/transform';
import type { Transform } from '../transform/transform.types';
import { mapSelection, nearestCursor, selectionRange, validSelection } from './selection';
import type { Selection } from './selection.types';
import type { EditorState, Transaction } from './state.types';

const chainOf = (doc: Doc, pos: number, depth: number): ContentNode[] => {
  const resolved = doc.resolve(pos);
  let chain: ContentNode[] = [];

  for (let level = resolved.depth; level > depth; level -= 1) {
    chain = [withContent(resolved.node(level), chain)];
  }
  return chain;
};

const deleteRange = (transform: Transform, from: number, to: number): boolean => {
  const doc = transform.doc;
  const left = doc.resolve(from);
  const right = doc.resolve(to);

  if (
    left.depth === right.depth &&
    transform.maybeStep({
      kind: 'replace',
      from,
      to,
      slice: { content: [], openStart: 0, openEnd: 0 },
    }).ok
  ) {
    return true;
  }
  const depth = sharedDepth(left, right);

  const slice: Slice = {
    content: [...chainOf(doc, from, depth), ...chainOf(doc, to, depth)],
    openStart: left.depth - depth,
    openEnd: right.depth - depth,
  };

  return transform.maybeStep({ kind: 'replace', from, to, slice }).ok;
};

const clearDoc = (transform: Transform): boolean => {
  const doc = transform.doc;
  const first = doc.root.content[0];

  const block =
    first?.kind === ContentNodeKind.Element ? emptyTextblock(doc.schema, first.id) : undefined;

  return (
    block !== undefined &&
    transform.maybeStep({
      kind: 'replace',
      from: 0,
      to: doc.size,
      slice: { content: [block], openStart: 0, openEnd: 0 },
    }).ok
  );
};

export const createTransaction = (
  state: EditorState,
  ids?: IdSource,
  time = Date.now(),
): Transaction => {
  const transform = createTransform(state.doc, { ids });
  let selection = state.selection;
  let selectionStep = 0;
  let selectionSet = false;
  let storedMarks = state.storedMarks;
  let storedMarksSet = false;

  const currentSelection = (): Selection => {
    if (selectionStep < transform.steps.length) {
      const before = transform.docs[selectionStep] ?? transform.before;

      selection = mapSelection(
        selection,
        createMapping(transform.mapping.maps.slice(selectionStep)),
        before,
        transform.doc,
      );

      selectionStep = transform.steps.length;
    }
    return selection;
  };

  const placeCursor = (pos: number): void => {
    selection = nearestCursor(transform.doc, pos);
    selectionStep = transform.steps.length;
    selectionSet = true;
  };

  const transaction: Transaction = {
    get before() {
      return transform.before;
    },
    get doc() {
      return transform.doc;
    },
    get steps() {
      return transform.steps;
    },
    get docs() {
      return transform.docs;
    },
    get mapping() {
      return transform.mapping;
    },
    get changed() {
      return transform.changed;
    },
    time,
    get selection() {
      return currentSelection();
    },
    get selectionSet() {
      return selectionSet;
    },
    get storedMarks() {
      if (storedMarksSet) {
        return storedMarks;
      }
      return transform.changed ? null : state.storedMarks;
    },
    get storedMarksSet() {
      return storedMarksSet;
    },
    newId: () => transform.newId(),
    step: (step) => {
      transform.step(step);
      return transaction;
    },
    maybeStep: (step) => transform.maybeStep(step),
    replace: (from, to, slice) => {
      transform.replace(from, to, slice);
      return transaction;
    },
    insert: (pos, content) => {
      transform.insert(pos, content);
      return transaction;
    },
    delete: (from, to) => {
      deleteRange(transform, from, to);
      return transaction;
    },
    insertText: (text, from, to) => {
      const range =
        from === undefined
          ? selectionRange(transform.doc, currentSelection())
          : { from, to: to ?? from };

      const marks = transaction.storedMarks ?? undefined;

      transform.insertText(text, range.from, range.to, marks);

      if (from === undefined) {
        placeCursor(range.from + text.length);
      }
      return transaction;
    },
    addMark: (from, to, mark) => {
      transform.addMark(from, to, mark);
      return transaction;
    },
    removeMark: (from, to, mark) => {
      transform.removeMark(from, to, mark);
      return transaction;
    },
    setNodeAttrs: (pos, attrs) => {
      transform.setNodeAttrs(pos, attrs);
      return transaction;
    },
    setNodesMarkup: (changes) => {
      transform.setNodesMarkup(changes);
      return transaction;
    },
    setDocAttrs: (attrs) => {
      transform.setDocAttrs(attrs);
      return transaction;
    },
    split: (pos, depth, after) => {
      transform.split(pos, depth, after);
      return transaction;
    },
    join: (pos, depth) => {
      transform.join(pos, depth);
      return transaction;
    },
    setSelection: (next) => {
      selection = validSelection(transform.doc, next);
      selectionStep = transform.steps.length;
      selectionSet = true;
      return transaction;
    },
    setStoredMarks: (marks) => {
      storedMarks = marks;
      storedMarksSet = true;
      return transaction;
    },
    replaceSelection: (slice) => {
      const range = selectionRange(transform.doc, currentSelection());

      transform.replace(range.from, range.to, slice);
      placeCursor(range.from + sliceSize(slice));
      return transaction;
    },
    deleteSelection: () => {
      const range = selectionRange(transform.doc, currentSelection());

      if (range.from < range.to && deleteRange(transform, range.from, range.to)) {
        placeCursor(range.from);
      } else if (range.from === 0 && range.to === transform.doc.size && clearDoc(transform)) {
        placeCursor(1);
      }
      return transaction;
    },
    setMeta: (key, value) => {
      key.write(transaction, value);
      return transaction;
    },
    getMeta: (key) => key.read(transaction),
  };

  return transaction;
};
