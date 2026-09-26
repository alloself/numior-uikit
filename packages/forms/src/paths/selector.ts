import { getAt } from '../values/access';
import { normalizePath } from './paths';

export type FieldSelector<V, R> = (values: V) => R;

const PROBE: object = Object.freeze({});

const BRANCHED =
  'A field selector may only read one chain of properties, like (v) => v.contacts[0]?.name';

const recorder = <T extends object>(keys: string[], depth: number): ProxyHandler<T> => ({
  get: (_target, key) => {
    if (typeof key === 'symbol' || depth !== keys.length) {
      throw new Error(BRANCHED);
    }
    keys.push(key);
    return new Proxy(PROBE, recorder(keys, depth + 1));
  },
});

export const recordPath = <V extends object>(
  values: V,
  selector: FieldSelector<V, unknown>,
): string => {
  const keys: string[] = [];

  try {
    selector(new Proxy(values, recorder(keys, 0)));
  } catch {
    throw new Error(BRANCHED);
  }

  if (keys.length === 0) {
    throw new Error('A field selector must read a property of the values');
  }
  return keys.join('.');
};

export const readSelected = <V extends object, R>(
  values: V,
  selector: FieldSelector<V, R>,
  path: string,
): R => {
  const value = selector(values);

  if (!Object.is(value, getAt(values, path))) {
    throw new Error(`The field selector reads something other than ${path}`);
  }
  return value;
};

export const byPath = (path: string): FieldSelector<object, unknown> => {
  const normalized = normalizePath(path);
  return (values) => getAt(values, normalized);
};
