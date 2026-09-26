import { isUnder } from '../../paths/paths';
import type { NuiSmartFormEntry, NuiSmartFormStep } from './smart-form.types';

export const stepPaths = (entries: readonly NuiSmartFormEntry[]): string[] =>
  entries.flatMap((entry) => (entry.kind === 'section' ? stepPaths(entry.fields) : [entry.name]));

export const stepOf = (steps: readonly NuiSmartFormStep[], path: string): number =>
  steps.findIndex((step) => stepPaths(step.fields).some((prefix) => isUnder(path, prefix)));
