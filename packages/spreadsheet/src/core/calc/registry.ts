import type { FunctionRegistry, FunctionSpec } from './calc.types';

export const defineFunction = (spec: FunctionSpec): FunctionSpec => spec;

export const createFunctionRegistry = (specs: readonly FunctionSpec[]): FunctionRegistry => {
  const byName = new Map(specs.map((spec) => [spec.name.toUpperCase(), spec]));

  return {
    get: (name) => byName.get(name.toUpperCase()),
    names: [...byName.keys()],
  };
};
