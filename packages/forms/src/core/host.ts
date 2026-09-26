import { getCurrentScope, watch } from 'vue';
import type { EntryState, FormEngine } from '../engine/engine.types';
import { isUnder } from '../paths/paths';
import { getAt } from '../values/access';
import { isPathDirty } from './dirty';
import type { FormCore } from './form-core';
import { writeErrors } from './messages';
import type { Entry, EntryKind } from './registry';
import { validatesOnBlur, validatesOnChange } from './timing';
import type {
  AsyncRuleContext,
  FieldFlush,
  FieldRuleContext,
  FieldValidation,
  ValidateOn,
} from './types';
import type { ApplyScope, Validation } from './validation';

export interface EntrySpec<V extends object> {
  readonly kind: EntryKind;
  readonly path: () => string;
  readonly active: () => boolean;
  readonly disabled: () => boolean;
  readonly label: () => string | undefined;
  readonly element: () => HTMLElement | null | undefined;
  readonly focus: (() => void) | undefined;
  readonly flush: FieldFlush | undefined;
  readonly value: () => unknown;
  readonly check: (context: FieldRuleContext<V>) => string | undefined;
  readonly checkAsync: (context: AsyncRuleContext<V>) => Promise<string | undefined>;
  readonly hasAsync: () => boolean;
  readonly debounce: () => number | undefined;
  readonly validateOn: () => ValidateOn | undefined;
  readonly keepValue: () => boolean;
  readonly state: EntryState;
}

export interface FormHost<V extends object> {
  readonly engine: FormEngine<V>;
  add(spec: EntrySpec<V>): Entry<V>;
  remove(entry: Entry<V>): void;
  change(entry: Entry<V>, value: unknown): Promise<void>;
  write(path: string, value: unknown): Promise<void>;
  blur(entry: Entry<V>): Promise<void>;
  validateEntry(entry: Entry<V>): Promise<FieldValidation>;
  revalidate(entries: readonly Entry<V>[], scope?: ApplyScope): Promise<void>;
  rulesChanged(entry: Entry<V>): Promise<void>;
  flush(entries: readonly Entry<V>[]): Promise<void>;
  guard(entry: Entry<V>): (value: unknown) => boolean;
  isDirty(path: string): boolean;
  track<T>(work: Promise<T>): Promise<T>;
}

const DEBOUNCE = 300;

const toVoid = (): void => undefined;

export const createHost = <V extends object, O>(
  core: FormCore<V, O>,
  validation: Validation<V, O>,
): FormHost<V> => {
  const claimed = (path: string, except: Entry<V>): boolean =>
    core.registry.active().some((entry) => entry !== except && entry.path() === path);

  const containerExists = (path: string): boolean =>
    getAt(core.engine.values, path.split('.').slice(0, -1).join('.')) !== undefined;

  const restore = (entry: Entry<V>): void => {
    const saved = core.retained.get(entry.path());

    if (saved) {
      core.retained.delete(entry.path());
      entry.state.setTouched(saved.touched);
      entry.state.setAttempted(saved.attempted);
      writeErrors(entry.state, saved.errors);
    }
  };

  const retain = (entry: Entry<V>): void => {
    const { touched, attempted, errors } = entry.state;

    if (touched.value || attempted.value || errors.value.length > 0) {
      core.retained.set(entry.path(), {
        touched: touched.value,
        attempted: attempted.value,
        errors: errors.value,
      });
    }
  };

  const release = (entry: Entry<V>): void => {
    if (!entry.keepValue()) {
      core.engine.unsetValue(entry.path());
    }
  };

  const commitFor = (entry: Entry<V>): ((value: unknown) => boolean) => {
    const { epoch } = core.session;
    const { fieldEpoch } = entry;

    return (value) => {
      if (epoch !== core.session.epoch || fieldEpoch !== entry.fieldEpoch) {
        return false;
      }
      core.engine.setValue(entry.path(), value);
      return true;
    };
  };

  const flush = async (entries: readonly Entry<V>[]): Promise<void> => {
    await Promise.all(entries.map((entry) => entry.flush?.(commitFor(entry))));
  };

  const revalidate = (entries: readonly Entry<V>[], scope?: ApplyScope): Promise<void> => {
    const due = entries.filter((entry) =>
      validatesOnChange(entry.validateOn(), entry.state.attempted.value),
    );

    return due.length === 0
      ? Promise.resolve()
      : validation.validateEntries(due, 'change', scope).then(toVoid);
  };

  return {
    engine: core.engine,
    add: (spec) => {
      const entry: Entry<V> = {
        ...spec,
        id: core.registry.nextId(),
        validateOn: () => spec.validateOn() ?? core.validateOn,
        debounce: () => spec.debounce() ?? DEBOUNCE,
        fieldEpoch: 0,
      };

      restore(entry);
      core.registry.add(entry);

      if (getCurrentScope()) {
        watch(entry.active, (active) => {
          if (!active && !entry.keepValue() && !claimed(entry.path(), entry)) {
            release(entry);
          }
        });
      }
      return entry;
    },
    remove: (entry) => {
      core.registry.remove(entry);
      validation.async.forget(entry);

      if (!claimed(entry.path(), entry) && containerExists(entry.path())) {
        retain(entry);
        release(entry);
      }
    },
    change: (entry, value) => {
      core.engine.setValue(entry.path(), value);
      return revalidate([entry]);
    },
    write: (path, value) => {
      const affected = core.registry.entries.value.filter(
        (entry) => isUnder(entry.path(), path) || isUnder(path, entry.path()),
      );

      for (const entry of affected) {
        entry.fieldEpoch += 1;
      }
      core.engine.setValue(path, value);
      return revalidate(affected.filter((entry) => entry.active()));
    },
    blur: (entry) => {
      entry.state.setTouched(true);
      return validatesOnBlur(entry.validateOn(), entry.state.attempted.value)
        ? validation.validateEntries([entry], 'blur').then(toVoid)
        : Promise.resolve();
    },
    validateEntry: async (entry) => {
      await flush([entry]);

      const result = await validation.validateFully([entry]);
      const errors = result.byOwner.get(entry.path()) ?? [];

      return { valid: errors.length === 0, errors };
    },
    revalidate,
    rulesChanged: (entry) => {
      validation.async.forget(entry);

      return entry.state.attempted.value
        ? core.tracker.track(validation.validateEntries([entry], 'change').then(toVoid))
        : Promise.resolve();
    },
    flush,
    guard: commitFor,
    isDirty: (path) => isPathDirty(core, path),
    track: (work) => core.tracker.track(work),
  };
};
