const origins = new WeakMap<object, unknown>();

export const marked = <R extends object>(rule: R, origin: unknown): R => {
  origins.set(rule, origin);
  return rule;
};

export const originOf = (rule: object): unknown => origins.get(rule) ?? rule;
