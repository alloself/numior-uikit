import type { FunctionSpec } from './calc.types';

export const NEWER_MANY = 254;

export const pairsAfter =
  (fixed: number) =>
  (count: number): boolean =>
    (count - fixed) % 2 === 0;

export const rangesAfter =
  (fixed: number) =>
  (index: number): boolean =>
    index < fixed || (index - fixed) % 2 === 0;

export const firstArgument = (index: number): boolean => index === 0;

export const secondArgument = (index: number): boolean => index === 1;

export const letNames = (index: number, count: number): boolean =>
  index % 2 === 0 && index < count - 1;

export const lambdaNames = (index: number, count: number): boolean => index < count - 1;

export const sortKeys = (count: number): boolean => count === 2 || count % 2 === 1;

export const afterFirst = (index: number): boolean => index > 0;

export const oddArgument = (index: number): boolean => index % 2 === 1;

export const readsArgument = (
  spec: FunctionSpec | undefined,
  index: number,
  count: number,
  read: boolean,
): boolean => spec?.unreadAt?.(index) !== true && (read || spec?.passesAt?.(index, count) !== true);
