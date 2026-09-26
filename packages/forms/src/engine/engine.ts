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

export interface EngineField<T> extends EntryState {
  readonly value: Readonly<Ref<T>>;
}

export interface FormEngine<V extends object> {
  readonly values: V;
  readonly submitCount: Readonly<Ref<number>>;
  setValue(path: string, value: unknown): void;
  unsetValue(path: string): void;
  mergeValues(values: object): void;
  reset(values: V): void;
  countSubmit(): void;
  field<T>(path: () => string, label: () => string | undefined): EngineField<T>;
}
