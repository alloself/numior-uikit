import { describe, expect, it } from 'vite-plus/test';
import {
  createDoc,
  createMetaKey,
  createState,
  definePlugin,
  mapSelection,
  nearestCursor,
  selectionRange,
  textSelection,
  validSelection,
  type Doc,
  type Transaction,
} from '../src';
import { buildWith, notes } from './support/notes';

const { doc, node } = buildWith();

const page = (): Doc =>
  createDoc(
    notes,
    doc(
      node('paragraph', ['Hello']),
      node('image', [], { src: 'a.png' }),
      node('list', [node('item', [node('paragraph', ['ab'])])]),
    ),
  );

describe('selections', () => {
  it('measures text, node, block, cell and whole document selections', () => {
    const target = page();
    const image = target.root.content[1];
    const list = target.root.content[2];
    const imageId = image?.kind === 'element' ? image.id : '';
    const listId = list?.kind === 'element' ? list.id : '';

    expect(selectionRange(target, textSelection(4, 2))).toEqual({ from: 2, to: 4 });
    expect(selectionRange(target, { kind: 'node', id: imageId })).toEqual({ from: 7, to: 8 });

    expect(selectionRange(target, { kind: 'block', anchorId: listId, headId: imageId })).toEqual({
      from: 7,
      to: 16,
    });

    expect(
      selectionRange(target, {
        kind: 'cell',
        tableId: listId,
        anchor: { row: 0, col: 0 },
        head: { row: 0, col: 0 },
      }),
    ).toEqual({ from: 8, to: 16 });

    expect(selectionRange(target, { kind: 'all' })).toEqual({ from: 0, to: 16 });
    expect(selectionRange(target, { kind: 'node', id: 'gone' })).toEqual({ from: 0, to: 0 });
  });

  it('moves a cursor into the nearest text and drops selections of missing nodes', () => {
    const target = page();

    expect(nearestCursor(target, 0)).toEqual(textSelection(1));
    expect(nearestCursor(target, 7)).toEqual(textSelection(11));
    expect(nearestCursor(target, 16)).toEqual(textSelection(13));
    expect(validSelection(target, textSelection(7))).toEqual(textSelection(11));
    expect(validSelection(target, { kind: 'node', id: 'gone' })).toEqual(textSelection(1));
    expect(validSelection(target, { kind: 'all' })).toEqual({ kind: 'all' });

    expect(nearestCursor(createDoc(notes, doc(node('image', [], { src: 'a' }))), 0)).toEqual({
      kind: 'all',
    });
  });

  it('maps selections through steps and falls back to text when their node is gone', () => {
    const before = page();
    const state = createState({ doc: before, selection: textSelection(3, 5) });
    const typed = state.tr.insertText('XY', 1);

    expect(typed.selection).toEqual(textSelection(5, 7));

    const image = before.root.content[1];

    const removed = createState({
      doc: before,
      selection: { kind: 'node', id: image?.kind === 'element' ? image.id : '' },
    }).tr.delete(7, 8);

    expect(removed.selection).toEqual(textSelection(10));

    expect(mapSelection({ kind: 'all' }, removed.mapping, before, removed.doc)).toEqual({
      kind: 'all',
    });
  });
});

describe('editor state', () => {
  it('applies transactions with their selection and stored marks', () => {
    const state = createState({ doc: page() });

    expect(state.selection).toEqual(textSelection(1));

    const bold = notes.mark('bold');
    const typed = state.apply(state.tr.setStoredMarks([bold]).insertText('Hey '));

    expect(typed.doc.textBetween(0, 10)).toBe('Hey Hello');
    expect(typed.selection).toEqual(textSelection(5));
    expect(typed.storedMarks).toEqual([bold]);
    expect(typed.apply(typed.tr.insertText('!')).storedMarks).toBeNull();
    expect(state.apply(state.tr.setSelection(textSelection(3))).storedMarks).toBeNull();
    expect(state.tr.time).toBeGreaterThan(0);
  });

  it('keeps plugin state, filters transactions and appends follow-up transactions', () => {
    const counter = definePlugin<number>({
      name: 'counter',
      state: { init: () => 0, apply: (tr, value) => value + tr.steps.length },
    });

    const locked = createMetaKey<boolean>('locked');

    const guard = definePlugin({
      name: 'guard',
      filterTransaction: (tr) => tr.getMeta(locked) !== true,
    });

    const appended: Transaction[] = [];

    const echo = definePlugin({
      name: 'echo',
      appendTransaction: (transactions, _before, after) => {
        if (transactions.some((tr) => tr.getMeta(locked) === false)) {
          const tr = after.tr.insertText('!', 1);

          appended.push(tr);
          return tr;
        }
        return undefined;
      },
    });

    const state = createState({ doc: page(), plugins: [counter, guard, echo] });

    expect(counter.getState(state)).toBe(0);
    expect(state.apply(state.tr.insertText('ab', 1).setMeta(locked, true))).toBe(state);

    const result = state.applyTransaction(state.tr.insertText('ab', 1).setMeta(locked, false));

    expect(result.transactions).toHaveLength(2);
    expect(appended).toHaveLength(1);
    expect(result.state.doc.textBetween(0, 10)).toBe('!abHello');
    expect(counter.getState(result.state)).toBe(2);
    expect(locked.read(result.transactions[0] ?? state.tr)).toBe(false);
    expect(guard.getState(state)).toBeUndefined();
  });

  it('replaces and deletes the selection, keeping both edges across different depths', () => {
    const state = createState({ doc: page(), selection: textSelection(3, 12) });
    const deleted = state.tr.deleteSelection();

    expect(deleted.doc.textBetween(0, deleted.doc.size, '|')).toBe('He|b');
    expect(deleted.selection).toEqual(textSelection(3));

    const pasted = createState({ doc: page(), selection: textSelection(2, 4) }).tr.replaceSelection(
      {
        content: [notes.text('EL')],
        openStart: 0,
        openEnd: 0,
      },
    );

    expect(pasted.doc.textBetween(0, 6)).toBe('HELlo');
    expect(pasted.selection).toEqual(textSelection(4));
    expect(createState({ doc: page() }).tr.deleteSelection().changed).toBe(false);
  });
});
