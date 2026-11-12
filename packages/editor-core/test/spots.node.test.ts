import { describe, expect, it } from 'vite-plus/test';
import {
  blockSpotOf,
  blockSpots,
  createDoc,
  createState,
  definePlugin,
  history,
  insertText,
  leaveBlockSpot,
  peerSpotsOf,
  setBlockSpot,
  undo,
  type Command,
  type EditorState,
  type PeerSpot,
  type Transaction,
} from '../src';
import { buildWith, notes } from './support/notes';

interface Ran {
  readonly state: EditorState;
  readonly ran: boolean;
  readonly changed: boolean;
}

const { doc, node } = buildWith();

const page = (): EditorState =>
  createState({
    doc: createDoc(notes, doc(node('paragraph', ['Hello']), node('paragraph', ['World']))),
    plugins: [blockSpots(), history()],
  });

const blockIds = (state: EditorState): string[] =>
  state.doc.root.content.flatMap((child) => (child.kind === 'element' ? [child.id] : []));

const runOn = (state: EditorState, command: Command): Ran => {
  let next = state;
  let sent: Transaction | undefined;

  const ran = command(state, (tr) => {
    sent = tr;
    next = state.apply(tr);
  });

  return { state: next, ran, changed: sent?.changed ?? false };
};

const peer = (name: string, block: string, part: readonly string[]): PeerSpot => ({
  peer: name,
  name,
  colour: 0,
  block,
  part,
});

describe('block spots', () => {
  it('keeps the part of a block someone works in out of the document and its history', () => {
    const start = page();
    const [first = ''] = blockIds(start);

    const typed = runOn(start, insertText('!'));
    const entered = runOn(typed.state, setBlockSpot({ block: first, part: ['row-1', 'name'] }));
    const again = runOn(entered.state, setBlockSpot({ block: first, part: ['row-1', 'name'] }));
    const undone = runOn(entered.state, undo);

    expect(entered.ran).toBe(true);
    expect(entered.changed).toBe(false);
    expect(blockSpotOf(entered.state)).toEqual({ block: first, part: ['row-1', 'name'] });
    expect(entered.state.doc).toBe(typed.state.doc);
    expect(again.ran).toBe(false);
    expect(undone.state.doc.textBetween(0, undone.state.doc.size, ' ')).toBe('Hello World');
    expect(blockSpotOf(undone.state)).toEqual({ block: first, part: ['row-1', 'name'] });
  });

  it('leaves a spot only from the block that holds it', () => {
    const start = page();
    const [first = '', second = ''] = blockIds(start);
    const entered = runOn(start, setBlockSpot({ block: first, part: ['a'] }));

    const elsewhere = runOn(entered.state, leaveBlockSpot(second));
    const left = runOn(entered.state, leaveBlockSpot(first));

    expect(elsewhere.ran).toBe(false);
    expect(blockSpotOf(elsewhere.state)).toEqual({ block: first, part: ['a'] });
    expect(left.ran).toBe(true);
    expect(blockSpotOf(left.state)).toBeUndefined();
  });

  it('takes no spot in an editor without the plugin', () => {
    const start = createState({ doc: page().doc });
    const [first = ''] = blockIds(start);

    const entered = runOn(start, setBlockSpot({ block: first, part: ['a'] }));

    expect(entered.ran).toBe(false);
    expect(blockSpotOf(entered.state)).toBeUndefined();
  });

  it('gathers the spots of other people from the plugins that know them', () => {
    const anna = [peer('Anna', 'table', ['r1', 'c1'])];
    const boris = [peer('Boris', 'table', ['r2', 'c1'])];
    const one = definePlugin({ name: 'anna', props: { spots: () => anna } });
    const two = definePlugin({ name: 'boris', props: { spots: () => boris } });

    const alone = createState({ doc: page().doc, plugins: [one] });
    const both = createState({ doc: page().doc, plugins: [one, two] });
    const none = createState({ doc: page().doc });

    expect(peerSpotsOf(alone)).toBe(anna);
    expect(peerSpotsOf(both).map((spot) => spot.name)).toEqual(['Anna', 'Boris']);
    expect(peerSpotsOf(none)).toEqual([]);
  });
});
