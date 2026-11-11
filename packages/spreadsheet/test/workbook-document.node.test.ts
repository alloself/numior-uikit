import { describe, expect, it } from 'vite-plus/test';
import {
  createCalculator,
  createStepCodec,
  createWorkbook,
  createWorkbookDocument,
  textValue,
  workbookAuthority,
  type WorkbookStep,
} from '../src/core';

const SHEET = 'Sheet1';

const SEED: WorkbookStep = { kind: 'addSheet', name: SHEET, index: 0 };

const REPEATED_SHEET: WorkbookStep = { kind: 'addSheet', name: SHEET, index: 1 };

const written = (row: number, col: number, text: string): WorkbookStep => ({
  kind: 'setCells',
  sheet: SHEET,
  cells: [{ row, col, content: { kind: 'value', value: textValue(text) } }],
});

const openDocument = () => {
  const book = createWorkbook();
  const calculator = createCalculator(book);
  const document = createWorkbookDocument({ book, calculator });
  const codec = createStepCodec(book);

  document.load(workbookAuthority([SEED]).snapshot(), 1);

  return {
    document,
    write: (row: number, col: number, text: string) =>
      document.stepper.apply(written(row, col, text)).ok,
    wires: (...steps: readonly WorkbookStep[]) => steps.map((step) => codec.encode(step)),
    texts: () =>
      [0, 1, 2].map((col) => {
        const sheet = book.sheet(SHEET);
        const content = sheet === undefined ? undefined : calculator.contentAt(sheet, 0, col);

        return content?.kind === 'value' && content.value.kind === 'string'
          ? content.value.value
          : '';
      }),
    sheets: () => book.sheets.map((sheet) => sheet.name),
  };
};

describe('workbook document', () => {
  it('tells a listener where lines moved over its own unsent rows and under the last name of the sheet', () => {
    const client = openDocument();
    const heard: unknown[] = [];

    client.document.subscribe((_steps, lines) => {
      heard.push(lines);
    });

    client.document.stepper.apply({
      kind: 'insertLines',
      sheet: SHEET,
      axis: 'rows',
      at: 0,
      count: 2,
    });

    client.document.receive({
      version: 2,
      clientId: 'other',
      steps: client.wires(
        { kind: 'insertLines', sheet: SHEET, axis: 'rows', at: 5, count: 1 },
        { kind: 'renameSheet', from: SHEET, to: 'Plan' },
      ),
    });

    expect(heard).toEqual([[{ sheet: 'Plan', axis: 'rows', at: 7, count: 1 }]]);
  });

  it('applies a batch of another author under the own unsent edit', () => {
    const client = openDocument();

    client.write(0, 1, 'mine');

    const received = client.document.receive({
      version: 2,
      clientId: 'other',
      steps: client.wires(written(0, 0, 'theirs'), written(0, 2, 'more')),
    });

    expect(received).toBe(true);
    expect(client.texts()).toEqual(['theirs', 'mine', 'more']);
    expect(client.document.version()).toBe(3);
    expect(client.document.pending()).toHaveLength(1);
  });

  it('leaves the book as it was when a step in the middle of a batch does not apply', () => {
    const client = openDocument();

    client.write(0, 1, 'mine');

    const received = client.document.receive({
      version: 2,
      clientId: 'other',
      steps: client.wires(written(0, 0, 'theirs'), REPEATED_SHEET, written(0, 2, 'more')),
    });

    expect(received).toBe(false);
    expect(client.texts()).toEqual(['', 'mine', '']);
    expect(client.sheets()).toEqual([SHEET]);
    expect(client.document.version()).toBe(1);
    expect(client.document.pending()).toHaveLength(1);
  });

  it('leaves the book as it was when the settled steps of the own batch do not apply', () => {
    const client = openDocument();

    client.write(0, 1, 'mine');
    client.write(0, 2, 'later');

    const settled = client.document.settle(
      1,
      client.wires(written(0, 0, 'theirs'), REPEATED_SHEET),
      3,
    );

    expect(settled).toBe(false);
    expect(client.texts()).toEqual(['', 'mine', 'later']);
    expect(client.document.version()).toBe(1);
    expect(client.document.pending()).toHaveLength(2);
  });
});
