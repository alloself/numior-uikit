import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import { bandScale, linearScale, logDomain, niceDomain, niceStep, timeTicks } from '../src/core';

const utc = (text: string): number => Date.parse(`${text}Z`);

const iso = (values: readonly number[]): string[] =>
  values.map((value) => new Date(value).toISOString().slice(0, 16));

const value = fc
  .double({ min: -1e6, max: 1e6, noNaN: true })
  .map((number) => (Math.abs(number) < 1e-100 ? 0 : number));

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

  it('puts ticks on whole steps inside bounds set by hand', () => {
    expect(niceDomain(5, 10, { min: 3, max: 17 })).toMatchObject({ min: 3, max: 17 });
    expect(niceDomain(5, 10, { min: 3, max: 17 }).ticks).toEqual([5, 10, 15]);
    expect(niceDomain(50, 90, { max: 95 }).ticks).toEqual([0, 20, 40, 60, 80]);
    expect(niceDomain(5, 12, { min: -3, max: 17 }).ticks).toEqual([0, 5, 10, 15]);
    expect(niceDomain(12, 47, { min: 12 }).ticks).toEqual([20, 30, 40, 50]);
  });

  it('covers every value with ticks on whole steps', () => {
    fc.assert(
      fc.property(value, value, (left, right) => {
        const domain = niceDomain(left, right);

        const slack = domain.step * 1e-6;

        expect(domain.min).toBeLessThanOrEqual(Math.min(left, right) + slack);
        expect(domain.max).toBeGreaterThanOrEqual(Math.max(left, right) - slack);
        expect(domain.ticks.length).toBeLessThanOrEqual(12);
        expect(domain.ticks.at(0)).toBe(domain.min);
      }),
    );
  });

  it('spans powers of ten on a log axis', () => {
    expect(logDomain(3, 4200).ticks).toEqual([1, 10, 100, 1000, 10_000]);
  });

  it('keeps a log axis on positive powers of ten whatever bounds it is given', () => {
    expect(logDomain(0, 100).ticks).toEqual([10, 100]);
    expect(logDomain(-5, 0).ticks).toEqual([0.1, 1]);
    expect(logDomain(5, 5).ticks).toEqual([1, 10]);
    expect(logDomain(Number.NaN, Number.POSITIVE_INFINITY).ticks).toEqual([0.1, 1]);
  });

  it('thins the ticks of a long log axis to the asked count', () => {
    expect(logDomain(1e-3, 1e9, 4).ticks).toEqual([0.001, 1, 1000, 1e6, 1e9]);
    expect(logDomain(1, 1e13, 5)).toMatchObject({ min: 1, max: 1e13 });
    expect(logDomain(1, 1e13, 5).ticks).toEqual([1, 1000, 1e6, 1e9, 1e12]);
    expect(logDomain(1e-300, 1e300, 5).ticks.length).toBeLessThanOrEqual(6);
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

  it('places time ticks on the calendar of a time zone', () => {
    expect(
      iso(timeTicks(utc('2026-01-15T00:00'), utc('2026-06-20T00:00'), 6, 'Europe/Moscow').values),
    ).toEqual([
      '2026-01-31T21:00',
      '2026-02-28T21:00',
      '2026-03-31T21:00',
      '2026-04-30T21:00',
      '2026-05-31T21:00',
    ]);

    expect(
      iso(timeTicks(utc('2026-03-02T00:00'), utc('2026-03-02T12:00'), 6, 'Asia/Kolkata').values),
    ).toEqual(['2026-03-02T00:30', '2026-03-02T03:30', '2026-03-02T06:30', '2026-03-02T09:30']);
  });

  it('keeps time ticks on local midnights and hours when the clocks change', () => {
    expect(
      iso(
        timeTicks(utc('2026-03-05T05:00'), utc('2026-03-11T04:00'), 7, 'America/New_York').values,
      ),
    ).toEqual([
      '2026-03-05T05:00',
      '2026-03-06T05:00',
      '2026-03-07T05:00',
      '2026-03-08T05:00',
      '2026-03-09T04:00',
      '2026-03-10T04:00',
      '2026-03-11T04:00',
    ]);

    expect(
      iso(
        timeTicks(utc('2026-03-08T05:00'), utc('2026-03-08T10:00'), 6, 'America/New_York').values,
      ),
    ).toEqual([
      '2026-03-08T05:00',
      '2026-03-08T06:00',
      '2026-03-08T07:00',
      '2026-03-08T08:00',
      '2026-03-08T09:00',
      '2026-03-08T10:00',
    ]);

    expect(
      iso(
        timeTicks(utc('2026-11-01T04:00'), utc('2026-11-01T09:00'), 6, 'America/New_York').values,
      ),
    ).toEqual([
      '2026-11-01T04:00',
      '2026-11-01T05:00',
      '2026-11-01T07:00',
      '2026-11-01T08:00',
      '2026-11-01T09:00',
    ]);

    expect(
      iso(timeTicks(utc('2026-10-24T22:00'), utc('2026-10-25T03:00'), 6, 'Europe/Berlin').values),
    ).toEqual([
      '2026-10-24T22:00',
      '2026-10-24T23:00',
      '2026-10-25T00:00',
      '2026-10-25T02:00',
      '2026-10-25T03:00',
    ]);

    expect(
      iso(
        timeTicks(utc('2026-09-04T04:00'), utc('2026-09-08T03:00'), 6, 'America/Santiago').values,
      ),
    ).toEqual([
      '2026-09-04T04:00',
      '2026-09-05T04:00',
      '2026-09-06T04:00',
      '2026-09-07T03:00',
      '2026-09-08T03:00',
    ]);
  });
});
