import { describe, expect, it } from 'vite-plus/test';
import { createLineIndex } from '../src/sheet/line-index';

const TOTAL = 1_048_576;
const BLOCK = 500_000;
const SCREEN = 60;
const BUDGET_MS = 20;

const shownOf = (total: number, hidden: readonly number[]): number[] => {
  const gone = new Set(hidden);

  return Array.from({ length: total }, (_, line) => line).reduce<number[]>((shown, line) => {
    if (!gone.has(line)) {
      shown.push(line);
    }
    return shown;
  }, []);
};

describe('line index of a sheet', () => {
  it.each([
    ['nothing hidden', []],
    ['the first lines', [0, 1, 2]],
    ['the last lines', [17, 18, 19]],
    ['scattered lines and blocks', [1, 4, 5, 6, 9, 13, 14, 19]],
    ['lines named twice and outside the sheet', [3, 3, -1, 20, 7]],
  ])('maps positions to lines and back with %s', (_, hidden) => {
    const index = createLineIndex(20, hidden);
    const shown = shownOf(20, hidden);

    expect(index.count).toBe(shown.length);
    expect(shown.map((__, position) => index.lineAt(position))).toEqual(shown);
    expect(shown.map((line) => index.positionOf(line))).toEqual(shown.map((__, at) => at));
  });

  it('answers nothing for the position of a hidden line and the nearest shown one beside it', () => {
    const index = createLineIndex(10, [3, 4, 9]);

    expect(index.positionOf(4)).toBeUndefined();
    expect(index.positionNear(4)).toBe(3);
    expect(index.positionNear(9)).toBe(6);
  });

  it('finds the lines of a screen below half a million hidden rows within the budget', () => {
    const hidden = Array.from({ length: BLOCK }, (_, at) => at + 10);
    const index = createLineIndex(TOTAL, hidden);
    const started = performance.now();

    const lines = Array.from({ length: SCREEN }, (_, at) => index.lineAt(at));

    const spent = performance.now() - started;

    expect(lines.slice(0, 12)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, BLOCK + 10, BLOCK + 11]);
    expect(spent).toBeLessThan(BUDGET_MS);
  });
});
