import type { Calculator } from '../calc/calculator';
import { CellInputKind } from '../cell.types';
import { EMPTY_LAYOUT } from '../layout/line-layouts';
import type { Sheet, Workbook } from '../workbook';
import { WHOLE_SHEET, cellContentsIn } from './contents';
import { putBack } from './pivot-steps';
import type { CellEdit, WorkbookStep } from './step.types';
import { specOf } from './table-steps';

const written = (edit: CellEdit, plain: string): CellEdit => ({
  row: edit.row,
  col: edit.col,
  content: edit.content?.kind === CellInputKind.Empty ? undefined : edit.content,
  format: edit.format === plain ? undefined : edit.format,
  decoration: edit.decoration,
});

const cellSteps = (book: Workbook, calculator: Calculator, sheet: Sheet): WorkbookStep[] => {
  const plain = book.formats.code(0);
  const cells: CellEdit[] = [];

  for (const edit of cellContentsIn(book, calculator, sheet, WHOLE_SHEET).values()) {
    cells.push(written(edit, plain));
  }
  return cells.length === 0 ? [] : [{ kind: 'setCells', sheet: sheet.name, cells }];
};

const lookSteps = (sheet: Sheet): WorkbookStep[] => {
  const steps: WorkbookStep[] = [];

  if (sheet.conditional.length > 0) {
    steps.push({ kind: 'setConditional', sheet: sheet.name, formats: sheet.conditional });
  }
  if (sheet.layout !== EMPTY_LAYOUT) {
    steps.push({ kind: 'setLayout', sheet: sheet.name, layout: sheet.layout });
  }
  return steps;
};

const sharedSteps = (book: Workbook): WorkbookStep[] => {
  const steps: WorkbookStep[] = [];

  book.tables.forEach((table) => {
    steps.push({ kind: 'setTable', name: table.name, table: specOf(table) });
  });

  book.names.forEach((defined) => {
    steps.push({
      kind: 'setName',
      name: defined.name,
      scope: defined.scope?.name,
      ast: defined.ast,
    });
  });

  return steps;
};

const pivotSteps = (book: Workbook): WorkbookStep[] => {
  const steps: WorkbookStep[] = [];

  book.pivots.forEach((pivot) => {
    steps.push(putBack(pivot));
  });

  return steps;
};

export const bookSteps = (book: Workbook, calculator: Calculator): WorkbookStep[] => [
  ...book.sheets.map((sheet, index): WorkbookStep => ({
    kind: 'addSheet',
    name: sheet.name,
    index,
  })),
  ...book.sheets.flatMap((sheet) => cellSteps(book, calculator, sheet)),
  ...sharedSteps(book),
  ...book.sheets.flatMap(lookSteps),
  ...pivotSteps(book),
];
