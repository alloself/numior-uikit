export interface Intent<T> {
  set(value: T | undefined): void;
  peek(): T | undefined;
  take(): T | undefined;
}

export const createIntent = <T>(): Intent<T> => {
  let pending: T | undefined;

  return {
    set: (value) => {
      pending = value;
    },
    peek: () => pending,
    take: () => {
      const value = pending;

      pending = undefined;
      return value;
    },
  };
};
