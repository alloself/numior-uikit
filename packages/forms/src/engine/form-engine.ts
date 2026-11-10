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

const moved = <T>(items: readonly T[], from: number, to: number): T[] => {
  const next = [...items];
  const [item] = next.splice(from, 1);

  if (item !== undefined) {
    next.splice(to, 0, item);
  }
  return next;
};

const swapped = <T>(items: readonly T[], first: number, second: number): T[] => {
  const left = items[first];
  const right = items[second];

  return left === undefined || right === undefined
    ? [...items]
    : items.map((item, index) => (index === first ? right : index === second ? left : item));
};

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

  const keys = computed((): readonly EngineKey[] => {
    const length = lengthAt(host.values, path());

    order.splice(length);

    while (order.length < length) {
      order.push(host.fresh());
    }
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
      order = moved(order, from, to);
      write(moved(current(), from, to));
    },
    swap: (first, second) => {
      order = swapped(order, first, second);
      write(swapped(current(), first, second));
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
