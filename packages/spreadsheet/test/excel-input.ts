import { readFileSync } from 'node:fs';

export interface ExcelInputCase {
  readonly formula: string;
  readonly taken: boolean;
}

type Run = readonly number[];

const SOURCE = new URL('./corpus/excel-input.json', import.meta.url);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'number');

const isRuns = (value: unknown): value is Run[] =>
  Array.isArray(value) && value.every((item) => isNumbers(item) && item.length === 3);

const takes = (runs: readonly Run[], count: number): boolean =>
  runs.some(
    ([from = 0, to = 0, step = 1]) => count >= from && count <= to && (count - from) % step === 0,
  );

const call = (name: string, args: readonly string[]): string => `=${name}(${args.join(',')})`;

const arityCases = (name: string, entry: unknown): ExcelInputCase[] => {
  if (!isRecord(entry) || !isNumbers(entry.tried) || !isRuns(entry.taken)) {
    throw new Error(`the arity of ${name} is not readable`);
  }

  const [first = 0, last = 0] = entry.tried;
  const cases: ExcelInputCase[] = [];

  for (let count = first; count <= last; count += 1) {
    cases.push({
      formula: call(
        name,
        Array.from({ length: count }, () => 'A1'),
      ),
      taken: takes(entry.taken, count),
    });
  }
  return cases;
};

const referenceCases = (name: string, entry: unknown): ExcelInputCase[] => {
  if (!Array.isArray(entry)) {
    throw new Error(`the references of ${name} are not readable`);
  }

  const cases: ExcelInputCase[] = [];

  for (const tried of entry) {
    if (!Array.isArray(tried) || typeof tried[0] !== 'number' || !isNumbers(tried[1])) {
      throw new Error(`the references of ${name} are not readable`);
    }

    const [count, refused] = tried;

    for (let array = 0; array <= count; array += 1) {
      const args = Array.from({ length: count }, (_, index) =>
        index + 1 === array ? '{1,2}' : 'A1:A2',
      );

      cases.push({ formula: call(name, args), taken: !refused.includes(array) });
    }
  }
  return cases;
};

const formulaCase = (entry: unknown): ExcelInputCase => {
  if (!Array.isArray(entry) || typeof entry[0] !== 'string' || typeof entry[1] !== 'boolean') {
    throw new Error('a formula verdict is not readable');
  }
  return { formula: entry[0], taken: entry[1] };
};

export const excelInputCases = (): ExcelInputCase[] => {
  const data: unknown = JSON.parse(readFileSync(SOURCE, 'utf8'));

  if (
    !isRecord(data) ||
    !isRecord(data.arity) ||
    !isRecord(data.references) ||
    !Array.isArray(data.formulas)
  ) {
    throw new Error('excel-input.json is not readable');
  }

  const cases: ExcelInputCase[] = [];

  for (const [name, entry] of Object.entries(data.arity)) {
    for (const item of arityCases(name, entry)) {
      cases.push(item);
    }
  }
  for (const [name, entry] of Object.entries(data.references)) {
    for (const item of referenceCases(name, entry)) {
      cases.push(item);
    }
  }
  for (const entry of data.formulas) {
    cases.push(formulaCase(entry));
  }
  return cases;
};
