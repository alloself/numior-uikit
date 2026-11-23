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

interface PixelCounts {
  readonly ink: number;
  readonly tinted: number;
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

const settledShotOf = async (locator: Locator): Promise<Buffer> => {
  await locator.scrollIntoViewIfNeeded();

  await locator.evaluate(
    () =>
      new Promise<void>((settled) => {
        requestAnimationFrame(() => requestAnimationFrame(() => settled()));
      }),
  );

  return locator.screenshot({ animations: 'disabled' });
};

export const paintedRgb = async (locator: Locator): Promise<Rgb> => {
  const png = await settledShotOf(locator);
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
  const png = await settledShotOf(locator);
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
  const png = await settledShotOf(locator);
  return locator.page().evaluate(readColumn, { base64: png.toString('base64'), x, from, to });
};

export const paintedViewColumn = async (
  page: Page,
  x: number,
  from: number,
  to: number,
): Promise<PaintedColumn> => {
  const png = await page.screenshot({ animations: 'disabled' });
  return page.evaluate(readColumn, { base64: png.toString('base64'), x, from, to });
};

const INK_DELTA = 24;

const TINT_SPREAD = 40;

const countPixels = async ({
  base64,
  area,
  spread,
}: {
  base64: string;
  area: PaintedArea | undefined;
  spread: number;
}): Promise<PixelCounts> => {
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

  const { data } =
    area === undefined
      ? context.getImageData(0, 0, canvas.width, canvas.height)
      : context.getImageData(
          Math.round(area.x * devicePixelRatio),
          Math.round(area.y * devicePixelRatio),
          Math.max(Math.round(area.width * devicePixelRatio), 1),
          Math.max(Math.round(area.height * devicePixelRatio), 1),
        );

  const paper = [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
  const delta = area?.delta ?? 0;
  let ink = 0;
  let tinted = 0;

  for (let offset = 0; offset < data.length; offset += 4) {
    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? 0;
    const blue = data[offset + 2] ?? 0;

    const unlike = [red, green, blue].some(
      (channel, index) => Math.abs(channel - (paper[index] ?? 0)) > delta,
    );

    ink += Number(unlike);
    tinted += Number(Math.max(red, green, blue) - Math.min(red, green, blue) > spread);
  }
  return { ink, tinted };
};

export const tintedPixels = async (locator: Locator): Promise<number> => {
  const png = await settledShotOf(locator);

  const counts = await locator.page().evaluate(countPixels, {
    base64: png.toString('base64'),
    area: undefined,
    spread: TINT_SPREAD,
  });

  return counts.tinted;
};

export const inkedPixels = async (
  locator: Locator,
  area: Omit<PaintedArea, 'delta'>,
): Promise<number> => {
  const png = await settledShotOf(locator);

  const counts = await locator.page().evaluate(countPixels, {
    base64: png.toString('base64'),
    area: { ...area, delta: INK_DELTA },
    spread: TINT_SPREAD,
  });

  return counts.ink;
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

const MID_GREY_SUM = 3 * 128;

export const toneOf = (rgb: Rgb): 'dark' | 'light' =>
  channelSumOf(rgb) < MID_GREY_SUM ? 'dark' : 'light';

export const liesBetween = (value: Rgb, from: Rgb, to: Rgb, tolerance = 1): boolean =>
  value.every((channel, i) => {
    const low = Math.min(from[i] ?? 0, to[i] ?? 0);
    const high = Math.max(from[i] ?? 0, to[i] ?? 0);

    return channel >= low - tolerance && channel <= high + tolerance;
  });
