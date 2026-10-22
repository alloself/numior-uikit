import { readdirSync, readFileSync } from 'node:fs';

export type Input = number | string | boolean;

type Expected =
  | Input
  | { readonly error: string }
  | { readonly rows: readonly (readonly Input[])[] };

export interface CorpusCase {
  readonly formula: string;
  readonly cells: Readonly<Record<string, Input>>;
  readonly expected: Expected;
  readonly tolerance: number;
  readonly locale: 'en' | 'ru';
}

export interface Corpus {
  readonly family: string;
  readonly functions: readonly string[];
  readonly cases: readonly CorpusCase[];
}

const DIRECTORY = new URL('./corpus/functions/', import.meta.url);

export const RESULT = { row: 0, col: 26 } as const;

const DEFAULT_TOLERANCE = 1e-12;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isInput = (value: unknown): value is Input =>
  typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';

const inputs = (value: unknown, where: string): Record<string, Input> => {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw new Error(`${where}: cells must be an object`);
  }
  return Object.fromEntries(
    Object.entries(value).map(([address, input]) => {
      if (!isInput(input)) {
        throw new Error(`${where}: ${address} holds an unsupported value`);
      }
      return [address, input];
    }),
  );
};

const rowOf = (value: unknown, where: string): Input[] => {
  if (!Array.isArray(value) || !value.every(isInput)) {
    throw new Error(`${where}: expected rows hold plain values`);
  }
  return value;
};

const expectedOf = (value: unknown, where: string): Expected => {
  if (isInput(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return { rows: value.map((row) => rowOf(row, where)) };
  }
  if (isRecord(value) && typeof value.error === 'string' && value.error.startsWith('#')) {
    return { error: value.error };
  }
  throw new Error(`${where}: unsupported expected value`);
};

const caseOf = (
  value: unknown,
  shared: Readonly<Record<string, Input>>,
  tolerance: number,
  where: string,
): CorpusCase => {
  if (!isRecord(value) || typeof value.formula !== 'string') {
    throw new Error(`${where}: a case needs a formula`);
  }
  return {
    formula: value.formula,
    cells: { ...shared, ...inputs(value.cells, where) },
    expected: expectedOf(value.expected, `${where} ${value.formula}`),
    tolerance: typeof value.tolerance === 'number' ? value.tolerance : tolerance,
    locale: value.locale === 'ru' ? 'ru' : 'en',
  };
};

const corpusOf = (file: string): Corpus => {
  const data: unknown = JSON.parse(readFileSync(new URL(file, DIRECTORY), 'utf8'));

  if (
    !isRecord(data) ||
    typeof data.family !== 'string' ||
    !Array.isArray(data.functions) ||
    !Array.isArray(data.cases)
  ) {
    throw new Error(`${file}: not a function corpus`);
  }

  const shared = inputs(data.cells, file);
  const tolerance = typeof data.tolerance === 'number' ? data.tolerance : DEFAULT_TOLERANCE;

  return {
    family: data.family,
    functions: data.functions.filter((name): name is string => typeof name === 'string'),
    cases: data.cases.map((entry) => caseOf(entry, shared, tolerance, file)),
  };
};

export const functionCorpora = (): Corpus[] =>
  readdirSync(DIRECTORY)
    .filter((file) => file.endsWith('.json'))
    .toSorted()
    .map(corpusOf);

const close = (actual: number, wanted: number, tolerance: number): boolean =>
  Math.abs(actual - wanted) <= tolerance * Math.max(1, Math.abs(wanted));

export const agrees = (actual: unknown, wanted: Input, tolerance: number): boolean =>
  typeof actual === 'number' && typeof wanted === 'number'
    ? close(actual, wanted, tolerance)
    : actual === wanted;

export const wantedGrid = (expected: Expected): readonly (readonly Input[])[] => {
  if (typeof expected !== 'object') {
    return [[expected]];
  }
  return 'rows' in expected ? expected.rows : [[expected.error]];
};
