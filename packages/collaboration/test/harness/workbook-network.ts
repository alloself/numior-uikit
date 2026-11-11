import {
  EN_FORMULAS,
  WORKBOOK_SCHEMA,
  createCalculator,
  createStepCodec,
  createWorkbook,
  createWorkbookDocument,
  createWorkbookHistory,
  parseFormula,
  printFormula,
  workbookAuthority,
  type Calculator,
  type CellEdit,
  type Workbook,
  type WorkbookDocument,
  type WorkbookHistory,
  type WorkbookStep,
} from '@numior/spreadsheet/core';
import { createRoom } from '../../server/room';
import { createCollabClient, type CollabClient } from '../../src';
import { RETRY, createTraffic, createWire, mendAll, settleAll, type NetworkTraffic } from './wire';

export interface BookClient {
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly history: WorkbookHistory;
  readonly document: WorkbookDocument;
  readonly status: CollabClient['status'];
  readonly commit: (steps: readonly WorkbookStep[]) => boolean;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly toServer: () => boolean;
  readonly toClient: () => boolean;
  readonly cut: () => void;
  readonly relink: () => void;
  readonly late: () => boolean;
  readonly dump: () => string;
  readonly text: (sheet: string, row: number, col: number) => string;
  readonly stop: () => void;
}

export interface BookNetwork {
  readonly clients: readonly BookClient[];
  readonly settle: () => void;
  readonly mend: () => void;
  readonly traffic: () => NetworkTraffic;
  readonly close: () => void;
}

export const WHOLE = { top: 0, left: 0, bottom: 1_048_575, right: 16_383 };

export const SHEET = 'Sheet1';

export const seedSheet: WorkbookStep = { kind: 'addSheet', name: SHEET, index: 0 };

export const valueCell = (row: number, col: number, text: string): CellEdit => ({
  row,
  col,
  content: { kind: 'value', value: { kind: 'string', value: text } },
});

export const formulaCell = (row: number, col: number, formula: string): CellEdit => {
  const parsed = parseFormula(formula, EN_FORMULAS, { row, col });

  if (!parsed.ok) {
    throw new Error(`${formula} does not parse`);
  }
  return { row, col, content: { kind: 'formula', ast: parsed.ast } };
};

export const writeCells = (...cells: readonly CellEdit[]): WorkbookStep => ({
  kind: 'setCells',
  sheet: SHEET,
  cells,
});

const contentText = (
  calculator: Calculator,
  book: Workbook,
  sheet: string,
  row: number,
  col: number,
): string => {
  const target = book.sheet(sheet);

  if (target === undefined) {
    return '';
  }

  const content = calculator.contentAt(target, row, col);

  switch (content.kind) {
    case 'formula':
      return `=${printFormula(content.ast, EN_FORMULAS, { row, col })}`;
    case 'value':
      return content.value.kind === 'string' ? content.value.value : JSON.stringify(content.value);
    case 'empty':
      return '';
  }
};

const dumpBook = (book: Workbook, calculator: Calculator): string => {
  const codec = createStepCodec(book);

  const sheets = book.sheets.map((sheet) => {
    const cells = new Map<string, string>();

    const remember = (row: number, col: number): void => {
      cells.set(
        `${row.toString()}:${col.toString()}`,
        contentText(calculator, book, sheet.name, row, col),
      );
    };

    sheet.cells.forEachInRange(WHOLE, remember);

    calculator.forEachFormula((owner, row, col) => {
      if (owner === sheet) {
        remember(row, col);
      }
    });

    const formats: string[] = [];

    sheet.formats.forEachInRange(WHOLE, (row, col, id) => {
      formats.push(`${row.toString()}:${col.toString()}:${book.formats.code(id)}`);
    });

    return {
      name: sheet.name,
      cells: [...cells].toSorted(([left], [right]) => left.localeCompare(right)),
      formats: formats.toSorted((left, right) => left.localeCompare(right)),
      layout: codec.encode({ kind: 'setLayout', sheet: sheet.name, layout: sheet.layout }),
    };
  });

  return JSON.stringify(sheets);
};

export const createBookNetwork = (
  names: readonly string[],
  seed: readonly WorkbookStep[] = [seedSheet],
): BookNetwork => {
  const authority = workbookAuthority(seed);
  const room = createRoom(authority);
  const traffic = createTraffic();

  const clients = names.map((name): BookClient => {
    const wire = createWire(room, name, traffic);
    const book = createWorkbook();
    const calculator = createCalculator(book);
    const document = createWorkbookDocument({ book, calculator });
    const history = createWorkbookHistory(document.stepper);

    document.follow(history);

    const client = createCollabClient({
      doc: 'book',
      clientId: name,
      schema: WORKBOOK_SCHEMA,
      document,
      transport: wire.transport,
      retry: RETRY,
    });

    wire.open();

    return {
      book,
      calculator,
      history,
      document,
      status: client.status,
      commit: (steps) => {
        const outcome = history.commit(steps);

        client.sync();
        return outcome.ok;
      },
      undo: () => {
        history.undo();
        client.sync();
      },
      redo: () => {
        history.redo();
        client.sync();
      },
      toServer: wire.toServer,
      toClient: wire.toClient,
      cut: wire.cut,
      relink: wire.relink,
      late: wire.late,
      dump: () => dumpBook(book, calculator),
      text: (sheet, row, col) => contentText(calculator, book, sheet, row, col),
      stop: client.stop,
    };
  });

  const settle = (): void => {
    settleAll(clients);
  };

  settle();

  const close = (): void => {
    clients.forEach((client) => {
      client.stop();
    });
  };

  const mend = (): void => {
    mendAll(clients);
  };

  return { clients, settle, mend, traffic: () => ({ ...traffic }), close };
};
