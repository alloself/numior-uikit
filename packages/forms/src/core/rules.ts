import { matchesPattern } from '../paths/paths';
import {
  isAsyncRule,
  isSyncRule,
  type AnyFieldRule,
  type AsyncFieldRule,
} from '../rules/async-rule';
import type { FieldRule, FieldRuleContext } from './form.types';

export type FormRules<V> = Readonly<Record<string, readonly AnyFieldRule<unknown, V>[]>>;

export interface PathRules<V> {
  readonly sync: readonly FieldRule<unknown, V>[];
  readonly async: readonly AsyncFieldRule<unknown, V>[];
}

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

const rulesFor = <V>(rules: FormRules<V>, path: string): AnyFieldRule<unknown, V>[] =>
  Object.entries(rules).flatMap(([pattern, list]) =>
    pattern === path || matchesPattern(path, pattern) ? list : [],
  );

export const createRuleLookup = <V>(rules: FormRules<V>): ((path: string) => PathRules<V>) => {
  const cache = new Map<string, PathRules<V>>();

  return (path) => {
    const known = cache.get(path);

    if (known) {
      return known;
    }

    const list = rulesFor(rules, path);
    const found = { sync: list.filter(isSyncRule), async: list.filter(isAsyncRule) };

    cache.set(path, found);
    return found;
  };
};
