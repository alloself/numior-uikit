import type { FieldRule } from '../core/form.types';
import { asyncRule, isAsyncRule, type AnyFieldRule } from './async-rule';
import { marked, originOf } from './origin';

export type RuleInput<T, V> = readonly [value: T, values: V];

export const adaptRule = <U, W, T, V>(
  rule: AnyFieldRule<T, V>,
  adapt: (value: U, values: W) => RuleInput<T, V> | undefined,
): AnyFieldRule<U, W> => {
  if (isAsyncRule(rule)) {
    return marked(
      asyncRule<U, W>(async (value, context) => {
        const input = adapt(value, context.values);
        return input === undefined ? true : rule(input[0], { ...context, values: input[1] });
      }),
      originOf(rule),
    );
  }
  return marked<FieldRule<U, W>>((value, context) => {
    const input = adapt(value, context.values);
    return input === undefined ? true : rule(input[0], { ...context, values: input[1] });
  }, originOf(rule));
};
