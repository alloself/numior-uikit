import { createState, textSelection, type EditorState } from '@numior/editor-core';
import { describe, expect, it } from 'vite-plus/test';
import {
  collab,
  presenceOf,
  receiveSteps,
  remotePeers,
  remotePresence,
  samePresence,
  setRemotePresence,
  type EditorPresence,
} from '../src';
import { paragraphs } from './harness/network';

const ANN = { id: 'ann', name: 'Ann' };

const presenceAt = (block: string, offset: number, head = offset): EditorPresence => ({
  user: ANN,
  selection: { anchor: { block, offset }, head: { block, offset: head } },
});

const started = (): EditorState =>
  createState({ doc: paragraphs('one', 'two'), plugins: [remotePresence(), collab()] });

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

    const next = typed.apply(receiveSteps(typed, remote));

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

  it('describes a text selection by block and offset', () => {
    const state = started();

    const placed = state.apply(state.tr.setSelection(textSelection(2, 8)));

    expect(presenceOf(placed, ANN).selection).toEqual({
      anchor: { block: 'p0', offset: 1 },
      head: { block: 'p1', offset: 2 },
    });
  });

  it('sends no selection for a whole-document selection', () => {
    const state = started();

    const placed = state.apply(state.tr.setSelection({ kind: 'all' }));

    expect(presenceOf(placed, ANN).selection).toBeNull();
  });

  it('compares presence by selection', () => {
    expect(samePresence(presenceAt('p0', 1), presenceAt('p0', 1))).toBe(true);
    expect(samePresence(presenceAt('p0', 1), presenceAt('p0', 2))).toBe(false);
  });
});
