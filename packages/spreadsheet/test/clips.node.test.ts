import { describe, expect, it } from 'vite-plus/test';
import { FillMode, createCellClips, parseRange, type CellRange } from '../src/core';
import { openBook } from './book-harness';

const rangeAt = (address: string): CellRange => {
  const range = parseRange(address);

  if (range === undefined) {
    throw new Error(`${address} is not a range`);
  }
  return range;
};

const openClips = () => {
  const harness = openBook();
  const clips = createCellClips(harness.book, harness.calculator);

  const run = (step: Parameters<typeof harness.commit>[0] | undefined): void => {
    if (step === undefined) {
      throw new Error('No step was built');
    }

    const outcome = harness.commit(step);

    if (!outcome.ok) {
      throw new Error(`The step was refused: ${outcome.reason}`);
    }
  };

  return {
    ...harness,
    copyPaste: (from: string, to: string, sheet = 'Sheet1') => {
      const clip = clips.copy(sheet, rangeAt(from));

      if (clip === undefined) {
        throw new Error(`${from} cannot be copied`);
      }

      const pasted = clips.paste(sheet, clip, rangeAt(to));

      run(pasted?.step);
      return pasted?.area;
    },
    cutPaste: (from: string, to: string) => {
      const clip = clips.copy('Sheet1', rangeAt(from));
      const target = rangeAt(to);

      if (clip === undefined) {
        throw new Error(`${from} cannot be copied`);
      }
      run(clips.move('Sheet1', clip, { row: target.top, col: target.left })?.step);
    },
    fill: (from: string, to: string, mode?: FillMode) => {
      run(clips.fill('Sheet1', rangeAt(from), rangeAt(to), mode));
    },
    clear: (...ranges: string[]) => {
      run(clips.clear('Sheet1', ranges.map(rangeAt)));
    },
    fillRefused: (from: string, to: string) => clips.fill('Sheet1', rangeAt(from), rangeAt(to)),
  };
};

describe('cell clips', () => {
  it('pastes formulas with their relative references shifted', () => {
    const sheet = openClips();

    sheet.type('A1', '2');
    sheet.type('A2', '5');
    sheet.type('B1', '=A1*10');
    sheet.copyPaste('B1', 'B2');

    expect(sheet.input('B2')).toBe('=A2*10');
    expect(sheet.shown('B2')).toBe('50');
  });

  it('keeps absolute references when a formula is pasted elsewhere', () => {
    const sheet = openClips();

    sheet.type('A1', '3');
    sheet.type('B1', '=$A$1+1');
    sheet.copyPaste('B1', 'D7');

    expect(sheet.input('D7')).toBe('=$A$1+1');
  });

  it('tiles a block over a target that is a multiple of it and clears empty source cells', () => {
    const sheet = openClips();

    sheet.type('A1', 'x');
    sheet.type('C1', 'old');
    sheet.type('C2', 'old');
    sheet.type('C3', 'old');
    sheet.type('C4', 'old');

    const area = sheet.copyPaste('A1:A2', 'C1:C4');

    expect(area).toEqual(rangeAt('C1:C4'));
    expect(['C1', 'C2', 'C3', 'C4'].map((cell) => sheet.shown(cell))).toEqual(['x', '', 'x', '']);
  });

  it('moves cut cells and keeps their formulas pointing at the same cells', () => {
    const sheet = openClips();

    sheet.type('A1', '4');
    sheet.type('B1', '=A1+1');
    sheet.cutPaste('B1', 'D5');

    expect(sheet.input('B1')).toBe('');
    expect(sheet.input('D5')).toBe('=A1+1');
    expect(sheet.shown('D5')).toBe('5');
  });

  it('undoes a paste in one step', () => {
    const sheet = openClips();

    sheet.type('A1', '1');
    sheet.type('B1', 'kept');
    sheet.copyPaste('A1', 'B1');
    sheet.history.undo();

    expect(sheet.shown('B1')).toBe('kept');
  });

  it('continues a linear number series down and up', () => {
    const sheet = openClips();

    sheet.type('A3', '1');
    sheet.type('A4', '3');
    sheet.fill('A3:A4', 'A3:A7');

    expect(['A5', 'A6', 'A7'].map((cell) => sheet.shown(cell))).toEqual(['5', '7', '9']);

    sheet.fill('A3:A4', 'A1:A4');

    expect(['A1', 'A2'].map((cell) => sheet.shown(cell))).toEqual(['-3', '-1']);
  });

  it('copies a single number and steps a single date by a day', () => {
    const sheet = openClips();

    sheet.type('A1', '7');
    sheet.type('B1', '2026-11-06');
    sheet.fill('A1:B1', 'A1:B3');

    expect(sheet.shown('A3')).toBe('7');
    expect(sheet.input('B3')).toBe('11/8/2026');
  });

  it('counts trailing numbers in text and keeps their width', () => {
    const sheet = openClips();

    sheet.type('A1', 'Q01');
    sheet.fill('A1', 'A1:D1');

    expect(['B1', 'C1', 'D1'].map((cell) => sheet.shown(cell))).toEqual(['Q02', 'Q03', 'Q04']);

    sheet.type('F2', '10');
    sheet.type('G2', '20');
    sheet.fill('F2:G2', 'D2:G2');

    expect(['D2', 'E2'].map((cell) => sheet.shown(cell))).toEqual(['-10', '0']);
  });

  it('repeats text and formulas and copies when asked to', () => {
    const sheet = openClips();

    sheet.type('A1', '1');
    sheet.type('A2', '2');
    sheet.type('A3', '3');
    sheet.type('B1', 'yes');
    sheet.type('B2', 'no');
    sheet.type('C1', '=A1*2');
    sheet.fill('B1:C2', 'B1:C3');
    sheet.fill('A1:A2', 'A1:A4', FillMode.Copy);

    expect(sheet.shown('B3')).toBe('yes');
    expect(sheet.input('C3')).toBe('=A3*2');
    expect(['A3', 'A4'].map((cell) => sheet.shown(cell))).toEqual(['1', '2']);
  });

  it('refuses a target that does not extend the source along one side', () => {
    const sheet = openClips();

    expect(sheet.fillRefused('B2:C3', 'A1:D4')).toBeUndefined();
  });

  it('clears contents and keeps formats', () => {
    const sheet = openClips();

    sheet.type('A1', '50%');
    sheet.type('A2', 'gone');
    sheet.clear('A1:A2');
    sheet.type('A1', '0.25');

    expect(sheet.shown('A1')).toBe('25%');
    expect(sheet.shown('A2')).toBe('');
  });
});
