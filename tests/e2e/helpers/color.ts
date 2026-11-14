import { expect, type Locator, type Page } from '@playwright/test';
import { tokenValueOf } from './theme';

export type Rgb = readonly [number, number, number];

export type Point = readonly [number, number];

export interface PaintedColumn {
  readonly ratio: number;
  readonly pixels: readonly Rgb[];
}

export interface PaintedArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly delta: number;
}

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

export const tokenRgbIn = async (locator: Locator, token: string): Promise<Rgb> => {
  await locator.evaluate((element, name) => {
    const probe = document.createElement('span');

    probe.className = 'e2e-token-probe';
    probe.style.background = name;
    element.append(probe);
  }, tokenValueOf(token));

  const probe = locator.locator('.e2e-token-probe');
  const rgb = await rgbOf(probe, 'background-color');

  await probe.evaluate((element) => {
    element.remove();
  });

  return rgb;
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

const readColumn = async ({
  base64,
  x,
  from,
  to,
}: {
  base64: string;
  x: number;
  from: number;
  to: number;
}): Promise<PaintedColumn> => {
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
  const top = Math.round(from * devicePixelRatio);
  const height = Math.round(to * devicePixelRatio) - top;
  const data = context.getImageData(Math.round(x * devicePixelRatio), top, 1, height).data;

  return {
    ratio: devicePixelRatio,
    pixels: Array.from({ length: height }, (_, row): Rgb => [
      data[row * 4] ?? 0,
      data[row * 4 + 1] ?? 0,
      data[row * 4 + 2] ?? 0,
    ]),
  };
};

export const paintedColumn = async (
  locator: Locator,
  x: number,
  from: number,
  to: number,
): Promise<PaintedColumn> => {
  const png = await locator.screenshot({ animations: 'disabled' });
  return locator.page().evaluate(readColumn, { base64: png.toString('base64'), x, from, to });
};

const INK_DELTA = 24;

const countInk = async ({
  base64,
  area,
}: {
  base64: string;
  area: PaintedArea;
}): Promise<number> => {
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

  const { data } = context.getImageData(
    Math.round(area.x * devicePixelRatio),
    Math.round(area.y * devicePixelRatio),
    Math.max(Math.round(area.width * devicePixelRatio), 1),
    Math.max(Math.round(area.height * devicePixelRatio), 1),
  );

  const paper = [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
  let ink = 0;

  for (let offset = 0; offset < data.length; offset += 4) {
    const unlike = paper.some(
      (channel, index) => Math.abs((data[offset + index] ?? 0) - channel) > area.delta,
    );

    ink += Number(unlike);
  }
  return ink;
};

export const inkedPixels = async (
  locator: Locator,
  area: Omit<PaintedArea, 'delta'>,
): Promise<number> => {
  const png = await locator.screenshot({ animations: 'disabled' });

  return locator
    .page()
    .evaluate(countInk, { base64: png.toString('base64'), area: { ...area, delta: INK_DELTA } });
};

const countUnlike = async ({
  shots,
  area,
}: {
  shots: readonly string[];
  area: PaintedArea;
}): Promise<number> => {
  const left = Math.ceil(area.x * devicePixelRatio);
  const top = Math.ceil(area.y * devicePixelRatio);
  const width = Math.max(Math.floor(area.width * devicePixelRatio), 1);
  const height = Math.max(Math.floor(area.height * devicePixelRatio), 1);

  const [first = new Uint8ClampedArray(), second = new Uint8ClampedArray()] = await Promise.all(
    shots.map(async (base64) => {
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

      return context.getImageData(left, top, width, height).data;
    }),
  );

  let unlike = 0;

  for (let offset = 0; offset < first.length; offset += 4) {
    const differs = [0, 1, 2].some(
      (channel) =>
        Math.abs((first[offset + channel] ?? 0) - (second[offset + channel] ?? 0)) > area.delta,
    );

    unlike += Number(differs);
  }

  return unlike;
};

export const unlikePixels = (
  page: Page,
  shots: readonly [Buffer, Buffer],
  area: PaintedArea,
): Promise<number> =>
  page.evaluate(countUnlike, {
    shots: shots.map((shot) => shot.toString('base64')),
    area,
  });

export const rgbDelta = (a: Rgb, b: Rgb): number =>
  a.reduce((max, channel, i) => Math.max(max, Math.abs(channel - (b[i] ?? 0))), 0);

export const channelSumOf = (rgb: Rgb): number => rgb.reduce((sum, channel) => sum + channel, 0);
