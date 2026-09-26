import type { FieldSelector } from '../../paths/selector';
import { adaptRule } from '../../rules/adapt-rule';
import type { AnyFieldRule } from '../../rules/async-rule';
import type {
  NuiSmartFormCondition,
  NuiSmartFormEntry,
  NuiSmartFormPropsFactory,
  SmartRow,
} from './smart-form.types';

export type RowReader<S, Row> = (values: S) => Row | undefined;

const liftSelector =
  <S, Row, R>(
    select: FieldSelector<Row, R>,
    rowOf: RowReader<S, Row>,
  ): FieldSelector<S, R | undefined> =>
  (values) => {
    const row = rowOf(values);
    return row === undefined ? undefined : select(row);
  };

const liftCondition = <S, Row>(
  when: NuiSmartFormCondition<Row> | undefined,
  rowOf: RowReader<S, Row>,
  row: () => SmartRow | undefined,
): NuiSmartFormCondition<S> | undefined =>
  when &&
  ((values) => {
    const value = rowOf(values);
    const current = row();

    return value !== undefined && current !== undefined && when(value, current);
  });

const liftProps = <S, Row>(
  props: object | NuiSmartFormPropsFactory<Row> | undefined,
  rowOf: RowReader<S, Row>,
): object | NuiSmartFormPropsFactory<S> | undefined => {
  if (typeof props !== 'function') {
    return props;
  }
  return (values) => {
    const row = rowOf(values);
    return row === undefined ? {} : props(row);
  };
};

const liftRule = <S, Row>(
  rule: AnyFieldRule<unknown, Row>,
  rowOf: RowReader<S, Row>,
): AnyFieldRule<unknown, S> =>
  adaptRule(rule, (value: unknown, values: S) => {
    const row = rowOf(values);
    return row === undefined ? undefined : ([value, row] as const);
  });

export const liftEntry = <S, Row>(
  entry: NuiSmartFormEntry<Row>,
  rowOf: RowReader<S, Row>,
  row: () => SmartRow | undefined,
): NuiSmartFormEntry<S> => {
  const when = liftCondition(entry.when, rowOf, row);

  switch (entry.kind) {
    case 'field':
      return {
        ...entry,
        name: liftSelector(entry.name, rowOf),
        props: liftProps(entry.props, rowOf),
        when,
        rules: entry.rules?.map((rule) => liftRule(rule, rowOf)),
      };
    case 'section':
      return { ...entry, when, fields: entry.fields.map((child) => liftEntry(child, rowOf, row)) };
    case 'array':
      return {
        ...entry,
        name: liftSelector(entry.name, rowOf),
        when,
        rows: (inner) => entry.rows(inner).map((child) => liftEntry(child, rowOf, row)),
      };
  }
};
