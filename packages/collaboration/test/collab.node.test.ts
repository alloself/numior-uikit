import {
  createState,
  history,
  textSelection,
  undo,
  undoDepth,
  type EditorState,
  type Mark,
  type Step,
} from '@numior/editor-core';
import { describe, expect, it } from 'vite-plus/test';
import { collab, collabVersion, confirmSteps, receiveSteps, sendableSteps } from '../src';
import { paragraphs } from './harness/network';

const BOLD: Mark = { type: 'bold', attrs: {} };

const started = (): EditorState =>
  createState({ doc: paragraphs('one', 'two'), plugins: [history(), collab({ version: 3 })] });

const insertion = (state: EditorState, text: string, at: number): readonly Step[] =>
  state.tr.insertText(text, at).steps;

const typedAt = (state: EditorState, text: string, at: number): EditorState =>
  state.apply(state.tr.insertText(text, at));

const firstText = (state: EditorState): string =>
  state.doc.root.content[0]?.kind === 'element'
    ? state.doc.textBetween(0, state.doc.root.content[0].size)
    : '';

describe('collab plugin', () => {
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

  it('applies remote steps without touching an empty queue', () => {
    const state = started();

    const next = state.apply(receiveSteps(state, insertion(state, 'r', 1)));

    expect(firstText(next)).toBe('rone');
    expect(sendableSteps(next)).toHaveLength(0);
    expect(collabVersion(next)).toBe(4);
  });

  it('rebases local steps over remote ones in server order', () => {
    const state = started();
    const remote = insertion(state, 'r', 4);
    const typed = typedAt(state, 'L', 1);

    const next = typed.apply(receiveSteps(typed, remote));

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

    const next = placed.apply(receiveSteps(placed, remote));

    expect(firstText(next)).toBe('rrabcdone');
    expect(next.selection).toEqual(textSelection(5));
  });

  it('keeps the stored marks of the local user', () => {
    const state = started();
    const marked = state.apply(state.tr.setStoredMarks([BOLD]));

    const next = marked.apply(receiveSteps(marked, insertion(marked, 'r', 4)));

    expect(next.storedMarks).toEqual([BOLD]);
  });

  it('undoes unconfirmed text after a remote change without losing the remote text', () => {
    const state = started();
    const remote = insertion(state, 'rr', 1);
    const typed = typedAt(state, 'L', 4);
    const rebased = typed.apply(receiveSteps(typed, remote));
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
    const rebased = typed.apply(receiveSteps(typed, remote));
    let current = rebased;

    undo(current, (tr) => {
      current = current.apply(tr);
    });

    expect(firstText(rebased)).toBe('rrLone');
    expect(firstText(current)).toBe('rrone');
  });

  it('drops local text typed inside a range the remote side deleted', () => {
    const state = started();
    const remote = state.tr.delete(1, 3).steps;
    const typed = typedAt(state, 'L', 2);

    const next = typed.apply(receiveSteps(typed, remote));

    expect(firstText(next)).toBe('e');
    expect(sendableSteps(next)).toHaveLength(0);
  });

  it('undoes text confirmed before a remote change', () => {
    const typed = typedAt(started(), 'L', 4);
    const confirmed = typed.apply(confirmSteps(typed, 1, 4));
    const rebased = confirmed.apply(receiveSteps(confirmed, insertion(confirmed, 'rr', 1)));
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

    const next = marked.apply(receiveSteps(marked, remote));

    expect(sendableSteps(next)).toHaveLength(0);
  });
});
