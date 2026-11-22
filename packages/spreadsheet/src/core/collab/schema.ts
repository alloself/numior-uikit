import { isRecord } from '@numior/primitives/guards';
import type { Calculator } from '../calc/calculator';
import { pivotSourceArea } from '../pivot/pivot-cache';
import type { PivotSource } from '../pivot/pivot.types';
import type { Workbook } from '../workbook';
import { StepKind, type WorkbookStep } from '../steps/step.types';
import type { SchemaStampLike } from './collab.types';

export const WORKBOOK_SCHEMA: SchemaStampLike = { name: 'numior-workbook', version: 2 };

export const snapshotSteps = (snapshot: unknown): readonly unknown[] | undefined =>
  isRecord(snapshot) && Array.isArray(snapshot.steps) ? snapshot.steps : undefined;

export const flattened = (step: WorkbookStep): readonly WorkbookStep[] =>
  step.kind === StepKind.Batch ? step.steps.flatMap(flattened) : [step];

const pivotSourceOf = (book: Workbook, step: WorkbookStep): PivotSource | undefined => {
  switch (step.kind) {
    case StepKind.SetPivot:
      return step.pivot?.definition.source;
    case StepKind.RefreshPivot: {
      const sheet = book.sheet(step.sheet);

      return sheet === undefined ? undefined : book.pivots.get(sheet, step.name)?.definition.source;
    }
    default:
      return undefined;
  }
};

export const settleForStep = (book: Workbook, calculator: Calculator, step: WorkbookStep): void => {
  const source = pivotSourceOf(book, step);
  const area = source === undefined ? undefined : pivotSourceArea(book, source);

  if (area === undefined) {
    return;
  }

  calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY, volatile: false, reaching: area });
};
