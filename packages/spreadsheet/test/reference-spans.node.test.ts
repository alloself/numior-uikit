import { describe, expect, it } from 'vite-plus/test';
import {
  LineAxis,
  MAX_COLS,
  MAX_ROWS,
  RU_FORMULAS,
  followLines,
  referenceSpans,
  retarget,
  shiftOffset,
  toggleAnchors,
  type CellRange,
  type FormulaLocale,
  type LineChange,
  type ReferenceSpan,
} from '../src/core';

const texts = (text: string, spans: readonly ReferenceSpan[]): string[] =>
  spans.map((span) => text.slice(span.start, span.end));

const retargeted = (text: string, index: number, range: CellRange): string => {
  const span = referenceSpans(text)[index];

  return span === undefined ? text : retarget(text, span, range).text;
};

const toggledTimes = (text: string, times: number): string[] =>
  Array.from({ length: times }).reduce<string[]>((seen) => {
    const current = seen.at(-1) ?? text;
    const [span] = referenceSpans(current);

    return span === undefined ? seen : [...seen, toggleAnchors(current, span).text];
  }, []);

const rows = (at: number, count: number, sheet = 'Plan'): LineChange => ({
  sheet,
  axis: LineAxis.Rows,
  at,
  count,
});

const cols = (at: number, count: number, sheet = 'Plan'): LineChange => ({
  sheet,
  axis: LineAxis.Cols,
  at,
  count,
});

const followed = (
  text: string,
  changes: readonly LineChange[],
  locale?: FormulaLocale,
): string | undefined => followLines(text, changes, 'Plan', locale)?.text;

describe('reference spans', () => {
  it('finds cells, ranges, whole lines and sheet references with their place in the text', () => {
    const text = "=SUM(A1:B2)+Sales!$C$3*'My sheet'!D4+SUM(B:C;3:5)";
    const spans = referenceSpans(text);

    expect(texts(text, spans)).toEqual(['A1:B2', 'Sales!$C$3', "'My sheet'!D4", 'B:C', '3:5']);
    expect(spans[0]?.range).toEqual({ top: 0, left: 0, bottom: 1, right: 1 });
    expect(spans[1]).toMatchObject({ sheet: 'Sales', external: false });
    expect(text.slice(spans[1]?.address, spans[1]?.end)).toBe('$C$3');
    expect(spans[3]?.range).toEqual({ top: 0, left: 1, bottom: MAX_ROWS - 1, right: 2 });
    expect(spans[4]?.range).toEqual({ top: 2, left: 0, bottom: 4, right: MAX_COLS - 1 });
  });

  it('reads an unfinished formula and skips function names, strings and plain values', () => {
    expect(texts('=A1:', referenceSpans('=A1:'))).toEqual(['A1']);
    expect(referenceSpans('=LOG10(2)+"B2"&TRUE')).toEqual([]);
    expect(referenceSpans('B2')).toEqual([]);
    expect(referenceSpans('="B2')).toEqual([]);
    expect(texts('=[1]Rates!A1', referenceSpans('=[1]Rates!A1'))).toEqual(['[1]Rates!A1']);
    expect(referenceSpans('=[1]Rates!A1')[0]?.external).toBe(true);
  });

  it('reads references in a localized formula', () => {
    const text = '=СУММ(B3:B7;Лист2!C1)';

    expect(texts(text, referenceSpans(text, RU_FORMULAS))).toEqual(['B3:B7', 'Лист2!C1']);
  });

  it('cycles the anchors of a reference like F4 in Excel', () => {
    expect(toggledTimes('=A1+1', 4)).toEqual(['=$A$1+1', '=A$1+1', '=$A1+1', '=A1+1']);
    expect(toggledTimes('=Sales!B2:C3', 2)).toEqual(['=Sales!$B$2:$C$3', '=Sales!B$2:C$3']);
    expect(toggledTimes('=SUM(B:C)', 2)).toEqual(['=SUM($B:$C)', '=SUM(B:C)']);
    expect(toggledTimes('=SUM(3:5)', 2)).toEqual(['=SUM($3:$5)', '=SUM(3:5)']);

    const text = '=A1+B2';
    const second = referenceSpans(text)[1];

    expect(second === undefined ? undefined : toggleAnchors(text, second)).toEqual({
      text: '=A1+$B$2',
      end: 8,
    });
  });

  it('moves and resizes a reference keeping its sheet and its anchors', () => {
    const block = { top: 2, left: 2, bottom: 3, right: 4 };

    expect(retargeted('=SUM(A1:B2)+1', 0, block)).toBe('=SUM(C3:E4)+1');
    expect(retargeted('=$A$1*2', 0, { top: 4, left: 1, bottom: 4, right: 1 })).toBe('=$B$5*2');
    expect(retargeted('=A1', 0, { top: 0, left: 0, bottom: 2, right: 1 })).toBe('=A1:B3');
    expect(retargeted('=$A1:B$2', 0, { top: 0, left: 0, bottom: 0, right: 0 })).toBe('=$A1');
    expect(retargeted("='My sheet'!A1+1", 0, block)).toBe("='My sheet'!C3:E4+1");

    expect(retargeted('=SUM($A:A)', 0, { ...block, top: 0, bottom: MAX_ROWS - 1 })).toBe(
      '=SUM($C:E)',
    );

    expect(retargeted('=SUM(1:2)', 0, { top: 5, left: 0, bottom: 6, right: MAX_COLS - 1 })).toBe(
      '=SUM(6:7)',
    );
  });
});

