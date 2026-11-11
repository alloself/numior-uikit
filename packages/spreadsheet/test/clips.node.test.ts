import { describe, expect, it } from 'vite-plus/test';
import { FillMode, createCellClips, formatRange, parseRange, type CellRange } from '../src/core';
import { openBook } from './book-harness';

type Clips = ReturnType<typeof openClips>;

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
    cutPaste: (from: string, to: string, sheet = 'Sheet1') => {
      const clip = clips.copy('Sheet1', rangeAt(from));
      const target = rangeAt(to);

      if (clip === undefined) {
        throw new Error(`${from} cannot be copied`);
      }
      run(clips.move(sheet, clip, { row: target.top, col: target.left })?.step);
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

const mergeAt = (sheet: Clips, ...addresses: string[]): void => {
  sheet.first.layout = { ...sheet.first.layout, merges: addresses.map(rangeAt) };
};

const mergesOf = (sheet: Clips): string[] =>
  sheet.first.layout.merges.map((merge) => formatRange(merge)).toSorted();

const block = (sheet: Clips, corner: string): void => {
  const { top, left } = rangeAt(corner);

  ['1', '2', '3', '4'].forEach((text, at) => {
    sheet.type(
      formatRange({
        top: top + Math.floor(at / 2),
        left: left + (at % 2),
        bottom: top + Math.floor(at / 2),
        right: left + (at % 2),
      }),
      text,
    );
  });
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

  it('moves a cut block with the references between its own cells', () => {
    const sheet = openClips();

    sheet.type('A1', '2');
    sheet.type('A2', '5');
    sheet.type('B2', '=A2*10+$A$1');
    sheet.type('C2', '=SUM(A2:B2)');
    sheet.cutPaste('A2:C2', 'D7');

    expect(sheet.input('E7')).toBe('=D7*10+$A$1');
    expect(sheet.input('F7')).toBe('=SUM(D7:E7)');
    expect(sheet.shown('F7')).toBe('57');
    expect(['A2', 'B2', 'C2'].map((cell) => sheet.input(cell))).toEqual(['', '', '']);
  });

  it('points the formulas of the book at the place a cut block has moved to', () => {
    const sheet = openClips();

    sheet.type('A1', '4');
    sheet.type('A2', '6');
    sheet.type('C1', '=A1+$A$2');
    sheet.type('C2', '=SUM(A1:A2)');
    sheet.type('C3', '=SUM(A1:A5)');
    sheet.type('C4', '=SUM(A:A)');
    sheet.type('B1', '=Sheet1!A2', 'Rates');
    sheet.cutPaste('A1:A2', 'D5');

    expect(['C1', 'C2', 'C3', 'C4'].map((cell) => sheet.input(cell))).toEqual([
      '=D5+$D$6',
      '=SUM(D5:D6)',
      '=SUM(A1:A5)',
      '=SUM(A:A)',
    ]);

    expect(sheet.input('B1', 'Rates')).toBe('=Sheet1!D6');
    expect(['C1', 'C2', 'C3'].map((cell) => sheet.shown(cell))).toEqual(['10', '10', '0']);

    sheet.history.undo();

    expect(['C1', 'C2'].map((cell) => sheet.input(cell))).toEqual(['=A1+$A$2', '=SUM(A1:A2)']);
    expect(sheet.input('B1', 'Rates')).toBe('=Sheet1!A2');
    expect(sheet.shown('C2')).toBe('10');
  });

  it('keeps the references of a block cut to another sheet on the cells they named', () => {
    const sheet = openClips();

    sheet.type('A1', '4');
    sheet.type('B1', '=A1+1');
    sheet.type('B2', '=B1*2');
    sheet.type('C1', '=B1+B2');
    sheet.cutPaste('B1:B2', 'A1', 'Rates');

    expect(sheet.input('A1', 'Rates')).toBe('=Sheet1!A1+1');
    expect(sheet.input('A2', 'Rates')).toBe('=A1*2');
    expect(sheet.input('C1')).toBe('=Rates!A1+Rates!A2');
    expect(sheet.shown('C1')).toBe('15');
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

  it('takes merged cells apart when a block is pasted over them and merges them back on undo', () => {
    const sheet = openClips();

    mergeAt(sheet, 'A1:B2');
    sheet.type('A1', 'old');
    sheet.type('G1', '=SUM(A1:B2)');
    block(sheet, 'D1');
    sheet.copyPaste('D1:E2', 'A1:B2');

    expect(mergesOf(sheet)).toEqual([]);
    expect(['A1', 'B1', 'A2', 'B2'].map((cell) => sheet.shown(cell))).toEqual(['1', '2', '3', '4']);
    expect(sheet.shown('G1')).toBe('10');

    sheet.history.undo();

    expect(mergesOf(sheet)).toEqual(['A1:B2']);
    expect(['A1', 'B1', 'A2', 'B2'].map((cell) => sheet.shown(cell))).toEqual(['old', '', '', '']);
  });

  it('takes apart a merge that a pasted block covers only in part', () => {
    const sheet = openClips();

    mergeAt(sheet, 'A2:B3');
    block(sheet, 'D1');
    sheet.copyPaste('D1:E2', 'B1');

    expect(mergesOf(sheet)).toEqual([]);
    expect(['B1', 'C1', 'B2', 'C2'].map((cell) => sheet.shown(cell))).toEqual(['1', '2', '3', '4']);
  });

  it('writes one copied cell into the first cell of every merge under it and keeps them merged', () => {
    const sheet = openClips();

    mergeAt(sheet, 'A1:B2', 'A3:B4');
    sheet.type('D1', '7');
    sheet.type('G1', '=SUM(A1:B5)');
    sheet.copyPaste('D1', 'A1:B5');

    expect(mergesOf(sheet)).toEqual(['A1:B2', 'A3:B4']);

    expect(['A1', 'B1', 'A2', 'A3', 'B4', 'A5', 'B5'].map((cell) => sheet.shown(cell))).toEqual([
      '7',
      '',
      '',
      '7',
      '',
      '7',
      '7',
    ]);

    expect(sheet.shown('G1')).toBe('28');
  });

  it('carries merged cells along with a copied and with a cut block', () => {
    const sheet = openClips();

    mergeAt(sheet, 'A1:B1');
    sheet.type('A1', 'wide');
    sheet.type('A2', 'x');
    sheet.copyPaste('A1:B2', 'D5');

    expect(mergesOf(sheet)).toEqual(['A1:B1', 'D5:E5']);

    sheet.cutPaste('A1:B2', 'G1');

    expect(mergesOf(sheet)).toEqual(['D5:E5', 'G1:H1']);
    expect([sheet.shown('G1'), sheet.shown('G2'), sheet.shown('A1')]).toEqual(['wide', 'x', '']);

    sheet.copyPaste('G1:H1', 'A7:B8');

    expect(mergesOf(sheet)).toEqual(['A7:B7', 'A8:B8', 'D5:E5', 'G1:H1']);
  });

  it('refuses to fill over merged cells', () => {
    const sheet = openClips();

    mergeAt(sheet, 'A2:A3');
    sheet.type('A1', '5');

    expect(sheet.fillRefused('A1', 'A1:A4')).toBeUndefined();
    expect(sheet.shown('A3')).toBe('');
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
