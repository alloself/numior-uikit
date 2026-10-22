import { describe, expect, it } from 'vite-plus/test';
import {
  BASE_FUNCTIONS,
  EN_LOCALE,
  RU_LOCALE,
  createFunctionRegistry,
  formatCell,
} from '../src/core';
import { RESULT, agrees, functionCorpora, wantedGrid, type CorpusCase } from './function-corpus';
import { openSheet } from './sheet-harness';

const corpora = functionCorpora();

const computed = (entry: CorpusCase) => {
  const sheet = openSheet({
    clock: () => new Date(2026, 9, 18, 12),
    random: () => 0.5,
    locale: entry.locale === 'ru' ? RU_LOCALE : EN_LOCALE,
  });

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
