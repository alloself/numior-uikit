import { joinPath } from '../paths/paths';
import { getAt } from './access';
import { isEqualValue } from './equal';
import { isTraversable } from './kinds';

export interface ReadLog<V extends object> {
  readonly view: V;
  reads(): ReadonlyMap<string, unknown>;
}

interface Child {
  readonly target: object;
  readonly proxy: object;
}

const recorder = <T extends object>(target: T, prefix: string, paths: Set<string>): T => {
  const children = new Map<string, Child>();

  return new Proxy(target, {
    get: (object, key, receiver) => {
      const value: unknown = Reflect.get(object, key, receiver);

      if (typeof key === 'symbol' || typeof value === 'function') {
        return value;
      }

      const path = joinPath(prefix, key);

      if (isTraversable(value)) {
        const known = children.get(key);

        if (known && known.target === value) {
          return known.proxy;
        }

        const proxy = recorder(value, path, paths);

        children.set(key, { target: value, proxy });
        return proxy;
      }
      paths.add(path);
      return value;
    },
    has: (object, key) => {
      if (typeof key === 'string') {
        paths.add(joinPath(prefix, key));
      }
      return Reflect.has(object, key);
    },
    ownKeys: (object) => {
      paths.add(prefix);
      return Reflect.ownKeys(object);
    },
  });
};

export const recordReads = <V extends object>(values: V): ReadLog<V> => {
  const paths = new Set<string>();

  return {
    view: recorder(values, '', paths),
    reads: () => new Map([...paths].map((path) => [path, getAt(values, path)] as const)),
  };
};

export const readsHold = (reads: ReadonlyMap<string, unknown>, current: object): boolean =>
  [...reads].every(([path, value]) => isEqualValue(getAt(current, path), value));
