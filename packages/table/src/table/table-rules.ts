import { runRules, type FieldRule, type FieldRuleContext } from '@numior/forms';
import type { NuiTableCellValue, NuiTableColumn } from './table.types';

const run = <V, T>(
  rules: readonly FieldRule<V | null, T>[] | undefined,
  value: V | null,
  context: FieldRuleContext<T>,
): string | undefined => (rules === undefined ? undefined : runRules(rules, value, context));

export const ruleFailure = <T>(
  column: NuiTableColumn<T>,
  value: NuiTableCellValue,
  context: FieldRuleContext<T>,
): string | undefined => {
  const invalid = context.messages.invalid;

  switch (column.type) {
    case 'text':
      return typeof value === 'string' || value === null
        ? run(column.rules, value, context)
        : invalid;
    case 'number':
      return typeof value === 'number' || value === null
        ? run(column.rules, value, context)
        : invalid;
    case 'date':
      return value instanceof Date || typeof value === 'number' || value === null
        ? run(column.rules, value, context)
        : invalid;
    case 'boolean':
      return typeof value === 'boolean' || value === null
        ? run(column.rules, value, context)
        : invalid;
  }
};
