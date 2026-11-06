import { describe, expect, it } from 'vite-plus/test';
import {
  MAX_COLS,
  MAX_ROWS,
  RU_FORMULAS,
  referenceSpans,
  toggleAnchors,
  type ReferenceSpan,
} from '../src/core';

const texts = (text: string, spans: readonly ReferenceSpan[]): string[] =>
  spans.map((span) => text.slice(span.start, span.end));

const toggledTimes = (text: string, times: number): string[] =>
  Array.from({ length: times }).reduce<string[]>((seen) => {
    const current = seen.at(-1) ?? text;
    const [span] = referenceSpans(current);

    return span === undefined ? seen : [...seen, toggleAnchors(current, span).text];
  }, []);

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
});
