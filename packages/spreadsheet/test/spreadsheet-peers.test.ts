import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  createCalculator,
  createWorkbook,
  type WorkbookPeer,
  type WorkbookSelection,
} from '../src/core';
import { SpreadsheetDriver } from './drivers/spreadsheet';

const SHEET = 'Лист1';

const OTHER = 'Лист2';

const mounted: SpreadsheetDriver[] = [];

const single = (row: number, col: number): WorkbookSelection => ({
  active: { row, col },
  ranges: [{ top: row, left: col, bottom: row, right: col }],
});

const AREA: WorkbookSelection = {
  active: { row: 2, col: 1 },
  ranges: [{ top: 2, left: 1, bottom: 5, right: 3 }],
};

const peerOn = (sheet: string, selection: WorkbookSelection, name = 'Анна'): WorkbookPeer => ({
  clientId: `client-${name}`,
  colour: 2,
  user: { id: name, name },
  place: { sheet, selection },
});

const open = (peers: readonly WorkbookPeer[] = []): SpreadsheetDriver => {
  const book = createWorkbook();

  book.addSheet(SHEET);
  book.addSheet(OTHER);

  const driver = SpreadsheetDriver.mount({
    book,
    calculator: createCalculator(book),
    label: 'Книга',
    height: '400px',
    peers,
  });

  mounted.push(driver);

  return driver;
};

afterEach(() => {
  mounted.splice(0).forEach((driver) => {
    driver.unmount();
  });
});

describe('someone else on the sheet', () => {
  it('names who stands on the shown sheet', () => {
    const driver = open([peerOn(SHEET, single(2, 1))]);

    expect(driver.peerNames).toEqual(['Анна']);
  });

  it('leaves out someone on another sheet', () => {
    const driver = open([peerOn(OTHER, single(2, 1))]);

    expect(driver.peerNames).toEqual([]);
  });

  it('leaves out someone who has not picked a cell', () => {
    const driver = open([{ ...peerOn(SHEET, single(0, 0)), place: undefined }]);

    expect(driver.peerNames).toEqual([]);
  });

  it('fills a selected range and leaves a single cell unfilled', async () => {
    const driver = open([peerOn(SHEET, AREA)]);

    expect(driver.peerAreas).toBe(1);

    await driver.setPeers([peerOn(SHEET, single(2, 1))]);

    expect(driver.peerAreas).toBe(0);
  });

  it('puts the name under a frame on the top row', async () => {
    const driver = open([peerOn(SHEET, single(0, 1))]);

    expect(driver.peerFlagsBelow).toBe(1);

    await driver.setPeers([peerOn(SHEET, single(4, 1))]);

    expect(driver.peerFlagsBelow).toBe(0);
  });
});

describe('telling others where you stand', () => {
  it('reports the sheet and selection once per move', async () => {
    const driver = open();

    await driver.select(single(3, 2));

    expect(driver.places).toEqual([{ sheet: SHEET, selection: single(3, 2) }]);
  });

  it('stays quiet while the place is the same', async () => {
    const driver = open();

    await driver.select(single(3, 2));
    await driver.select(single(3, 2));

    expect(driver.places).toHaveLength(1);
  });
});
