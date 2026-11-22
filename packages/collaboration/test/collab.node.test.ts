import {
  anchorsOf,
  commentAnchors,
  createState,
  history,
  redo,
  setAnchor,
  stepToJSON,
  textSelection,
  undo,
  undoDepth,
  type EditorState,
  type Mark,
  type Step,
} from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import {
  collab,
  collabVersion,
  confirmSteps,
  editorCollabDocument,
  positionsSince,
  sendableSteps,
} from '../src';
import { paragraphs } from './harness/network';
import { received, settledWith } from './harness/received';

const BOLD: Mark = { type: 'bold', attrs: {} };

const BEYOND = stepToJSON({
  kind: 'replace',
  from: 90,
  to: 95,
  slice: { content: [], openStart: 0, openEnd: 0 },
});

const started = (): EditorState =>
  createState({ doc: paragraphs('one', 'two'), plugins: [history(), collab({ version: 3 })] });

const insertion = (state: EditorState, text: string, at: number): readonly Step[] =>
  state.tr.insertText(text, at).steps;

const typedAt = (state: EditorState, text: string, at: number): EditorState =>
  state.apply(state.tr.insertText(text, at));

const REMEMBERED = 512;

const afterOthers = (start: EditorState, count: number): EditorState =>
  Array.from({ length: count }).reduce<EditorState>(
    (state) => state.apply(received(state, insertion(state, 'a', 1))),
    start,
  );

const firstText = (state: EditorState): string =>
  state.doc.root.content[0]?.kind === 'element'
    ? state.doc.textBetween(0, state.doc.root.content[0].size)
    : '';

const held = (start: EditorState) => {
  let state = start;

  const document = editorCollabDocument({
    schema: fixtureSchema,
    getState: () => state,
    dispatch: (tr) => {
      state = state.apply(tr);
    },
    load: () => {
      state = start;
    },
  });

  return { document, state: () => state };
};

describe('an editor document behind a client', () => {
  it.each([
    ['a clean document', started],
    ['a document with unsent text', () => typedAt(started(), 'L', 2)],
  ])('refuses steps that do not fit %s and leaves it as it was', (_name, start) => {
    const before = start();
    const { document, state } = held(before);

    const taken = document.receive({ version: 3, clientId: 'other', steps: [BEYOND] });

    expect(taken).toBe(false);
    expect(state()).toBe(before);
  });

  it('refuses rebased steps of its own that do not fit and leaves the document as it was', () => {
    const before = typedAt(started(), 'L', 2);
    const { document, state } = held(before);

    expect(document.settle(1, [BEYOND], 4)).toBe(false);
    expect(state()).toBe(before);
  });
});

describe('positions since a version', () => {
  it('carries a place through steps of others, its own confirmed steps and the ones still waiting', () => {
    const start = started();
    const other = start.apply(received(start, insertion(start, 'ab', 1)));
    const typed = typedAt(other, 'x', 1);
    const confirmed = typed.apply(confirmSteps(typed, 1, 5));
    const waiting = typedAt(confirmed, 'y', 1);

    expect(positionsSince(other, 3)?.map(2)).toBe(4);
    expect(positionsSince(typed, 3)?.map(2)).toBe(5);
    expect(positionsSince(waiting, 3)?.map(2)).toBe(6);
    expect(positionsSince(waiting, 4)?.map(2)).toBe(4);
    expect(positionsSince(waiting, 5)?.map(2)).toBe(3);
  });

  it('carries a place through the steps the server wrote instead of the sent ones', () => {
    const start = started();
    const typed = typedAt(start, 'x', 1);
    const settled = typed.apply(settledWith(typed, 1, insertion(start, 'x', 2), 4));

    expect(positionsSince(settled, 3)?.map(3)).toBe(4);
    expect(positionsSince(settled, 3)?.map(1, -1)).toBe(1);
  });

  it('answers nothing for a version ahead of it, for one it no longer remembers and without the plugin', () => {
    const start = started();
    const far = afterOthers(start, REMEMBERED + 1);

    expect(positionsSince(start, 4)).toBeUndefined();
    expect(positionsSince(start, 2)).toBeUndefined();
    expect(positionsSince(far, 3)).toBeUndefined();
    expect(positionsSince(far, 4)?.map(2)).toBe(REMEMBERED + 2);
    expect(positionsSince(createState({ doc: paragraphs('one') }), 0)).toBeUndefined();
  });
});