describe('a formula being typed while lines move', () => {
  it('moves its references with the rows added or removed above them, anchored or not', () => {
    expect(followed('=SUM(A1:A10)+B12', [rows(4, 1)])).toBe('=SUM(A1:A11)+B13');
    expect(followed('=$C$5*2+$A5:B$6', [rows(0, 2)])).toBe('=$C$7*2+$A7:B$8');
    expect(followed('=A10+A3', [rows(4, -2)])).toBe('=A8+A3');
    expect(followed('=C1+D2', [cols(0, 1), rows(0, 1)])).toBe('=D2+E3');
  });

  it('breaks a reference whose cells are gone and narrows a range that lost a part', () => {
    expect(followed('=A5+SUM(A4:A6)', [rows(4, -1)])).toBe('=#REF!+SUM(A4:A5)');
    expect(followed('=Plan!A5*2', [rows(4, -1)])).toBe('=Plan!#REF!*2');
    expect(followed(`=A${String(MAX_ROWS)}`, [rows(0, 1)])).toBe('=#REF!');
  });

  it('moves only the references to the sheet whose lines moved', () => {
    expect(followed('=Plan!A5+Other!A5+A5+plan!B1', [rows(0, 1)])).toBe(
      '=Plan!A6+Other!A5+A6+plan!B2',
    );

    expect(followed('=Plan!A5+Other!A5+A5', [rows(0, 1, 'Other')])).toBe('=Plan!A5+Other!A6+A5');
    expect(followed('=[1]Plan!A5', [rows(0, 1)])).toBeUndefined();
  });

  it('moves whole columns and rows only across their own axis', () => {
    expect(followed('=SUM(A:A)+SUM(3:4)', [rows(0, 1)])).toBe('=SUM(A:A)+SUM(4:5)');
    expect(followed('=SUM(A:A)+SUM(3:4)', [cols(0, 1)])).toBe('=SUM(B:B)+SUM(3:4)');
    expect(followed('=SUM(A:B)', [rows(0, 1)])).toBeUndefined();
    expect(followed('=SUM(3:4)', [cols(0, 1)])).toBeUndefined();
  });

  it('reads an unfinished or localized formula and leaves strings and untouched text alone', () => {
    expect(followed('=SUM(A5:', [rows(0, 1)])).toBe('=SUM(A6:');
    expect(followed('=A5&"A5"', [rows(0, 1)])).toBe('=A6&"A5"');

    expect(followed('=СУММ(B3:B7;Лист2!C1)', [rows(0, 1)], RU_FORMULAS)).toBe(
      '=СУММ(B4:B8;Лист2!C1)',
    );

    expect(followed('=A1+B2', [rows(10, 1)])).toBeUndefined();
    expect(followed('A5', [rows(0, 1)])).toBeUndefined();
  });

  it('carries a place in the text across the references it rewrote', () => {
    const shift = followLines('=A9+B1', [rows(0, 1)], 'Plan');

    expect(shift?.text).toBe('=A10+B2');

    const places = [0, 1, 2, 3, 4, 5, 6].map((at) =>
      shift === undefined ? at : shiftOffset(shift, at),
    );

    expect(places).toEqual([0, 1, 2, 4, 5, 6, 7]);
  });
});
