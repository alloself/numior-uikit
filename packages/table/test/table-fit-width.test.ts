import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { TableDriver } from './drivers/table';
import {
  BOLD_CHAR_WIDTH,
  CHAR_WIDTH,
  installTextCanvas,
  type TextCanvas,
} from './harness/text-canvas';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const ROOT_FONT = 16;

const ICON_ROOM = 22;

const LONG = 'Quarterly revenue';

const mounted: TableDriver<Person>[] = [];

const mountPeople = (): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({ columns: PEOPLE_COLUMNS, rows: people(5) });

  mounted.push(grid);
  return grid;
};

describe('NuiTable fit width', () => {
  let canvas: TextCanvas | undefined;

  beforeEach(() => {
    canvas = installTextCanvas();
    document.documentElement.style.fontSize = `${String(ROOT_FONT)}px`;
  });

  afterEach(() => {
    for (const grid of mounted.splice(0)) {
      grid.unmount();
    }

    document.documentElement.style.fontSize = '';
    canvas?.restore();
  });

  it('tells the column width a text needs in the font of its cell style', async () => {
    const grid = mountPeople();

    await grid.settle();

    const plain = grid.fitWidth(LONG);
    const bold = grid.fitWidth(LONG, { style: { 'font-weight': '700' } });

    expect([plain, bold]).toEqual([LONG.length * CHAR_WIDTH, LONG.length * BOLD_CHAR_WIDTH]);
  });

  it('adds the room of a leading icon and answers a short text with its own width', async () => {
    const grid = mountPeople();

    await grid.settle();

    const marked = grid.fitWidth(LONG, { icon: { icon: 'arrow-up', color: 'currentColor' } });
    const short = grid.fitWidth('Up');

    expect([marked, short]).toEqual([LONG.length * CHAR_WIDTH + ICON_ROOM, 2 * CHAR_WIDTH]);
  });

  it('has no answer where text cannot be measured', async () => {
    canvas?.restore();

    const grid = mountPeople();

    await grid.settle();

    expect(grid.fitWidth(LONG)).toBeUndefined();
  });
});
