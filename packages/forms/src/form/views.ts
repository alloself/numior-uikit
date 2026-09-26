import { computed, type ComputedRef } from 'vue';
import { isPathDirty } from '../core/dirty';
import type { FormCore } from '../core/form-core';
import type { Entry } from '../core/registry';
import type { FormMessage, FormMeta } from '../core/types';
import { isUnder, normalizePath } from '../paths/paths';
import { isEqualValue } from '../values/equal';

export interface FormViews {
  readonly errorBag: ComputedRef<Readonly<Record<string, readonly string[]>>>;
  readonly errors: ComputedRef<Readonly<Record<string, string>>>;
  readonly touched: ComputedRef<Readonly<Record<string, boolean>>>;
  readonly formErrors: ComputedRef<readonly FormMessage[]>;
  readonly meta: ComputedRef<FormMeta>;
  hasErrors(prefix?: string): boolean;
  errorsUnder(prefix: string): Readonly<Record<string, readonly string[]>>;
  invalidPaths(prefix?: string): string[];
  isFieldTouched(path: string): boolean;
  isFieldDirty(path: string): boolean;
  focusField(path: string): boolean;
}

const connected = (entry: Entry): HTMLElement | undefined => {
  const element = entry.element();
  return element?.isConnected ? element : undefined;
};

const documentOrder = (left: Entry, right: Entry): number => {
  const first = connected(left);
  const second = connected(right);

  if (first && second && first !== second) {
    return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  }
  if (first && !second) {
    return -1;
  }
  if (second && !first) {
    return 1;
  }
  return left.id - right.id;
};

const focusEntry = (entry: Entry): boolean => {
  if (entry.focus) {
    entry.focus();
    return true;
  }

  const element = entry.element();

  element?.focus();
  return element !== undefined && element !== null;
};

export const createViews = <V extends object, O>(core: FormCore<V, O>): FormViews => {
  const errorBag = computed(() =>
    Object.fromEntries(
      core.registry
        .active()
        .flatMap((entry) =>
          entry.state.errors.value.length > 0
            ? [[entry.path(), entry.state.errors.value] as const]
            : [],
        ),
    ),
  );

  const formErrors = computed(() => [
    ...core.schemaFormErrors.value,
    ...core.serverFormErrors.value,
  ]);

  const dirty = computed(() => !isEqualValue(core.engine.values, core.initial.value));

  const invalidPaths = (prefix = ''): string[] => {
    const scope = normalizePath(prefix);

    const invalid = core.registry
      .active()
      .filter((entry) => entry.state.errors.value.length > 0 && isUnder(entry.path(), scope));

    return [...new Set(invalid.toSorted(documentOrder).map((entry) => entry.path()))];
  };

  return {
    errorBag,
    errors: computed(() =>
      Object.fromEntries(
        Object.entries(errorBag.value).flatMap(([path, [first]]) =>
          first === undefined ? [] : [[path, first] as const],
        ),
      ),
    ),
    touched: computed(() =>
      Object.fromEntries(
        core.registry.active().map((entry) => [entry.path(), entry.state.touched.value] as const),
      ),
    ),
    formErrors,
    meta: computed(() => ({
      valid: Object.keys(errorBag.value).length === 0 && formErrors.value.length === 0,
      dirty: dirty.value,
      touched: core.registry.active().some((entry) => entry.state.touched.value),
      pending: core.submitting.value,
      submitCount: core.engine.submitCount.value,
      submitted: core.submitted.value,
    })),
    hasErrors: (prefix = '') => {
      const scope = normalizePath(prefix);

      return (
        Object.keys(errorBag.value).some((path) => isUnder(path, scope)) ||
        formErrors.value.some(
          (message) => scope === '' || (message.path !== undefined && isUnder(message.path, scope)),
        )
      );
    },
    errorsUnder: (prefix) =>
      Object.fromEntries(
        Object.entries(errorBag.value).filter(([path]) => isUnder(path, normalizePath(prefix))),
      ),
    invalidPaths,
    isFieldTouched: (path) =>
      core.registry
        .active()
        .some((entry) => isUnder(entry.path(), normalizePath(path)) && entry.state.touched.value),
    isFieldDirty: (path) => isPathDirty(core, normalizePath(path)),
    focusField: (path) => {
      const entry = core.registry.active().find((item) => item.path() === normalizePath(path));
      return entry !== undefined && focusEntry(entry);
    },
  };
};
