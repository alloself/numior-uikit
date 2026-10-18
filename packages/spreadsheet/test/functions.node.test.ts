import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import {
  BASE_FUNCTIONS,
  createFunctionRegistry,
  formatCell,
  isCellError,
  type CellError,
} from '../src/core';
import { openSheet } from './sheet-harness';

type Input = number | string | boolean;

type Expected =
  | Input
  | { readonly error: CellError }
  | { readonly rows: readonly (readonly Input[])[] };

interface CorpusCase {
  readonly formula: string;
  readonly cells: Readonly<Record<string, Input>>;
  readonly expected: Expected;
  readonly tolerance: number;
}

interface Corpus {
  readonly family: string;
  readonly functions: readonly string[];
  readonly cases: readonly CorpusCase[];
}

const DIRECTORY = new URL('./corpus/functions/', import.meta.url);

const RESULT = { row: 0, col: 26 } as const;

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
  if (isRecord(value) && typeof value.error === 'string' && isCellError(value.error)) {
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

const corpora = readdirSync(DIRECTORY)
  .filter((file) => file.endsWith('.json'))
  .toSorted()
  .map(corpusOf);

const close = (actual: number, wanted: number, tolerance: number): boolean =>
  Math.abs(actual - wanted) <= tolerance * Math.max(1, Math.abs(wanted));

const agrees = (actual: unknown, wanted: Input, tolerance: number): boolean =>
  typeof actual === 'number' && typeof wanted === 'number'
    ? close(actual, wanted, tolerance)
    : actual === wanted;

const wantedGrid = (expected: Expected): readonly (readonly Input[])[] => {
  if (typeof expected !== 'object') {
    return [[expected]];
  }
  return 'rows' in expected ? expected.rows : [[expected.error]];
};

const computed = (entry: CorpusCase) => {
  const sheet = openSheet({ clock: () => new Date(2026, 9, 18, 12), random: () => 0.5 });
  const wanted = wantedGrid(entry.expected);

  const end = formatCell({
    row: RESULT.row + wanted.length - 1,
    col: RESULT.col + (wanted[0]?.length ?? 1) - 1,
  });

  Object.entries(entry.cells).forEach(([address, input]) => {
    sheet.enter(address, input);
  });

  sheet.enter(formatCell(RESULT), entry.formula);
  sheet.recalc();

  const actual = sheet.grid(`${formatCell(RESULT)}:${end}`);

  return wanted.map((row, rowIndex) =>
    row.map((item, col) => {
      const found = actual[rowIndex]?.[col];

      return found !== null && agrees(found, item, entry.tolerance) ? item : found;
    }),
  );
};

describe.each(corpora)('$family functions', (corpus) => {
  it.each(corpus.cases)('$formula', (entry) => {
    expect(computed(entry)).toEqual(wantedGrid(entry.expected));
  });
});

describe('function corpus', () => {
  it('covers every function the base registry knows', () => {
    const covered = corpora.flatMap((corpus) => corpus.functions).toSorted();
    const registered = [...createFunctionRegistry(BASE_FUNCTIONS).names].toSorted();

    expect(covered).toEqual(registered);
  });

  it('exercises every function its family lists', () => {
    const unused = corpora.flatMap((corpus) =>
      corpus.functions.filter(
        (name) => !corpus.cases.some((entry) => entry.formula.toUpperCase().includes(`${name}(`)),
      ),
    );

    expect(unused).toEqual([]);
  });
});
