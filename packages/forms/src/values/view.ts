import { reactive } from 'vue';

export const reactiveView = <V extends object>(raw: V): V => {
  const values = reactive<object>(raw);

  return new Proxy(raw, {
    get: (_target, key) => Reflect.get(values, key),
    set: (_target, key, value) => Reflect.set(values, key, value),
    has: (_target, key) => Reflect.has(values, key),
    deleteProperty: (_target, key) => Reflect.deleteProperty(values, key),
    ownKeys: () => Reflect.ownKeys(values),
  });
};
