import { isRecord } from '@numior/primitives/guards';
import type { Calculator } from '../calc/calculator';
import { StepKind, type WorkbookStep } from '../steps/step.types';
import type { SchemaStampLike } from './collab.types';

export const WORKBOOK_SCHEMA: SchemaStampLike = { name: 'numior-workbook', version: 1 };

export const snapshotSteps = (snapshot: unknown): readonly unknown[] | undefined =>
  isRecord(snapshot) && Array.isArray(snapshot.steps) ? snapshot.steps : undefined;

export const flattened = (step: WorkbookStep): readonly WorkbookStep[] =>
  step.kind === StepKind.Batch ? step.steps.flatMap(flattened) : [step];

export const settleForStep = (calculator: Calculator, step: WorkbookStep): void => {
  if (step.kind === StepKind.SetPivot || step.kind === StepKind.RefreshPivot) {
    calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY, volatile: false });
  }
};
