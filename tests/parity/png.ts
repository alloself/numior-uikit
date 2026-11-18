import { inflateSync } from 'node:zlib';
import type { Image } from './parity.types.ts';

interface RowLayout {
  readonly stride: number;
  readonly channels: number;
}

type Predictor = (left: number, up: number, corner: number) => number;

const SIGNATURE_LENGTH = 8;

const CHANNELS_BY_COLOR_TYPE = new Map([
  [2, 3],
  [6, 4],
]);

const paeth = (left: number, up: number, corner: number): number => {
  const estimate = left + up - corner;
  const byLeft = Math.abs(estimate - left);
  const byUp = Math.abs(estimate - up);
  const byCorner = Math.abs(estimate - corner);

  if (byLeft <= byUp && byLeft <= byCorner) {
    return left;
  }
  return byUp <= byCorner ? up : corner;
};

const unfiltered: Predictor = () => 0;

const predictors: readonly Predictor[] = [
  unfiltered,
  (left) => left,
  (_left, up) => up,
  (left, up) => (left + up) >> 1,
  paeth,
];

const chunksOf = (file: Uint8Array): Map<string, Buffer[]> => {
  const buffer = Buffer.from(file.buffer, file.byteOffset, file.byteLength);
  const chunks = new Map<string, Buffer[]>();
  let offset = SIGNATURE_LENGTH;

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);

    chunks.set(type, [
      ...(chunks.get(type) ?? []),
      buffer.subarray(offset + 8, offset + 8 + length),
    ]);

    offset += length + 12;
  }

  return chunks;
};

const sampleOf = (pixels: Uint8Array, index: number, exists: boolean): number =>
  exists ? (pixels[index] ?? 0) : 0;

const unfilterRow = (raw: Uint8Array, pixels: Uint8Array, row: number, layout: RowLayout): void => {
  const { stride, channels } = layout;
  const predict = predictors[raw[row * (stride + 1)] ?? 0] ?? unfiltered;
  const source = row * (stride + 1) + 1;
  const target = row * stride;
  const hasUp = row > 0;

  for (let at = 0; at < stride; at += 1) {
    const hasLeft = at >= channels;
    const left = sampleOf(pixels, target + at - channels, hasLeft);
    const up = sampleOf(pixels, target + at - stride, hasUp);
    const corner = sampleOf(pixels, target + at - stride - channels, hasLeft && hasUp);

    pixels[target + at] = ((raw[source + at] ?? 0) + predict(left, up, corner)) & 0xff;
  }
};

const unfilter = (raw: Uint8Array, width: number, height: number, channels: number): Uint8Array => {
  const stride = width * channels;
  const pixels = new Uint8Array(stride * height);

  for (let row = 0; row < height; row += 1) {
    unfilterRow(raw, pixels, row, { stride, channels });
  }

  return pixels;
};

export const decodePng = (file: Uint8Array): Image => {
  const chunks = chunksOf(file);
  const [header] = chunks.get('IHDR') ?? [];

  if (header === undefined) {
    throw new Error('PNG header is missing');
  }

  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const channels = CHANNELS_BY_COLOR_TYPE.get(header[9] ?? 0);

  if (header[8] !== 8 || channels === undefined || header[12] !== 0) {
    throw new Error('Only 8-bit non-interlaced RGB and RGBA PNG files are supported');
  }

  const raw = inflateSync(Buffer.concat(chunks.get('IDAT') ?? []));

  return { width, height, channels, pixels: unfilter(raw, width, height, channels) };
};

export const describePixelDiff = (base: Image, next: Image): string | null => {
  if (base.width !== next.width || base.height !== next.height) {
    return `size ${next.width}x${next.height}`;
  }

  if (base.channels !== next.channels) {
    return `channels ${next.channels}`;
  }

  let count = 0;
  let [minX, minY, maxX, maxY] = [base.width, base.height, -1, -1];

  for (let at = 0; at < base.pixels.length; at += 1) {
    if (base.pixels[at] === next.pixels[at]) {
      continue;
    }

    const pixel = Math.floor(at / base.channels);
    const x = pixel % base.width;
    const y = Math.floor(pixel / base.width);

    count += 1;

    [minX, minY, maxX, maxY] = [
      Math.min(minX, x),
      Math.min(minY, y),
      Math.max(maxX, x),
      Math.max(maxY, y),
    ];

    at = (pixel + 1) * base.channels - 1;
  }

  return count === 0 ? null : `${count} px differ within x ${minX}..${maxX}, y ${minY}..${maxY}`;
};