describe('collab plugin', () => {
  it('moves comment anchors through remote steps under unconfirmed text', () => {
    const base = createState({
      doc: paragraphs('one', 'two'),
      plugins: [commentAnchors, history(), collab({ version: 3 })],
    });

    const selected = base.apply(base.tr.setSelection(textSelection(1, 4)));
    let anchored = selected;

    setAnchor('c')(selected, (tr) => {
      anchored = selected.apply(tr);
    });

    const remote = insertion(base, 'rr', 1);
    const typed = typedAt(anchored, 'L', 7);

    const next = typed.apply(received(typed, remote));

    expect(anchorsOf(next).get('c')?.range).toMatchObject({ from: 3, to: 6 });
  });

  it('queues local steps as unconfirmed', () => {
    const state = started();

    const typed = typedAt(state, 'x', 1);

    expect(sendableSteps(typed)).toHaveLength(1);
    expect(collabVersion(typed)).toBe(3);
  });

  it('drops confirmed steps and moves the version', () => {
    const typed = typedAt(typedAt(started(), 'a', 1), 'b', 2);

    const confirmed = typed.apply(confirmSteps(typed, 1, 4));

    expect(sendableSteps(confirmed)).toHaveLength(1);
    expect(collabVersion(confirmed)).toBe(4);
  });

  it('confirms the sent steps the server kept as they were without touching the document', () => {
    const typed = typedAt(typedAt(started(), 'a', 1), 'b', 2);

    const settling = settledWith(typed, 1, sendableSteps(typed).slice(0, 1), 4);
    const settled = typed.apply(settling);

    expect(settling.changed).toBe(false);
    expect(firstText(settled)).toBe('abone');
    expect(sendableSteps(settled)).toHaveLength(1);
    expect(collabVersion(settled)).toBe(4);
  });

  it('replaces the sent steps with what the server made of them and keeps later typing', () => {
    const state = started();
    const typed = typedAt(typedAt(state, 'a', 1), 'b', 2);

    const settled = typed.apply(settledWith(typed, 1, insertion(state, 'a', 4), 4));

    expect(firstText(settled)).toBe('bonea');
    expect(collabVersion(settled)).toBe(4);

    expect(sendableSteps(settled)).toEqual([
      expect.objectContaining({ kind: 'replace', from: 1, to: 1 }),
    ]);
  });

  it('takes back sent steps the server dropped', () => {
    const typed = typedAt(typedAt(started(), 'a', 1), 'b', 2);

    const settled = typed.apply(settledWith(typed, 1, [], 3));

    expect(firstText(settled)).toBe('bone');
    expect(sendableSteps(settled)).toHaveLength(1);
    expect(collabVersion(settled)).toBe(3);
  });

  it('applies remote steps without touching an empty queue', () => {
    const state = started();

    const next = state.apply(received(state, insertion(state, 'r', 1)));

    expect(firstText(next)).toBe('rone');
    expect(sendableSteps(next)).toHaveLength(0);
    expect(collabVersion(next)).toBe(4);
  });

  it('rebases local steps over remote ones in server order', () => {
    const state = started();
    const remote = insertion(state, 'r', 4);
    const typed = typedAt(state, 'L', 1);

    const next = typed.apply(received(typed, remote));

    expect(firstText(next)).toBe('Loner');
    expect(collabVersion(next)).toBe(4);

    expect(sendableSteps(next)).toEqual([
      expect.objectContaining({ kind: 'replace', from: 1, to: 1 }),
    ]);
  });

  it('keeps the caret inside unconfirmed text', () => {
    const state = started();
    const remote = insertion(state, 'rr', 1);
    const typed = typedAt(state, 'abcd', 1);
    const placed = typed.apply(typed.tr.setSelection(textSelection(3)));

    const next = placed.apply(received(placed, remote));

    expect(firstText(next)).toBe('rrabcdone');
    expect(next.selection).toEqual(textSelection(5));
  });

  it('keeps the stored marks of the local user', () => {
    const state = started();
    const marked = state.apply(state.tr.setStoredMarks([BOLD]));

    const next = marked.apply(received(marked, insertion(marked, 'r', 4)));

    expect(next.storedMarks).toEqual([BOLD]);
  });

  it('undoes unconfirmed text after a remote change without losing the remote text', () => {
    const state = started();
    const remote = insertion(state, 'rr', 1);
    const typed = typedAt(state, 'L', 4);
    const rebased = typed.apply(received(typed, remote));
    let current = rebased;

    undo(current, (tr) => {
      current = current.apply(tr);
    });

    expect(firstText(rebased)).toBe('rroneL');
    expect(firstText(current)).toBe('rrone');
    expect(undoDepth(current)).toBe(0);
  });

  it('undoes only its own text when a remote insertion lands on the same spot', () => {
    const state = started();
    const remote = insertion(state, 'rr', 1);
    const typed = typedAt(state, 'L', 1);
    const rebased = typed.apply(received(typed, remote));
    let current = rebased;

    undo(current, (tr) => {
      current = current.apply(tr);
    });

    expect(firstText(rebased)).toBe('rrLone');
    expect(firstText(current)).toBe('rrone');
  });

  it('undoes a word it wrote and leaves the text someone else typed inside the word', () => {
    const typed = typedAt(started(), 'LMNO', 2);
    const confirmed = typed.apply(confirmSteps(typed, 1, 4));
    const rebased = confirmed.apply(received(confirmed, insertion(confirmed, 'rr', 4)));
    let current = rebased;

    undo(current, (tr) => {
      current = current.apply(tr);
    });

    expect(firstText(rebased)).toBe('oLMrrNOne');
    expect(firstText(current)).toBe('orrne');

    redo(current, (tr) => {
      current = current.apply(tr);
    });

    expect(firstText(current)).toBe('oLMrrNOne');
  });

  it('drops local text typed inside a range the remote side deleted', () => {
    const state = started();
    const remote = state.tr.delete(1, 3).steps;
    const typed = typedAt(state, 'L', 2);

    const next = typed.apply(received(typed, remote));

    expect(firstText(next)).toBe('e');
    expect(sendableSteps(next)).toHaveLength(0);
  });

  it('brings back a letter it deleted after someone else deleted the text around its place', () => {
    const state = started();
    const deleted = state.apply(state.tr.delete(2, 3));
    const confirmed = deleted.apply(confirmSteps(deleted, 1, 4));
    const rebased = confirmed.apply(received(confirmed, confirmed.tr.delete(1, 3).steps));
    let current = rebased;

    undo(current, (tr) => {
      current = current.apply(tr);
    });

    expect(firstText(rebased)).toBe('');
    expect(firstText(current)).toBe('n');
  });

  it('leaves a letter deleted when someone else deleted it at the same time', () => {
    const state = started();
    const remote = state.tr.delete(1, 4).steps;
    const deleted = state.apply(state.tr.delete(2, 3));

    const next = deleted.apply(received(deleted, remote));

    expect(firstText(next)).toBe('');
    expect(undoDepth(next)).toBe(0);
  });

  it('undoes text confirmed before a remote change', () => {
    const typed = typedAt(started(), 'L', 4);
    const confirmed = typed.apply(confirmSteps(typed, 1, 4));
    const rebased = confirmed.apply(received(confirmed, insertion(confirmed, 'rr', 1)));
    let current = rebased;

    undo(current, (tr) => {
      current = current.apply(tr);
    });

    expect(firstText(current)).toBe('rrone');
  });

  it('drops a local step whose target the remote side deleted', () => {
    const state = started();
    const remote = state.tr.delete(0, state.doc.root.content[0]?.kind === 'element' ? 5 : 0).steps;
    const marked = state.apply(state.tr.addMark(1, 4, BOLD));

    const next = marked.apply(received(marked, remote));

    expect(sendableSteps(next)).toHaveLength(0);
  });
});
