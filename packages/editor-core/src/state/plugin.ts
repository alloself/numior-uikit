import type { EditorState, MetaKey, Plugin, PluginSpec, Transaction } from './state.types';

export const createMetaKey = <T>(name: string): MetaKey<T> => {
  const values = new WeakMap<Transaction, T>();

  return {
    name,
    read: (tr) => values.get(tr),
    write: (tr, value) => {
      values.set(tr, value);
    },
  };
};

export const definePlugin = <S>(spec: PluginSpec<S>): Plugin<S> => {
  const states = new WeakMap<EditorState, S>();

  return {
    name: spec.name,
    getState: (state) => states.get(state),
    attach: (after, before, tr) => {
      const previous = before === undefined ? undefined : states.get(before);

      if (spec.state === undefined) {
        return;
      }

      states.set(
        after,
        before === undefined || tr === undefined || previous === undefined
          ? spec.state.init(after)
          : spec.state.apply(tr, previous, before, after),
      );
    },
    filterTransaction: (tr, state) => spec.filterTransaction?.(tr, state) ?? true,
    appendTransaction: (transactions, before, after) =>
      spec.appendTransaction?.(transactions, before, after),
  };
};
