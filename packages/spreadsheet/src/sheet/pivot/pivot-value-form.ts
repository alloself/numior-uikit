import {
  PivotBaseStep,
  PivotShowAsKind,
  pivotKey,
  pivotValueName,
  type PivotAggregate,
  type PivotBaseItem,
  type PivotLanguage,
  type PivotShowAs,
  type PivotValue,
} from '../../core';
import { PivotNameError, type PivotItemView, type PivotValueForm } from './pivot-panel.types';

export const PIVOT_FORMATS: readonly string[] = ['0', '#,##0', '#,##0.00', '0%', '0.00%'];

const FIELD_KINDS: ReadonlySet<PivotShowAsKind> = new Set([
  PivotShowAsKind.RunTotal,
  PivotShowAsKind.Difference,
  PivotShowAsKind.Percent,
  PivotShowAsKind.PercentDiff,
]);

const ITEM_KINDS: ReadonlySet<PivotShowAsKind> = new Set([
  PivotShowAsKind.Difference,
  PivotShowAsKind.Percent,
  PivotShowAsKind.PercentDiff,
]);

const NORMAL: PivotShowAs = { kind: PivotShowAsKind.Normal };

export const needsBaseField = (kind: PivotShowAsKind): boolean => FIELD_KINDS.has(kind);

export const needsBaseItem = (kind: PivotShowAsKind): boolean => ITEM_KINDS.has(kind);

export const baseItemKey = (item: PivotBaseItem): string =>
  typeof item === 'string' ? item : `item:${pivotKey(item)}`;

export const pivotValueForm = (value: PivotValue, bases: readonly number[]): PivotValueForm => {
  const { showAs } = value;

  return {
    name: value.name,
    aggregate: value.aggregate,
    showAs: showAs.kind,
    base: 'field' in showAs ? showAs.field : bases[0],
    item: 'item' in showAs ? baseItemKey(showAs.item) : PivotBaseStep.Previous,
    format: value.format ?? '',
  };
};

const baseItemOf = (key: string, items: readonly PivotItemView[]): PivotBaseItem => {
  if (key === PivotBaseStep.Next || key === PivotBaseStep.Previous) {
    return key;
  }
  return items.find((item) => baseItemKey(item.value) === key)?.value ?? PivotBaseStep.Previous;
};

const showAsOf = (form: PivotValueForm, items: readonly PivotItemView[]): PivotShowAs => {
  const field = form.base;

  switch (form.showAs) {
    case PivotShowAsKind.Normal:
      return NORMAL;
    case PivotShowAsKind.PercentOfTotal:
    case PivotShowAsKind.PercentOfRow:
    case PivotShowAsKind.PercentOfCol:
    case PivotShowAsKind.Index:
      return { kind: form.showAs };
    case PivotShowAsKind.RunTotal:
      return field === undefined ? NORMAL : { kind: form.showAs, field };
    case PivotShowAsKind.Difference:
    case PivotShowAsKind.Percent:
    case PivotShowAsKind.PercentDiff:
      return field === undefined
        ? NORMAL
        : { kind: form.showAs, field, item: baseItemOf(form.item, items) };
  }
};

export const pivotValueOf = (
  value: PivotValue,
  form: PivotValueForm,
  items: readonly PivotItemView[],
): PivotValue => ({
  field: value.field,
  aggregate: form.aggregate,
  name: form.name.trim(),
  showAs: showAsOf(form, items),
  format: form.format === '' ? undefined : form.format,
});

export const withAggregate = (
  form: PivotValueForm,
  aggregate: PivotAggregate,
  field: string,
  language: PivotLanguage,
): PivotValueForm => ({
  ...form,
  aggregate,
  name:
    form.name === pivotValueName(form.aggregate, field, language)
      ? pivotValueName(aggregate, field, language)
      : form.name,
});

export const pivotNameError = (
  name: string,
  taken: ReadonlySet<string>,
): PivotNameError | undefined => {
  const trimmed = name.trim();

  if (trimmed === '') {
    return PivotNameError.Required;
  }
  return taken.has(trimmed.toLowerCase()) ? PivotNameError.Taken : undefined;
};
