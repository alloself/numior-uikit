import { getCurrentScope, onScopeDispose, toValue } from 'vue';
import type { ErrorControls } from '../core/errors';
import type { FormCore } from '../core/form-core';
import type { FormHost } from '../core/host';
import { toMessages } from '../core/messages';
import { createOwnerState } from '../core/owner-state';
import { firstFailure } from '../core/rules';
import { firstAsyncFailure, isAsyncRule, isSyncRule } from '../rules/async-rule';
import { inScope, summarize } from '../core/summary';
import type { Validation } from '../core/validation';
import { normalizePath } from '../paths/paths';
import { getAt } from '../values/access';
import type { FormContext } from './form-context';

export type FormActions<V extends object> = Pick<
  FormContext<V>,
  | 'register'
  | 'setFieldValue'
  | 'setValues'
  | 'setFieldError'
  | 'setErrors'
  | 'setFormErrors'
  | 'validate'
  | 'validateField'
>;

export const createActions = <V extends object, O>(
  core: FormCore<V, O>,
  validation: Validation<V, O>,
  host: FormHost,
  errors: ErrorControls,
): FormActions<V> => ({
  register: (rawPath, options = {}) => {
    const path = (): string => normalizePath(toValue(rawPath));
    const value = (): unknown => getAt(core.engine.values, path());
    const rules = options.rules ?? [];
    const syncRules = rules.filter(isSyncRule);
    const asyncRules = rules.filter(isAsyncRule);

    const entry = host.add({
      kind: options.kind ?? 'group',
      path,
      active: () => toValue(options.active) ?? true,
      disabled: () => toValue(options.disabled) ?? false,
      label: () => toValue(options.label),
      element: () => toValue(options.element),
      focus: options.focus,
      flush: undefined,
      value,
      check: (context) => firstFailure(syncRules, getAt(context.values, path()), context),
      checkAsync:
        asyncRules.length === 0
          ? undefined
          : (context) => firstAsyncFailure(asyncRules, value(), context),
      debounce: options.debounce,
      validateOn: options.validateOn,
      keepValue: options.keepValue ?? true,
      state: createOwnerState(),
    });

    const unregister = (): void => {
      host.remove(entry);
    };

    if (getCurrentScope()) {
      onScopeDispose(unregister);
    }
    return { id: entry.id, unregister };
  },
  setFieldValue: (path, value) => host.write(normalizePath(path), value),
  setValues: (values) => {
    for (const entry of core.registry.entries.value) {
      entry.fieldEpoch += 1;
    }
    core.engine.mergeValues(values);
    return host.revalidate(core.registry.active());
  },
  setFieldError: (path, message) => {
    errors.setFieldError(path, toMessages(message));
  },
  setErrors: (record) => {
    for (const [path, message] of Object.entries(record)) {
      errors.setFieldError(path, toMessages(message));
    }
  },
  setFormErrors: (messages) => {
    errors.setFormErrors(messages);
  },
  validate: async (options = {}) => {
    const scope = options.paths?.map(normalizePath);
    const entries = core.registry.active().filter((entry) => inScope(entry.path(), scope));

    await host.flush(entries);

    if (options.silent) {
      return summarize(await validation.run(), scope);
    }
    if (scope === undefined) {
      core.session.formAttempted = true;
    }
    return summarize(await validation.validateFully(entries), scope);
  },
  validateField: (rawPath) => {
    const path = normalizePath(rawPath);
    const entry = core.registry.active().find((item) => item.path() === path);

    return entry ? host.validateEntry(entry) : Promise.resolve({ valid: true, errors: [] });
  },
});
