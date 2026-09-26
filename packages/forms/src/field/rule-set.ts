import { computed, getCurrentScope, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { firstFailure } from '../core/rules';
import type { AsyncRuleContext, FieldRuleContext } from '../core/types';
import { firstAsyncFailure, isAsyncRule, isSyncRule, type AnyFieldRule } from '../rules/async-rule';
import { originOf } from '../rules/origin';

export type RuleSource<T> = MaybeRefOrGetter<readonly AnyFieldRule<T>[] | undefined>;

export interface RuleSet<T> {
  check(value: T, context: FieldRuleContext): string | undefined;
  checkAsync(value: T, context: AsyncRuleContext): Promise<string | undefined>;
  hasAsync(): boolean;
  onChange(react: () => void): void;
}

const sameRule = <T>(left: AnyFieldRule<T>, right: AnyFieldRule<T> | undefined): boolean =>
  right !== undefined &&
  originOf(left) === originOf(right) &&
  isAsyncRule(left) === isAsyncRule(right);

const sameRules = <T>(left: readonly AnyFieldRule<T>[], right: readonly AnyFieldRule<T>[]) =>
  left.length === right.length && left.every((rule, index) => sameRule(rule, right[index]));

export const createRuleSet = <T>(source: RuleSource<T>): RuleSet<T> => {
  const rules = computed((): readonly AnyFieldRule<T>[] => toValue(source) ?? []);
  const sync = computed(() => rules.value.filter(isSyncRule));
  const pending = computed(() => rules.value.filter(isAsyncRule));

  return {
    check: (value, context) => firstFailure(sync.value, value, context),
    checkAsync: (value, context) => firstAsyncFailure(pending.value, value, context),
    hasAsync: () => pending.value.length > 0,
    onChange: (react) => {
      if (!getCurrentScope()) {
        return;
      }

      watch(rules, (next, previous) => {
        if (!sameRules(next, previous)) {
          react();
        }
      });
    },
  };
};
