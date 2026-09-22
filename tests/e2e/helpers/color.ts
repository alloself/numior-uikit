import { expect, type Locator } from '@playwright/test';

export type Rgb = readonly [number, number, number];

/**
 * Resolve a computed color to sRGB bytes through a canvas pixel. Browsers serialize
 * oklch() and color-mix() results in their own color spaces, so comparing the
 * computed-style string is not portable across engines.
 */
export function rgbOf(locator: Locator, property: string): Promise<Rgb> {
  return locator.evaluate((element, prop) => {
    const value = getComputedStyle(element).getPropertyValue(prop);
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('2D canvas is unavailable');
    context.fillStyle = '#010203';
    context.fillStyle = value;
    if (context.fillStyle === '#010203') throw new Error(`Unparseable color: ${value}`);
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b] as unknown as [number, number, number];
  }, property);
}

export async function expectRgb(
  locator: Locator,
  property: string,
  expected: Rgb,
  tolerance = 2,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const actual = await rgbOf(locator, property);
        const matches = actual.every((channel, i) => Math.abs(channel - expected[i]!) <= tolerance);
        return matches ? 'match' : `rgb(${actual.join(', ')})`;
      },
      { message: `${property} should be rgb(${expected.join(', ')}) ±${tolerance}` },
    )
    .toBe('match');
}
