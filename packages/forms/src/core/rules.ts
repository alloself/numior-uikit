import { matchesPattern } from '../paths/paths';
import type { AnyFieldRule } from '../rules/async-rule';
import type { FieldRule, FieldRuleContext } from './types';

export type FormRules<V> = Readonly<Record<string, readonly AnyFieldRule<unknown, V>[]>>;

export const firstFailure = <T, V>(
  rules: readonly FieldRule<T, V>[],
  value: T,
  context: FieldRuleContext<V>,
): string | undefined => {
  for (const rule of rules) {
    const result = rule(value, context);

    if (result !== true) {
      return result;
    }
  }
  return undefined;
};

export const rulesFor = <V>(rules: FormRules<V>, path: string): AnyFieldRule<unknown, V>[] =>
  Object.entries(rules).flatMap(([pattern, list]) =>
    pattern === path || matchesPattern(path, pattern) ? list : [],
  );
