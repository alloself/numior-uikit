import type { StandardIssue, StandardResult, StandardSchema } from '../../src';

export type SchemaValues = Readonly<Record<string, unknown>>;

type Segment = PropertyKey | { readonly key: PropertyKey };

type Check = (values: SchemaValues) => readonly StandardIssue[];

interface ProbeOptions {
  readonly async?: boolean;
}

export interface ProbeSchema<O> extends StandardSchema<unknown, O> {
  readonly inputs: readonly SchemaValues[];
}

const isValues = (value: unknown): value is SchemaValues =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const issue = (message: string, ...path: Segment[]): StandardIssue =>
  path.length === 0 ? { message } : { message, path };

export const transformSchema = <O>(
  check: Check,
  output: (values: SchemaValues) => O,
  options: ProbeOptions = {},
): ProbeSchema<O> => {
  const inputs: SchemaValues[] = [];

  const evaluate = (value: unknown): StandardResult<O> => {
    const values = isValues(value) ? value : {};
    const issues = check(values);

    inputs.push(values);
    return issues.length > 0 ? { issues } : { value: output(values) };
  };

  return {
    inputs,
    '~standard': {
      version: 1,
      vendor: 'probe',
      validate: (value) =>
        options.async ? Promise.resolve().then(() => evaluate(value)) : evaluate(value),
    },
  };
};

export const probeSchema = (check: Check, options: ProbeOptions = {}): ProbeSchema<SchemaValues> =>
  transformSchema(check, (values) => values, options);
