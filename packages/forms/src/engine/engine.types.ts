import type { Ref } from 'vue';

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

export type EngineKey = string | number;

export interface EngineArray {
  readonly keys: Readonly<Ref<readonly EngineKey[]>>;
  push(value: unknown): void;
  prepend(value: unknown): void;
  insert(index: number, value: unknown): void;
  remove(index: number): void;
  move(from: number, to: number): void;
  swap(first: number, second: number): void;
  replace(values: readonly unknown[]): void;
}

export interface FormEngine<V extends object> {
  readonly raw: V;
  readonly values: V;
  readonly version: Readonly<Ref<number>>;
  snapshot(): V;
  readonly submitCount: Readonly<Ref<number>>;
  setValue(path: string, value: unknown): void;
  unsetValue(path: string): void;
  mergeValues(values: object): void;
  reset(values: V): void;
  countSubmit(): void;
  field(path: () => string, label: () => string | undefined): EntryState;
  array(path: () => string): EngineArray;
}

export type FormEngineFactory = <V extends object>(initialValues: V) => FormEngine<V>;
