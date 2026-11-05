import { describe, expect, it } from 'vite-plus/test';
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
          'nui-table__cell--clip': false,
        },
      ],
      style: { '--_fill': 'gold', '--_ink': 'black' },
      align: 'center',
      overflow: false,
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
      'nui-table__cell--clip': false,
    });
  });

  it('clips a text that may overflow without an ellipsis unless it wraps', () => {
    expect(paintOf({ overflow: true })?.class[1]).toMatchObject({ 'nui-table__cell--clip': true });

    expect(paintOf({ overflow: true, wrap: true })?.class[1]).toMatchObject({
      'nui-table__cell--clip': false,
    });
  });

  it('marks a cell whose text wraps', () => {
    expect(paintOf({ wrap: true })?.class[1]).toMatchObject({ 'nui-table__cell--wrap': true });
    expect(paintOf({ wrap: false })?.class[1]).toMatchObject({ 'nui-table__cell--wrap': false });
  });

  it('lets a text overflow only while it stays on one line', () => {
    expect(paintOf({ overflow: true })?.overflow).toBe(true);
    expect(paintOf({ overflow: true, wrap: true })?.overflow).toBe(false);
    expect(paintOf({ fill: 'gold' })?.overflow).toBe(false);
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
