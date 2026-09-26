import { isUnder } from '../paths/paths';
import type { Classified } from './owners';
import type { ValidationSummary } from './types';

export const inScope = (path: string, scope: readonly string[] | undefined): boolean =>
  scope === undefined || scope.some((prefix) => isUnder(path, prefix));

export const summarize = (
  result: Classified,
  scope: readonly string[] | undefined,
): ValidationSummary => {
  const errors = Object.fromEntries([...result.byOwner].filter(([path]) => inScope(path, scope)));

  const formErrors = result.formLevel.filter(
    (message) =>
      scope === undefined || (message.path !== undefined && inScope(message.path, scope)),
  );

  return {
    valid: Object.keys(errors).length === 0 && formErrors.length === 0,
    errors,
    formErrors,
    ignored: result.ignored,
  };
};
