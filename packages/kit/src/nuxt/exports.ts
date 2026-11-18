export type ModuleNamespace = Readonly<Record<string, unknown>>;

const COMPOSABLE_NAME = /^use[A-Z]/;

export const composableNames = (namespace: ModuleNamespace): string[] =>
  Object.keys(namespace)
    .filter((name) => COMPOSABLE_NAME.test(name) && typeof namespace[name] === 'function')
    .toSorted();
