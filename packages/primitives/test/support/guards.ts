export type Guard<T> = (value: unknown) => value is T;

export type Guarded<G> = G extends Guard<infer T> ? T : never;

type Shape = Readonly<Record<string, Guard<unknown>>>;

type ShapeOf<S extends Shape> = { readonly [K in keyof S]: Guarded<S[K]> };

export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isString: Guard<string> = (value): value is string => typeof value === 'string';

export const isNumber: Guard<number> = (value): value is number => typeof value === 'number';

export const isBoolean: Guard<boolean> = (value): value is boolean => typeof value === 'boolean';

export const isDate: Guard<Date> = (value): value is Date => value instanceof Date;

export const oneOf =
  <const T extends readonly (string | number | boolean)[]>(...values: T): Guard<T[number]> =>
  (value): value is T[number] =>
    values.some((entry) => entry === value);

export const optional =
  <T>(guard: Guard<T>): Guard<T | undefined> =>
  (value): value is T | undefined =>
    value === undefined || guard(value);

export const anyOf =
  <G extends readonly Guard<unknown>[]>(...guards: G): Guard<Guarded<G[number]>> =>
  (value): value is Guarded<G[number]> =>
    guards.some((guard) => guard(value));

export const nullable =
  <T>(guard: Guard<T>): Guard<T | null> =>
  (value): value is T | null =>
    value === null || guard(value);

export const listOf =
  <T>(guard: Guard<T>): Guard<T[]> =>
  (value): value is T[] =>
    Array.isArray(value) && value.every(guard);

export const recordOf =
  <T>(guard: Guard<T>): Guard<Readonly<Record<string, T>>> =>
  (value): value is Readonly<Record<string, T>> =>
    isRecord(value) && Object.values(value).every(guard);

export const shapeOf =
  <S extends Shape>(shape: S): Guard<ShapeOf<S>> =>
  (value): value is ShapeOf<S> =>
    isRecord(value) && Object.entries(shape).every(([key, guard]) => guard(value[key]));

export const parseAs = <T>(text: string, guard: Guard<T>, what: string): T => {
  const data: unknown = JSON.parse(text);

  if (!guard(data)) {
    throw new Error(`Unexpected ${what}: ${text}`);
  }
  return data;
};
