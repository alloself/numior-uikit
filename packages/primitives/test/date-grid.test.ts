import { describe, expect, it } from 'vite-plus/test';
import {
  cellMoveFor,
  cellTargetIndex,
  gridMoveFor,
  gridTargetDate,
  monthGrid,
  weekNumberOfRow,
} from '../src';

describe('month grid', () => {
  it('lays out a month from the week start with outside days and optional fixed weeks', () => {
    const monday = monthGrid({ month: '2026-09', weekStart: 1, fixedWeeks: false });

    expect(monday).toHaveLength(5);
    expect(monday[0]?.[0]).toBe('2026-08-31');
    expect(monday[4]?.[6]).toBe('2026-10-04');

    const sunday = monthGrid({ month: '2026-09', weekStart: 7, fixedWeeks: false });

    expect(sunday[0]?.[0]).toBe('2026-08-30');

    const saturday = monthGrid({ month: '2026-09', weekStart: 6, fixedWeeks: false });

    expect(saturday[0]?.[0]).toBe('2026-08-29');

    const february = monthGrid({ month: '2027-02', weekStart: 1, fixedWeeks: false });

    expect(february).toHaveLength(4);
    expect(february[0]?.[0]).toBe('2027-02-01');

    const fixed = monthGrid({ month: '2027-02', weekStart: 1, fixedWeeks: true });

    expect(fixed).toHaveLength(6);
    expect(fixed[5]?.[6]).toBe('2027-03-14');
  });

  it('numbers rows by the ISO week of their Thursday', () => {
    const rows = monthGrid({ month: '2027-01', weekStart: 1, fixedWeeks: false });

    expect(rows.map(weekNumberOfRow)).toEqual([53, 1, 2, 3, 4]);

    const sundayRows = monthGrid({ month: '2027-01', weekStart: 7, fixedWeeks: false });

    expect(sundayRows.map(weekNumberOfRow)).toEqual([53, 1, 2, 3, 4, 5]);
  });
});

describe('grid moves', () => {
  it('maps keys to day moves with RTL-aware horizontal arrows and Shift for years', () => {
    expect(gridMoveFor('ArrowLeft', false, false)).toBe('prev-day');
    expect(gridMoveFor('ArrowLeft', false, true)).toBe('next-day');
    expect(gridMoveFor('ArrowRight', false, true)).toBe('prev-day');
    expect(gridMoveFor('ArrowUp', false, false)).toBe('prev-week');
    expect(gridMoveFor('ArrowDown', false, false)).toBe('next-week');
    expect(gridMoveFor('Home', false, false)).toBe('week-start');
    expect(gridMoveFor('End', false, false)).toBe('week-end');
    expect(gridMoveFor('PageUp', false, false)).toBe('prev-month');
    expect(gridMoveFor('PageDown', true, false)).toBe('next-year');
    expect(gridMoveFor('Enter', false, false)).toBeUndefined();
  });

  it('resolves target dates for every move', () => {
    expect(gridTargetDate('prev-day', '2026-03-01', 1)).toBe('2026-02-28');
    expect(gridTargetDate('next-day', '2026-12-31', 1)).toBe('2027-01-01');
    expect(gridTargetDate('prev-week', '2026-09-24', 1)).toBe('2026-09-17');
    expect(gridTargetDate('next-week', '2026-09-24', 1)).toBe('2026-10-01');
    expect(gridTargetDate('week-start', '2026-09-24', 7)).toBe('2026-09-20');
    expect(gridTargetDate('week-end', '2026-09-24', 1)).toBe('2026-09-27');
    expect(gridTargetDate('prev-month', '2026-03-31', 1)).toBe('2026-02-28');
    expect(gridTargetDate('next-month', '2026-01-31', 1)).toBe('2026-02-28');
    expect(gridTargetDate('prev-year', '2024-02-29', 1)).toBe('2023-02-28');
    expect(gridTargetDate('next-year', '2026-09-24', 1)).toBe('2027-09-24');
  });

  it('moves through a 3-by-4 picker grid and clamps at the edges', () => {
    expect(cellMoveFor('ArrowRight', false)).toBe('next');
    expect(cellMoveFor('ArrowRight', true)).toBe('prev');
    expect(cellMoveFor('ArrowDown', false)).toBe('down');
    expect(cellMoveFor('Tab', false)).toBeUndefined();
    expect(cellTargetIndex('next', 4, 12, 3)).toBe(5);
    expect(cellTargetIndex('prev', 0, 12, 3)).toBe(0);
    expect(cellTargetIndex('down', 10, 12, 3)).toBe(11);
    expect(cellTargetIndex('up', 1, 12, 3)).toBe(0);
    expect(cellTargetIndex('first', 7, 12, 3)).toBe(0);
    expect(cellTargetIndex('last', 7, 12, 3)).toBe(11);
    expect(cellTargetIndex('page-next', 0, 12, 3)).toBe(11);
  });
});
