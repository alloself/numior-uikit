import { computed, type ComputedRef } from 'vue';
import { isPathDirty } from '../core/dirty';
import type { FormCore } from '../core/form-core';
import type { FormMessage, FormMeta } from '../core/form.types';
import type { AnyEntry } from '../core/registry';
import { isUnder, normalizePath, prefixesOf } from '../paths/paths';
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
  firstInvalidPath(prefix?: string): string | undefined;
  isFieldTouched(path: string): boolean;
  isFieldDirty(path: string): boolean;
  focusField(path: string): boolean;
}

interface Placed {
  readonly entry: AnyEntry;
  readonly element: HTMLElement | undefined;
}

type Bag = Readonly<Record<string, readonly string[]>>;

const connected = (entry: AnyEntry): HTMLElement | undefined => {
  const element = entry.element();
  return element?.isConnected ? element : undefined;
};

const documentOrder = (left: Placed, right: Placed): number => {
  const first = left.element;
  const second = right.element;

  if (first && second && first !== second) {
    return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  }
  if (first && !second) {
    return -1;
  }
  if (second && !first) {
    return 1;
  }
  return left.entry.id - right.entry.id;
};

const focusEntry = (entry: AnyEntry): boolean => {
  if (entry.focus) {
    entry.focus();
    return true;
  }

  const element = entry.element();

  element?.focus();
  return element !== undefined && element !== null;
};

const uniquePaths = (placed: readonly Placed[]): string[] => [
  ...new Set(placed.map(({ entry }) => entry.path())),
];

const sameBag = (left: Bag, right: Bag): boolean => {
  const keys = Object.keys(right);

  return keys.length === Object.keys(left).length && keys.every((key) => left[key] === right[key]);
};

const sameMeta = (left: FormMeta, right: FormMeta): boolean =>
  left.valid === right.valid &&
  left.dirty === right.dirty &&
  left.touched === right.touched &&
  left.pending === right.pending &&
  left.submitCount === right.submitCount &&
  left.submitted === right.submitted;

const sameFlags = (
  left: Readonly<Record<string, boolean>>,
  right: Readonly<Record<string, boolean>>,
): boolean => {
  const keys = Object.keys(right);

  return keys.length === Object.keys(left).length && keys.every((key) => left[key] === right[key]);
};

export const createViews = <V extends object, O>(core: FormCore<V, O>): FormViews => {
  const errorBag = computed((previous?: Bag): Bag => {
    const next = Object.fromEntries(
      core.registry
        .active()
        .flatMap((entry) =>
          entry.state.errors.value.length > 0
            ? [[entry.path(), entry.state.errors.value] as const]
            : [],
        ),
    );

    return previous !== undefined && sameBag(previous, next) ? previous : next;
  });

  const formErrors = computed(() => [
    ...core.schemaFormErrors.value,
    ...core.serverFormErrors.value,
  ]);

  const flagged = computed(() => {
    const prefixes = new Set<string>();

    for (const path of Object.keys(errorBag.value)) {
      for (const prefix of prefixesOf(path)) {
        prefixes.add(prefix);
      }
    }
    for (const message of formErrors.value) {
      for (const prefix of message.path === undefined ? [''] : prefixesOf(message.path)) {
        prefixes.add(prefix);
      }
    }
    return prefixes;
  });

  const dirty = computed(() => {
    void core.engine.version.value;
    return !isEqualValue(core.engine.raw, core.initial.value);
  });

  const invalid = (prefix: string): Placed[] => {
    const scope = normalizePath(prefix);

    return core.registry.active().reduce<Placed[]>((found, entry) => {
      if (entry.state.errors.value.length > 0 && isUnder(entry.path(), scope)) {
        found.push({ entry, element: connected(entry) });
      }
      return found;
    }, []);
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
    touched: computed((previous?: Readonly<Record<string, boolean>>) => {
      const next = Object.fromEntries(
        core.registry.active().map((entry) => [entry.path(), entry.state.touched.value] as const),
      );

      return previous !== undefined && sameFlags(previous, next) ? previous : next;
    }),
    formErrors,
    meta: computed((previous?: FormMeta): FormMeta => {
      const next = {
        valid: Object.keys(errorBag.value).length === 0 && formErrors.value.length === 0,
        dirty: dirty.value,
        touched: core.registry.active().some((entry) => entry.state.touched.value),
        pending: core.submission.value.phase === 'running',
        submitCount: core.engine.submitCount.value,
        submitted: core.submission.value.phase === 'succeeded',
      };

      return previous !== undefined && sameMeta(previous, next) ? previous : next;
    }),
    hasErrors: (prefix = '') => flagged.value.has(normalizePath(prefix)),
    errorsUnder: (prefix) => {
      const scope = normalizePath(prefix);

      return Object.fromEntries(
        Object.entries(errorBag.value).filter(([path]) => isUnder(path, scope)),
      );
    },
    invalidPaths: (prefix = '') => uniquePaths(invalid(prefix).toSorted(documentOrder)),
    firstInvalidPath: (prefix = '') =>
      invalid(prefix)
        .reduce<Placed | undefined>(
          (first, placed) =>
            first === undefined || documentOrder(placed, first) < 0 ? placed : first,
          undefined,
        )
        ?.entry.path(),
    isFieldTouched: (path) => {
      const scope = normalizePath(path);

      return core.registry
        .active()
        .some((entry) => entry.state.touched.value && isUnder(entry.path(), scope));
    },
    isFieldDirty: (path) => isPathDirty(core, normalizePath(path)),
    focusField: (path) =>
      (core.registry.index().byPath.get(normalizePath(path)) ?? []).toReversed().some(focusEntry),
  };
};
