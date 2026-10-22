import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import { bandScale, linearScale, logDomain, niceDomain, niceStep, timeTicks } from '../src/core';

const utc = (text: string): number => Date.parse(`${text}Z`);

const iso = (values: readonly number[]): string[] =>
  values.map((value) => new Date(value).toISOString().slice(0, 16));

describe('chart scales', () => {
  it('rounds steps to 1, 2, 2.5 and 5 times a power of ten', () => {
    expect([niceStep(100, 5), niceStep(7, 5), niceStep(0.9, 4), niceStep(42_000, 6)]).toEqual([
      20, 2, 0.25, 10_000,
    ]);
  });

  it('starts magnitudes at zero the way Excel does and keeps tight ranges off zero', () => {
    expect(niceDomain(3, 97).ticks).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceDomain(90, 97)).toMatchObject({ min: 90, max: 98, step: 2 });
    expect(niceDomain(90, 97, { zero: true }).min).toBe(0);
    expect(niceDomain(-12, 30).ticks).toEqual([-20, -10, 0, 10, 20, 30]);
    expect(niceDomain(0.1, 0.3).ticks).toEqual([0, 0.1, 0.2, 0.3]);
    expect(niceDomain(0.11, 0.13).ticks).toEqual([0.11, 0.115, 0.12, 0.125, 0.13]);
    expect(niceDomain(5, 5, { zero: true })).toMatchObject({ min: 0, max: 5 });
    expect(niceDomain(0, 0).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(niceDomain(3, 97, { min: 10, max: 50 })).toMatchObject({ min: 10, max: 50, step: 10 });
  });

  it('covers every value with ticks on whole steps', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        (left, right) => {
          const domain = niceDomain(left, right);

          const slack = domain.step * 1e-6;

          expect(domain.min).toBeLessThanOrEqual(Math.min(left, right) + slack);
          expect(domain.max).toBeGreaterThanOrEqual(Math.max(left, right) - slack);
          expect(domain.ticks.length).toBeLessThanOrEqual(12);
          expect(domain.ticks.at(0)).toBe(domain.min);
        },
      ),
    );
  });

  it('spans powers of ten on a log axis', () => {
    expect(logDomain(3, 4200).ticks).toEqual([1, 10, 100, 1000, 10_000]);
  });

  it('maps values and lays out bands in either direction', () => {
    const toPixels = linearScale([0, 100], [200, 0]);
    const forward = bandScale(4, [0, 400]);
    const backward = bandScale(4, [400, 0]);

    expect([toPixels(0), toPixels(25), toPixels(100)]).toEqual([200, 150, 0]);
    expect(forward.step).toBeCloseTo(400 / 4);
    expect(forward.start(0) + forward.width / 2 + backward.center(0)).toBeCloseTo(400);
    expect(forward.center(3)).toBeCloseTo(400 - backward.center(3));
  });

  it('places time ticks on calendar boundaries', () => {
    expect(timeTicks(utc('2026-01-15T00:00'), utc('2026-06-20T00:00'))).toMatchObject({
      unit: 'month',
      step: 1,
    });

    expect(iso(timeTicks(utc('2026-01-15T00:00'), utc('2026-06-20T00:00')).values)).toEqual([
      '2026-02-01T00:00',
      '2026-03-01T00:00',
      '2026-04-01T00:00',
      '2026-05-01T00:00',
      '2026-06-01T00:00',
    ]);

    expect(timeTicks(utc('2026-03-02T09:10'), utc('2026-03-02T21:00')).unit).toBe('hour');
    expect(timeTicks(utc('2001-01-01T00:00'), utc('2026-01-01T00:00')).step).toBe(5);

    expect(iso(timeTicks(utc('2026-10-14T00:00'), utc('2026-11-20T00:00')).values)[0]).toBe(
      '2026-10-19T00:00',
    );
  });
});
