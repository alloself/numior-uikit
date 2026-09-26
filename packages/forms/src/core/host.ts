import { getCurrentScope, watch } from 'vue';
import type { EntryState, FormEngine } from '../engine/engine';
import { isPathDirty } from './dirty';
import type { FormCore } from './form-core';
import { writeErrors } from './messages';
import type { Entry, EntryKind } from './registry';
import { validatesOnBlur, validatesOnChange } from './timing';
import type { FieldFlush, FieldRuleContext, FieldValidation, ValidateOn } from './types';
import type { Validation } from './validation';

export interface EntrySpec {
  readonly kind: EntryKind;
  readonly path: () => string;
  readonly active: () => boolean;
  readonly disabled: () => boolean;
  readonly label: () => string | undefined;
  readonly element: () => HTMLElement | null | undefined;
  readonly focus: (() => void) | undefined;
  readonly flush: FieldFlush | undefined;
  readonly check: (context: FieldRuleContext) => string | undefined;
  readonly validateOn: ValidateOn | undefined;
  readonly keepValue: boolean;
  readonly state: EntryState;
}

export interface FormHost {
  readonly engine: FormEngine<object>;
  add(spec: EntrySpec): Entry;
  remove(entry: Entry): void;
  change(entry: Entry, value: unknown): Promise<void>;
  blur(entry: Entry): Promise<void>;
  validateEntry(entry: Entry): Promise<FieldValidation>;
  revalidate(entries: readonly Entry[]): Promise<void>;
  flush(entries: readonly Entry[]): Promise<void>;
  guard(entry: Entry): (value: unknown) => boolean;
  isDirty(path: string): boolean;
}

const toVoid = (): void => undefined;

export const createHost = <V extends object, O>(
  core: FormCore<V, O>,
  validation: Validation<V, O>,
): FormHost => {
  const claimed = (path: string, except: Entry): boolean =>
    core.registry.active().some((entry) => entry !== except && entry.path() === path);

  const restore = (entry: Entry): void => {
    const saved = core.retained.get(entry.path());

    if (saved) {
      core.retained.delete(entry.path());
      entry.state.setTouched(saved.touched);
      entry.state.setAttempted(saved.attempted);
      writeErrors(entry.state, saved.errors);
    }
  };

  const retain = (entry: Entry): void => {
    const { touched, attempted, errors } = entry.state;

    if (touched.value || attempted.value || errors.value.length > 0) {
      core.retained.set(entry.path(), {
        touched: touched.value,
        attempted: attempted.value,
        errors: errors.value,
      });
    }
  };

  const release = (entry: Entry): void => {
    if (!entry.keepValue) {
      core.engine.unsetValue(entry.path());
    }
  };

  const commitFor = (entry: Entry): ((value: unknown) => boolean) => {
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

  const flush = async (entries: readonly Entry[]): Promise<void> => {
    await Promise.all(entries.map((entry) => entry.flush?.(commitFor(entry))));
  };

  const revalidate = (entries: readonly Entry[]): Promise<void> => {
    const due = entries.filter((entry) =>
      validatesOnChange(entry.validateOn, entry.state.attempted.value),
    );

    return due.length === 0 ? Promise.resolve() : validation.validateEntries(due).then(toVoid);
  };

  return {
    engine: core.engine,
    add: (spec) => {
      const entry: Entry = {
        ...spec,
        id: core.registry.nextId(),
        validateOn: spec.validateOn ?? core.validateOn,
        fieldEpoch: 0,
      };

      restore(entry);
      core.registry.add(entry);

      if (!entry.keepValue && getCurrentScope()) {
        watch(entry.active, (active) => {
          if (!active && !claimed(entry.path(), entry)) {
            release(entry);
          }
        });
      }
      return entry;
    },
    remove: (entry) => {
      core.registry.remove(entry);

      if (!claimed(entry.path(), entry)) {
        retain(entry);
        release(entry);
      }
    },
    change: (entry, value) => {
      core.engine.setValue(entry.path(), value);
      return revalidate([entry]);
    },
    blur: (entry) => {
      entry.state.setTouched(true);
      return validatesOnBlur(entry.validateOn, entry.state.attempted.value)
        ? validation.validateEntries([entry]).then(toVoid)
        : Promise.resolve();
    },
    validateEntry: async (entry) => {
      await flush([entry]);

      const result = await validation.validateEntries([entry]);
      const errors = result.byOwner.get(entry.path()) ?? [];

      return { valid: errors.length === 0, errors };
    },
    revalidate,
    flush,
    guard: commitFor,
    isDirty: (path) => isPathDirty(core, path),
  };
};
