const COMPONENT_NAME = /^Nui[A-Z]/;
const COMPOSABLE_NAME = /^use[A-Z]/;

export type ModuleNamespace = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

const isComponent = (value: unknown): boolean => {
  if (isRecord(value)) {
    return 'setup' in value || 'render' in value;
  }
  return typeof value === 'function' && 'props' in value;
};

export const componentNames = (namespace: ModuleNamespace): string[] =>
  Object.keys(namespace)
    .filter((name) => COMPONENT_NAME.test(name) && isComponent(namespace[name]))
    .toSorted();

export const composableNames = (namespace: ModuleNamespace): string[] =>
  Object.keys(namespace)
    .filter((name) => COMPOSABLE_NAME.test(name) && typeof namespace[name] === 'function')
    .toSorted();
