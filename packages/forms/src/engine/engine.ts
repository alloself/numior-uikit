import type { Reactive, Ref } from 'vue';

export interface EntryState {
  readonly touched: Readonly<Ref<boolean>>;
  readonly attempted: Readonly<Ref<boolean>>;
  readonly errors: Readonly<Ref<readonly string[]>>;
  readonly pending: Readonly<Ref<boolean>>;
  setTouched(touched: boolean): void;
  setAttempted(attempted: boolean): void;
  setErrors(messages: readonly string[]): void;
  setPending(pending: boolean): void;
}

export interface EngineField<T> extends EntryState {
  readonly value: Readonly<Ref<T>>;
}

export interface EngineRow<T> {
  readonly key: string | number;
  readonly value: T;
}

export interface EngineArray<T> {
  readonly rows: Readonly<Ref<readonly EngineRow<T>[]>>;
  push(value: T): void;
  prepend(value: T): void;
  insert(index: number, value: T): void;
  remove(index: number): void;
  move(from: number, to: number): void;
  swap(first: number, second: number): void;
  replace(values: readonly T[]): void;
}

export interface FormEngine<V extends object> {
  readonly values: Reactive<V>;
  snapshot(): V;
  readonly submitCount: Readonly<Ref<number>>;
  setValue(path: string, value: unknown): void;
  unsetValue(path: string): void;
  mergeValues(values: object): void;
  reset(values: V): void;
  countSubmit(): void;
  field<T>(path: () => string, label: () => string | undefined): EngineField<T>;
  array<T>(path: () => string): EngineArray<T>;
}

export type FormEngineFactory = <V extends object>(initialValues: V) => FormEngine<V>;
