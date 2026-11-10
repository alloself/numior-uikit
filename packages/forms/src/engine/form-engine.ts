import { at, clamp, range } from 'lodash-es';
import { computed, getCurrentScope, onScopeDispose, shallowRef } from 'vue';
import { deleteAt, getAt, mergeInto, replaceContents, setAt } from '../values/access';
import { cloneValue } from '../values/clone';
import { reactiveView } from '../values/view';
import type { EngineArray, EngineKey, EntryState, FormEngine } from './engine.types';

interface ArrayHost {
  readonly raw: object;
  readonly values: object;
  fresh(): number;
  write(path: string, list: readonly unknown[]): void;
}

const createState = (): EntryState => {
  const touched = shallowRef(false);
  const attempted = shallowRef(false);
  const errors = shallowRef<readonly string[]>([]);
  const pending = shallowRef(false);

  return {
    touched,
    attempted,
    errors,
    pending,
    setTouched: (value) => {
      touched.value = value;
    },
    setAttempted: (value) => {
      attempted.value = value;
    },
    setErrors: (messages) => {
      errors.value = [...messages];
    },
    setPending: (value) => {
      pending.value = value;
    },
  };
};

const clearState = (state: EntryState): void => {
  state.setTouched(false);
  state.setAttempted(false);
  state.setErrors([]);
  state.setPending(false);
};

const isPlace = (length: number, index: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < length;

const movedPlaces = (length: number, from: number, to: number): number[] | undefined => {
  if (!isPlace(length, from)) {
    return undefined;
  }

  const rest = range(length).toSpliced(from, 1);

  return rest.toSpliced(clamp(to, 0, rest.length), 0, from);
};

const swappedPlaces = (length: number, first: number, second: number): number[] | undefined =>
  isPlace(length, first) && isPlace(length, second)
    ? range(length).with(first, second).with(second, first)
    : undefined;

const lengthAt = (values: object, path: string): number => {
  const list = getAt(values, path);
  return Array.isArray(list) ? list.length : 0;
};

const listAt = (raw: object, path: string): readonly unknown[] => {
  const list = getAt(raw, path);
  return Array.isArray(list) ? list : [];
};

const createArray = (host: ArrayHost, path: () => string): EngineArray => {
  let order: EngineKey[] = [];
  const current = (): readonly unknown[] => listAt(host.raw, path());

  const write = (next: readonly unknown[]): void => {
    host.write(path(), next);
  };

  const sized = (length: number): void => {
    order.splice(length);

    while (order.length < length) {
      order.push(host.fresh());
    }
  };

  const arrange = (places: (length: number) => readonly number[] | undefined): void => {
    const list = current();
    const next = places(list.length);

    if (next === undefined) {
      return;
    }

    sized(list.length);
    order = at(order, next);
    write(at(list, next));
  };

  const keys = computed((): readonly EngineKey[] => {
    sized(lengthAt(host.values, path()));
    return [...order];
  });

  return {
    keys,
    push: (value) => {
      const list = current();

      order.splice(list.length, order.length, host.fresh());
      write([...list, cloneValue(value)]);
    },
    prepend: (value) => {
      order.splice(0, 0, host.fresh());
      write([cloneValue(value), ...current()]);
    },
    insert: (index, value) => {
      order.splice(index, 0, host.fresh());
      write(current().toSpliced(index, 0, cloneValue(value)));
    },
    remove: (index) => {
      order.splice(index, 1);
      write(current().toSpliced(index, 1));
    },
    move: (from, to) => {
      arrange((length) => movedPlaces(length, from, to));
    },
    swap: (first, second) => {
      arrange((length) => swappedPlaces(length, first, second));
    },
    replace: (next) => {
      order = next.map(() => host.fresh());
      write(next.map(cloneValue));
    },
  };
};

export const createFormEngine = <V extends object>(initialValues: V): FormEngine<V> => {
  const raw = cloneValue(initialValues);
  const values = reactiveView(raw);
  const version = shallowRef(0);
  const submitCount = shallowRef(0);
  const live = new Set<EntryState>();
  let counter = 0;

  const changed = (): void => {
    version.value += 1;
  };

  const host: ArrayHost = {
    raw,
    values,
    fresh: () => {
      counter += 1;
      return counter;
    },
    write: (path, list) => {
      setAt(values, path, list);
      changed();
    },
  };

  return {
    raw,
    values,
    version,
    snapshot: () => cloneValue(raw),
    submitCount,
    setValue: (path, value) => {
      setAt(values, path, cloneValue(value));
      changed();
    },
    unsetValue: (path) => {
      deleteAt(values, path);
      changed();
    },
    mergeValues: (next) => {
      mergeInto(values, cloneValue(next));
      changed();
    },
    reset: (next) => {
      replaceContents(values, cloneValue(next));
      changed();
      submitCount.value = 0;
      live.forEach(clearState);
    },
    countSubmit: () => {
      submitCount.value += 1;
    },
    field: () => {
      const state = createState();

      live.add(state);

      if (getCurrentScope()) {
        onScopeDispose(() => {
          live.delete(state);
        });
      }
      return state;
    },
    array: (path) => createArray(host, path),
  };
};
