import type { ZipCodec } from './zip.types';

export const nativeZipCodec: ZipCodec = {
  inflate: () => new DecompressionStream('deflate-raw'),
  deflate: () => new CompressionStream('deflate-raw'),
};
