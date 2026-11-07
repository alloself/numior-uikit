import { describe, expect, it } from 'vite-plus/test';
import { adaptiveInk } from '../src/sheet/sheet-ink';

const darkHalf = (css: string): string => /, (oklch\(.*\))\)$/u.exec(adaptiveInk(css))?.[1] ?? '';

const partsOf = (oklch: string): number[] =>
  oklch
    .slice('oklch('.length, -1)
    .split(' ')
    .map((part) => Number.parseFloat(part));

const lightnessOf = (oklch: string): number => partsOf(oklch)[0] ?? 0;

const hueOf = (oklch: string): number => partsOf(oklch)[2] ?? 0;

describe('sheet ink on a dark sheet', () => {
  it('keeps the authored colour for the light theme', () => {
    expect(adaptiveInk('#9C0006')).toMatch(/^light-dark\(#9C0006, oklch\(/u);
  });

  it('lifts dark text so it reads on a dark cell and keeps its hue', () => {
    const red = darkHalf('#9C0006');

    expect(lightnessOf(red)).toBeGreaterThanOrEqual(0.72);
    expect(hueOf(red)).toBeCloseTo(hueOf(darkHalf('#9C0006')), 5);
    expect(Math.abs(hueOf(red) - hueOf(darkHalf('#FF0000')))).toBeLessThan(5);
    expect(lightnessOf(darkHalf('#000000'))).toBe(0.94);
  });

  it('leaves light text as light as it was', () => {
    expect(lightnessOf(darkHalf('#FFEB84'))).toBeGreaterThan(0.9);
  });
});
