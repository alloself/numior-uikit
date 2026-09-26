import { computed, getCurrentScope, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { firstFailure } from '../core/rules';
import type { AsyncRuleContext, FieldRuleContext } from '../core/form.types';
import { firstAsyncFailure, isAsyncRule, isSyncRule, type AnyFieldRule } from '../rules/async-rule';
import { originOf } from '../rules/origin';

export type RuleSource<T, V> = MaybeRefOrGetter<readonly AnyFieldRule<T, V>[] | undefined>;

export interface RuleSet<T, V> {
  check(value: T, context: FieldRuleContext<V>): string | undefined;
  checkAsync(value: T, context: AsyncRuleContext<V>): Promise<string | undefined>;
  hasAsync(): boolean;
  onChange(react: () => void): void;
}

const sameRule = <T, V>(left: AnyFieldRule<T, V>, right: AnyFieldRule<T, V> | undefined): boolean =>
  right !== undefined &&
  originOf(left) === originOf(right) &&
  isAsyncRule(left) === isAsyncRule(right);

const sameRules = <T, V>(
  left: readonly AnyFieldRule<T, V>[],
  right: readonly AnyFieldRule<T, V>[],
): boolean =>
  left.length === right.length && left.every((rule, index) => sameRule(rule, right[index]));

export const createRuleSet = <T, V>(source: RuleSource<T, V>): RuleSet<T, V> => {
  const rules = computed((): readonly AnyFieldRule<T, V>[] => toValue(source) ?? []);
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
