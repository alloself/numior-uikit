import { expect, type Locator } from '@playwright/test';

export type Rgb = readonly [number, number, number];

export const rgbOf = (locator: Locator, property: string): Promise<Rgb> => {
  return locator.evaluate((element, prop) => {
    const value = getComputedStyle(element).getPropertyValue(prop);
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('2D canvas is unavailable');
    }
    context.fillStyle = '#010203';
    context.fillStyle = value;
    if (context.fillStyle === '#010203') {
      throw new Error(`Unparseable color: ${value}`);
    }
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  }, property);
};

export const expectRgb = async (
  locator: Locator,
  property: string,
  expected: Rgb,
  tolerance = 2,
): Promise<void> => {
  await expect
    .poll(
      async () => {
        const actual = await rgbOf(locator, property);

        const matches = actual.every(
          (channel, i) => Math.abs(channel - (expected[i] ?? 0)) <= tolerance,
        );

        return matches ? 'match' : `rgb(${actual.join(', ')})`;
      },
      { message: `${property} should be rgb(${expected.join(', ')}) ±${tolerance}` },
    )
    .toBe('match');
};

const readBottomPixel = async (base64: string): Promise<Rgb> => {
  const image = new Image();
  image.src = `data:image/png;base64,${base64}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('2D canvas is unavailable');
  }
  context.drawImage(image, 0, 0);
  const x = Math.floor(canvas.width / 2);
  const y = canvas.height - Math.round(6 * devicePixelRatio);
  const [r = 0, g = 0, b = 0] = context.getImageData(x, y, 1, 1).data;
  return [r, g, b];
};

export const paintedRgb = async (locator: Locator): Promise<Rgb> => {
  const png = await locator.screenshot({ animations: 'disabled' });
  return locator.page().evaluate(readBottomPixel, png.toString('base64'));
};

export type Point = readonly [number, number];

const readPixels = async ({
  base64,
  points,
}: {
  base64: string;
  points: readonly Point[];
}): Promise<Rgb[]> => {
  const image = new Image();
  image.src = `data:image/png;base64,${base64}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('2D canvas is unavailable');
  }
  context.drawImage(image, 0, 0);
  return points.map(([x, y]) => {
    const [r = 0, g = 0, b = 0] = context.getImageData(
      Math.round(x * devicePixelRatio),
      Math.round(y * devicePixelRatio),
      1,
      1,
    ).data;

    return [r, g, b];
  });
};

export const paintedRgbAt = async (locator: Locator, points: readonly Point[]): Promise<Rgb[]> => {
  const png = await locator.screenshot({ animations: 'disabled' });
  return locator.page().evaluate(readPixels, { base64: png.toString('base64'), points });
};

export const rgbDelta = (a: Rgb, b: Rgb): number =>
  a.reduce((max, channel, i) => Math.max(max, Math.abs(channel - (b[i] ?? 0))), 0);
