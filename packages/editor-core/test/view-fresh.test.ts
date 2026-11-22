import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import {
  deleteSelection,
  history,
  joinBackward,
  joinForward,
  liftListItem,
  moveChild,
  redo,
  setBlockType,
  sinkListItem,
  splitBlock,
  splitListItem,
  toggleList,
  toggleMark,
  toggleWrapper,
  undo,
  type Command,
} from '../src';
import { fixtureSchema, generateDoc } from '../src/fixtures';
import { EditorViewDriver } from './drivers/view';

type ViewAction = (typeof ViewAction)[keyof typeof ViewAction];

interface ViewMove {
  readonly action: ViewAction;
  readonly anchor: number;
  readonly head: number;
  readonly ranged: boolean;
  readonly from: number;
  readonly to: number;
}

const ViewAction = {
  Type: 'type',
  Move: 'move',
  Split: 'split',
  SplitItem: 'splitItem',
  JoinBackward: 'joinBackward',
  JoinForward: 'joinForward',
  Delete: 'delete',
  Heading: 'heading',
  Paragraph: 'paragraph',
  Code: 'code',
  Bullets: 'bullets',
  Ordered: 'ordered',
  Todo: 'todo',
  Quote: 'quote',
  Sink: 'sink',
  Lift: 'lift',
  Bold: 'bold',
  Italic: 'italic',
  Undo: 'undo',
  Redo: 'redo',
} as const;

const COMMANDS: Readonly<Record<Exclude<ViewAction, 'type' | 'move'>, Command>> = {
  split: splitBlock,
  splitItem: splitListItem,
  joinBackward,
  joinForward,
  delete: deleteSelection,
  heading: setBlockType('heading', { level: 2 }),
  paragraph: setBlockType('paragraph'),
  code: setBlockType('code_block'),
  bullets: toggleList('bullet_list'),
  ordered: toggleList('ordered_list'),
  todo: toggleList('todo_list'),
  quote: toggleWrapper('blockquote'),
  sink: sinkListItem,
  lift: liftListItem,
  bold: toggleMark('bold'),
  italic: toggleMark('italic'),
  undo,
  redo,
};

const PROPERTY_TIMEOUT = 60_000;

const RUNS = 100;

const MOVES = 30;

const BLOCKS = 8;

const TYPED = 'xy';

const VIEW_MOVE: fc.Arbitrary<ViewMove> = fc.record({
  action: fc.oneof(
    { weight: 9, arbitrary: fc.constant(ViewAction.Type) },
    { weight: 19, arbitrary: fc.constantFrom(...Object.values(ViewAction)) },
  ),
  anchor: fc.nat(),
  head: fc.nat(),
  ranged: fc.nat({ max: 3 }).map((pick) => pick === 0),
  from: fc.nat(),
  to: fc.nat(),
});

const commandOf = (driver: EditorViewDriver, root: string, move: ViewMove, at: number): Command => {
  switch (move.action) {
    case ViewAction.Type:
      return (state, dispatch) => {
        dispatch?.(state.tr.insertText(TYPED, at));
        return true;
      };
    case ViewAction.Move: {
      const blocks = Math.max(1, driver.types.length);

      return moveChild(root, move.from % blocks, move.to % blocks);
    }
    default:
      return COMMANDS[move.action];
  }
};

const played = (driver: EditorViewDriver, root: string, move: ViewMove): void => {
  const spots = driver.textSpots;
  const anchor = spots[move.anchor % Math.max(1, spots.length)];

  if (anchor === undefined) {
    return;
  }

  driver.place(anchor, move.ranged ? (spots[move.head % spots.length] ?? anchor) : anchor);
  driver.run(commandOf(driver, root, move, anchor));
};

describe('the page of an editor view', () => {
  it(
    'stays the page a new view draws for the same state through typing, commands, undo and redo',
    () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 100_000 }),
          fc.array(VIEW_MOVE, { maxLength: MOVES, size: 'max' }),
          (seed, moves) => {
            const { root } = generateDoc(fixtureSchema, { seed, blocks: BLOCKS });
            const driver = EditorViewDriver.mount(root, fixtureSchema, [history()]);

            try {
              for (const move of moves) {
                played(driver, root.id, move);
                expect(driver.page).toBe(driver.freshPage);
              }
            } finally {
              driver.destroy();
            }
          },
        ),
        { numRuns: RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );
});
