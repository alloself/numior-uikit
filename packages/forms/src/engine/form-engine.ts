import {
  computed,
  getCurrentScope,
  onScopeDispose,
  reactive,
  shallowRef,
  type Reactive,
} from 'vue';
import { deleteAt, mergeInto, readAt, replaceContents, setAt } from '../values/access';
import { cloneValue } from '../values/clone';
import type { EngineArray, EngineRow, EntryState, FormEngine } from './engine';

interface Counter {
  next: number;
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

const createArray = <T>(
  values: Reactive<object>,
  path: () => string,
  counter: Counter,
): EngineArray<T> => {
  const keys: number[] = [];

  const fresh = (): number => {
    counter.next += 1;
    return counter.next;
  };

  const items = (): readonly T[] => readAt<readonly T[] | undefined>(values, path()) ?? [];

  const write = (next: readonly T[]): void => {
    setAt(values, path(), next);
  };

  const rows = computed((): readonly EngineRow<T>[] => {
    const current = items();

    keys.splice(current.length);

    while (keys.length < current.length) {
      keys.push(fresh());
    }
    return current.map((value, index) => ({ key: keys[index] ?? index, value }));
  });

  return {
    rows,
    push: (value) => {
      const current = items();

      keys.splice(current.length, keys.length, fresh());
      write([...current, cloneValue(value)]);
    },
    prepend: (value) => {
      keys.splice(0, 0, fresh());
      write([cloneValue(value), ...items()]);
    },
    insert: (index, value) => {
      keys.splice(index, 0, fresh());
      write(items().toSpliced(index, 0, cloneValue(value)));
    },
    remove: (index) => {
      keys.splice(index, 1);
      write(items().toSpliced(index, 1));
    },
    move: (from, to) => {
      keys.splice(0, keys.length, ...moved(keys, from, to));
      write(moved(items(), from, to));
    },
    swap: (first, second) => {
      keys.splice(0, keys.length, ...swapped(keys, first, second));
      write(swapped(items(), first, second));
    },
    replace: (next) => {
      keys.splice(0, keys.length, ...next.map(fresh));
      write(next.map(cloneValue));
    },
  };
};

export const createFormEngine = <V extends object>(initialValues: V): FormEngine<V> => {
  const raw = cloneValue(initialValues);
  const values = reactive(raw);
  const submitCount = shallowRef(0);
  const live = new Set<EntryState>();
  const counter: Counter = { next: 0 };

  return {
    values,
    snapshot: () => cloneValue(raw),
    submitCount,
    setValue: (path, value) => {
      setAt(values, path, cloneValue(value));
    },
    unsetValue: (path) => {
      deleteAt(values, path);
    },
    mergeValues: (next) => {
      mergeInto(values, cloneValue(next));
    },
    reset: (next) => {
      replaceContents(values, cloneValue(next));
      submitCount.value = 0;
      live.forEach(clearState);
    },
    countSubmit: () => {
      submitCount.value += 1;
    },
    field: <T>(path: () => string) => {
      const state = createState();

      live.add(state);

      if (getCurrentScope()) {
        onScopeDispose(() => {
          live.delete(state);
        });
      }
      return { ...state, value: computed(() => readAt<T>(values, path())) };
    },
    array: <T>(path: () => string) => createArray<T>(values, path, counter),
  };
};
