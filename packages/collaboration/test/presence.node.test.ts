import {
  createState,
  textSelection,
  type DecorationSet,
  type EditorState,
} from '@numior/editor-core';
import { describe, expect, it } from 'vite-plus/test';
import {
  collab,
  confirmSteps,
  presenceChanged,
  presenceOf,
  remotePeers,
  remotePresence,
  samePresence,
  setRemotePresence,
  type EditorPresence,
} from '../src';
import { paragraphs } from './harness/network';
import { received } from './harness/received';

const ANN = { id: 'ann', name: 'Ann' };

const presenceAt = (block: string, offset: number, head = offset): EditorPresence => ({
  user: ANN,
  selection: { anchor: { block, offset }, head: { block, offset: head } },
});

const started = (): EditorState =>
  createState({ doc: paragraphs('one', 'two'), plugins: [remotePresence(), collab()] });

const decorationsOf = (state: EditorState): DecorationSet | undefined =>
  state.plugins[0]?.props.decorations?.(state);

const withPeers = (state: EditorState, values: readonly (readonly [string, unknown])[]) =>
  state.apply(setRemotePresence(state, new Map(values)));

describe('remote presence', () => {
  it('places a peer by block and offset', () => {
    const state = withPeers(started(), [['c1', presenceAt('p1', 2)]]);

    expect(remotePeers(state)).toEqual([
      expect.objectContaining({ clientId: 'c1', user: ANN, anchor: 8, head: 8 }),
    ]);
  });

  it('clamps an offset past the end of the block', () => {
    const state = withPeers(started(), [['c1', presenceAt('p0', 99)]]);

    expect(remotePeers(state)[0]?.head).toBe(4);
  });

  it('leaves a peer without a position when its block is gone', () => {
    const state = withPeers(started(), [['c1', presenceAt('gone', 1)]]);

    expect(remotePeers(state)[0]?.head).toBeUndefined();
  });

  it('keeps a peer without a selection', () => {
    const state = withPeers(started(), [['c1', { user: ANN, selection: null }]]);

    expect(remotePeers(state)[0]).toMatchObject({ anchor: undefined, head: undefined });
  });

  it.each([
    ['garbage', 'nope'],
    ['a bad user', { user: { id: 1, name: 'x' }, selection: null }],
    ['a bad avatar', { user: { id: 'a', name: 'x', avatar: 1 }, selection: null }],
    ['a bad selection', { user: ANN, selection: { anchor: 1, head: 2 } }],
    [
      'a negative offset',
      {
        user: ANN,
        selection: { anchor: { block: 'p0', offset: -1 }, head: { block: 'p0', offset: 0 } },
      },
    ],
  ])('ignores %s', (_name, value) => {
    const state = withPeers(started(), [['c1', value]]);

    expect(remotePeers(state)).toHaveLength(0);
  });

  it('moves peers through local changes', () => {
    const state = withPeers(started(), [['c1', presenceAt('p0', 2)]]);

    const next = state.apply(state.tr.insertText('xy', 1));

    expect(remotePeers(next)[0]?.head).toBe(5);
  });

  it('moves peers through a rebased remote change', () => {
    const state = withPeers(started(), [['c1', presenceAt('p0', 2)]]);
    const remote = state.tr.insertText('rr', 1).steps;
    const typed = state.apply(state.tr.insertText('L', 4));

    const next = typed.apply(received(typed, remote));

    expect(remotePeers(next)[0]?.head).toBe(5);
  });

  it('gives one user the same colour', () => {
    const state = withPeers(started(), [
      ['c1', presenceAt('p0', 1)],
      ['c2', presenceAt('p1', 1)],
    ]);

    const [first, second] = remotePeers(state);

    expect(first?.colour).toBe(second?.colour);
    expect(first?.colour).toBeGreaterThanOrEqual(0);
    expect(first?.colour).toBeLessThan(8);
  });

  it('decorates a selected range and not a caret', () => {
    const state = withPeers(started(), [
      ['c1', presenceAt('p0', 1, 3)],
      ['c2', presenceAt('p1', 1)],
    ]);

    const plugin = state.plugins[0];
    const set = plugin?.props.decorations?.(state);

    expect(set?.decorations).toHaveLength(1);
    expect(set?.decorations[0]).toMatchObject({ from: 2, to: 4 });
  });

  it('hands the view the same decorations while nobody else has a selection', () => {
    const start = withPeers(started(), [['c1', presenceAt('p0', 2)]]);
    const typed = start.apply(start.tr.insertText('xy', 1));
    const moved = withPeers(typed, [['c1', presenceAt('p1', 1)]]);

    expect(decorationsOf(typed)).toBe(decorationsOf(start));
    expect(decorationsOf(moved)).toBe(decorationsOf(start));
    expect(decorationsOf(moved)).toBe(decorationsOf(moved));
  });

  it('keeps the decorations of a selection through typing after it and moves them with typing before it', () => {
    const start = withPeers(started(), [['c1', presenceAt('p0', 1, 3)]]);
    const after = start.apply(start.tr.insertText('xy', 7));
    const before = start.apply(start.tr.insertText('xy', 1));

    expect(decorationsOf(after)).toBe(decorationsOf(start));
    expect(remotePeers(after)).toBe(remotePeers(start));

    expect(decorationsOf(before)?.decorations).toEqual([
      expect.objectContaining({ from: 4, to: 6 }),
    ]);
  });

  it('holds a caret stated on a version it has not reached and places it when the steps arrive', () => {
    const start = started();
    const told = withPeers(start, [['c1', { ...presenceAt('p0', 3), version: 1 }]]);

    const caught = told.apply(received(told, start.tr.insertText('x', 3).steps));

    expect(remotePeers(told)).toEqual([
      expect.objectContaining({ clientId: 'c1', user: ANN, head: undefined }),
    ]);

    expect(remotePeers(caught)[0]?.head).toBe(4);
  });

  it('keeps the place a caret had while its next place waits for steps', () => {
    const start = withPeers(started(), [['c1', presenceAt('p0', 1)]]);

    const told = withPeers(start, [['c1', { ...presenceAt('p0', 3), version: 1 }]]);
    const caught = told.apply(received(told, start.tr.insertText('x', 3).steps));

    expect(remotePeers(told)[0]?.head).toBe(2);
    expect(remotePeers(caught)[0]?.head).toBe(4);
  });

  it('ignores presence with a version that is not a count', () => {
    const state = withPeers(started(), [['c1', { ...presenceAt('p0', 1), version: -1 }]]);

    expect(remotePeers(state)).toHaveLength(0);
  });

  it('states the version its selection is written on, steps on the way included', () => {
    const state = started();

    const typed = state.apply(state.tr.insertText('x', 1));

    expect(presenceOf(state, ANN).version).toBe(0);
    expect(presenceOf(typed, ANN).version).toBe(1);
  });

  it('says again where it is once the version it stated no longer fits its selection', () => {
    const state = started();
    const typed = state.apply(state.tr.insertText('x', 1));
    const told = presenceOf(typed, ANN);

    const pushed = typed.apply(received(typed, state.tr.insertText('y', 7).steps));
    const confirmed = typed.apply(confirmSteps(typed, 1, 1));

    expect(presenceChanged(told, presenceOf(pushed, ANN), pushed)).toBe(true);
    expect(presenceChanged(told, presenceOf(confirmed, ANN), confirmed)).toBe(false);
    expect(presenceChanged({ ...told, version: 3 }, presenceOf(typed, ANN), typed)).toBe(true);
  });

  it('describes a text selection by block and offset', () => {
    const state = started();

    const placed = state.apply(state.tr.setSelection(textSelection(2, 8)));

    expect(presenceOf(placed, ANN).selection).toEqual({
      anchor: { block: 'p0', offset: 1 },
      head: { block: 'p1', offset: 2 },
    });
  });

  it('describes a whole-document selection by the edges of its text', () => {
    const state = started();

    const placed = state.apply(state.tr.setSelection({ kind: 'all' }));

    expect(presenceOf(placed, ANN).selection).toEqual({
      anchor: { block: 'p0', offset: 0 },
      head: { block: 'p1', offset: 3 },
    });
  });

  it('compares presence by selection', () => {
    expect(samePresence(presenceAt('p0', 1), presenceAt('p0', 1))).toBe(true);
    expect(samePresence(presenceAt('p0', 1), presenceAt('p0', 2))).toBe(false);
  });
});
