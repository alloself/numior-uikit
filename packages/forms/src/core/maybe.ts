export type MaybePromise<T> = T | Promise<T>;

export const isPromise = <T>(value: MaybePromise<T>): value is Promise<T> =>
  value instanceof Promise;

export const chain = <T, R>(
  value: MaybePromise<T>,
  step: (resolved: T) => MaybePromise<R>,
): MaybePromise<R> => (isPromise(value) ? value.then(step) : step(value));
