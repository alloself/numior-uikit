import type { AsyncRuleContext, FieldRule } from '../core/types';

const ASYNC_RULE: unique symbol = Symbol('nui:async-rule');

export type AsyncFieldRule<T = unknown, V = unknown> = ((
  value: T,
  context: AsyncRuleContext<V>,
) => Promise<true | string>) & { readonly [ASYNC_RULE]: true };

export type AnyFieldRule<T = unknown, V = unknown> = FieldRule<T, V> | AsyncFieldRule<T, V>;

export const isAsyncRule = <T, V>(rule: AnyFieldRule<T, V>): rule is AsyncFieldRule<T, V> =>
  ASYNC_RULE in rule;

export const isSyncRule = <T, V>(rule: AnyFieldRule<T, V>): rule is FieldRule<T, V> =>
  !(ASYNC_RULE in rule);

export const customAsync = <T = unknown, V = unknown>(
  check: (value: T, context: AsyncRuleContext<V>) => Promise<string | undefined>,
): AsyncFieldRule<T, V> =>
  Object.assign(
    async (value: T, context: AsyncRuleContext<V>): Promise<true | string> =>
      (await check(value, context)) ?? true,
    { [ASYNC_RULE]: true as const },
  );

export const firstAsyncFailure = async <T, V>(
  rules: readonly AsyncFieldRule<T, V>[],
  value: T,
  context: AsyncRuleContext<V>,
): Promise<string | undefined> => {
  for (const rule of rules) {
    const result = await rule(value, context);

    if (result !== true) {
      return result;
    }
  }
  return undefined;
};
