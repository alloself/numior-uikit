export const isObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;

export const isPlainRecord = (value: unknown): value is object => {
  if (!isObject(value) || Array.isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

export const isTraversable = (value: unknown): value is object =>
  Array.isArray(value) || isPlainRecord(value);
