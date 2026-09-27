import type { ReferenceProp } from '../reference/reference.types';

export type ConfiguratorValue = string | number | boolean | null | undefined;

export type ConfiguratorValues = Readonly<Record<string, ConfiguratorValue>>;

export interface ConfiguratorState {
  readonly enums: Record<string, string | null>;
  readonly flags: Record<string, boolean>;
  readonly numbers: Record<string, number | null>;
  readonly strings: Record<string, string>;
}

const literalOf = (raw: string | undefined): ConfiguratorValue => {
  if (raw === undefined) {
    return undefined;
  }
  if (raw === 'true' || raw === 'false') {
    return raw === 'true';
  }
  if (raw === 'null') {
    return null;
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw);
  }
  return /^".*"$/.test(raw) ? raw.slice(1, -1) : undefined;
};

export const configuratorState = (props: readonly ReferenceProp[]): ConfiguratorState => {
  const state: ConfiguratorState = { enums: {}, flags: {}, numbers: {}, strings: {} };

  for (const prop of props) {
    const initial = literalOf(prop.default);

    switch (prop.kind) {
      case 'enum':
        state.enums[prop.name] = typeof initial === 'string' ? initial : null;
        break;
      case 'boolean':
        state.flags[prop.name] = initial === true;
        break;
      case 'number':
        state.numbers[prop.name] = typeof initial === 'number' ? initial : null;
        break;
      default:
        state.strings[prop.name] = typeof initial === 'string' ? initial : '';
    }
  }
  return state;
};

export type ConfiguratorChange =
  | { readonly kind: 'enum'; readonly name: string; readonly value: string | null }
  | { readonly kind: 'boolean'; readonly name: string; readonly value: boolean }
  | { readonly kind: 'number'; readonly name: string; readonly value: number | null }
  | { readonly kind: 'string'; readonly name: string; readonly value: string };

export const applyChange = (state: ConfiguratorState, change: ConfiguratorChange): void => {
  switch (change.kind) {
    case 'enum':
      state.enums[change.name] = change.value;
      break;
    case 'boolean':
      state.flags[change.name] = change.value;
      break;
    case 'number':
      state.numbers[change.name] = change.value;
      break;
    default:
      state.strings[change.name] = change.value;
  }
};

export const resetState = (state: ConfiguratorState, props: readonly ReferenceProp[]): void => {
  const initial = configuratorState(props);

  Object.assign(state.enums, initial.enums);
  Object.assign(state.flags, initial.flags);
  Object.assign(state.numbers, initial.numbers);
  Object.assign(state.strings, initial.strings);
};

export const stateValues = (state: ConfiguratorState): ConfiguratorValues => ({
  ...state.strings,
  ...state.numbers,
  ...state.flags,
  ...state.enums,
});

const isDefault = (prop: ReferenceProp, value: ConfiguratorValue): boolean =>
  value === undefined || value === null || value === '' || value === literalOf(prop.default);

const attributeOf = (name: string, value: ConfiguratorValue): string => {
  if (typeof value === 'boolean') {
    return value ? name : `:${name}="false"`;
  }
  return typeof value === 'number' ? `:${name}="${value}"` : `${name}="${String(value)}"`;
};

export const configuratorCode = (
  component: string,
  props: readonly ReferenceProp[],
  values: ConfiguratorValues,
  content: string | undefined,
): string => {
  const attributes = props
    .filter((prop) => !isDefault(prop, values[prop.name]))
    .map((prop) => ` ${attributeOf(prop.name, values[prop.name])}`)
    .join('');

  const tag =
    content === undefined || content === ''
      ? `<${component}${attributes} />`
      : `<${component}${attributes}>${content}</${component}>`;

  return `<template>\n  ${tag}\n</template>`;
};

export const boundValues = (values: ConfiguratorValues): Record<string, ConfiguratorValue> =>
  Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
