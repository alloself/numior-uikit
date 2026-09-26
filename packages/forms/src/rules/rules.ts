import type { FieldRule, FieldRuleContext } from '../core/types';

export interface RuleOptions {
  readonly message?: string | undefined;
}

type Measure = 'Length' | 'Value' | 'Items';

const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

const isEmptyValue = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === false ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const measure = (value: unknown): readonly [Measure, number] | undefined => {
  if (typeof value === 'string') {
    return ['Length', [...value].length];
  }
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return ['Value', value];
  }
  return Array.isArray(value) ? ['Items', value.length] : undefined;
};

const minMessage = (kind: Measure, min: number, context: FieldRuleContext): string =>
  context.messages[`min${kind}`]({ min });

const maxMessage = (kind: Measure, max: number, context: FieldRuleContext): string =>
  context.messages[`max${kind}`]({ max });

export const required =
  (options: RuleOptions = {}): FieldRule =>
  (value, context) =>
    !isEmptyValue(value) || (options.message ?? context.messages.required);

export const min =
  (limit: number, options: RuleOptions = {}): FieldRule =>
  (value, context) => {
    const size = isEmptyValue(value) ? undefined : measure(value);

    return (
      size === undefined ||
      size[1] >= limit ||
      (options.message ?? minMessage(size[0], limit, context))
    );
  };

export const max =
  (limit: number, options: RuleOptions = {}): FieldRule =>
  (value, context) => {
    const size = isEmptyValue(value) ? undefined : measure(value);

    return (
      size === undefined ||
      size[1] <= limit ||
      (options.message ?? maxMessage(size[0], limit, context))
    );
  };

export const pattern =
  (expression: RegExp, options: RuleOptions = {}): FieldRule =>
  (value, context) =>
    typeof value !== 'string' ||
    isEmptyValue(value) ||
    new RegExp(expression.source, expression.flags.replace('g', '')).test(value) ||
    (options.message ?? context.messages.pattern);

export const email =
  (options: RuleOptions = {}): FieldRule =>
  (value, context) =>
    typeof value !== 'string' ||
    isEmptyValue(value) ||
    EMAIL.test(value.trim()) ||
    (options.message ?? context.messages.email);

export const custom =
  <T = unknown, V = unknown>(
    check: (value: T, context: FieldRuleContext<V>) => string | boolean | undefined,
  ): FieldRule<T, V> =>
  (value, context) => {
    const result = check(value, context);

    if (typeof result === 'string') {
      return result;
    }
    return result !== false || context.messages.invalid;
  };
