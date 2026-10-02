import { describe, expect, it } from 'vitest';
import { paintOf } from '../src/table/table-paint';

describe('table cell paint', () => {
  it('leaves a cell without a style unpainted', () => {
    expect(paintOf(undefined)).toBeUndefined();
  });

  it('turns a fill, a text colour and an alignment into marks and private properties', () => {
    expect(paintOf({ fill: 'gold', color: 'black', align: 'center' })).toEqual({
      class: [
        undefined,
        {
          'nui-table__cell--filled': true,
          'nui-table__cell--inked': true,
          'nui-table__cell--edged': false,
          'nui-table__cell--wrap': false,
        },
      ],
      style: { '--_fill': 'gold', '--_ink': 'black' },
      align: 'center',
    });
  });

  it('keeps only the named borders and marks the cell as edged', () => {
    const paint = paintOf({ borders: { top: '2px solid red', start: '1px dashed blue' } });

    expect(paint?.style).toEqual({
      '--_edge-top': '2px solid red',
      '--_edge-start': '1px dashed blue',
    });

    expect(paint?.class[1]).toEqual({
      'nui-table__cell--filled': false,
      'nui-table__cell--inked': false,
      'nui-table__cell--edged': true,
      'nui-table__cell--wrap': false,
    });
  });

  it('marks a cell whose text wraps', () => {
    expect(paintOf({ wrap: true })?.class[1]).toMatchObject({ 'nui-table__cell--wrap': true });
    expect(paintOf({ wrap: false })?.class[1]).toMatchObject({ 'nui-table__cell--wrap': false });
  });

  it('passes the class and the plain styles through and lets its own properties win', () => {
    const paint = paintOf({
      class: 'app-total',
      fill: 'gold',
      style: { 'font-weight': '700', '--_fill': 'ignored' },
    });

    expect(paint?.class[0]).toBe('app-total');
    expect(paint?.style).toEqual({ 'font-weight': '700', '--_fill': 'gold' });
    expect(paint?.align).toBeUndefined();
  });
});
