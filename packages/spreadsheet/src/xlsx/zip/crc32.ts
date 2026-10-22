import type { Bytes } from './zip.types';

const POLYNOMIAL = 0xed_b8_83_20;

const TABLE = new Uint32Array(256 * 8);

for (let index = 0; index < 256; index += 1) {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? POLYNOMIAL ^ (value >>> 1) : value >>> 1;
  }
  TABLE[index] = value >>> 0;
}
for (let index = 256; index < TABLE.length; index += 1) {
  const previous = TABLE[index - 256] ?? 0;

  TABLE[index] = ((TABLE[previous & 0xff] ?? 0) ^ (previous >>> 8)) >>> 0;
}

const at = (index: number): number => TABLE[index] ?? 0;

export const CRC_START = 0xff_ff_ff_ff;

export const updateCrc = (crc: number, data: Bytes): number => {
  const words = data.length - (data.length % 8);
  let value = crc;

  for (let index = 0; index < words; index += 8) {
    const low =
      (value ^
        ((data[index] ?? 0) |
          ((data[index + 1] ?? 0) << 8) |
          ((data[index + 2] ?? 0) << 16) |
          ((data[index + 3] ?? 0) << 24))) >>>
      0;

    const high =
      (data[index + 4] ?? 0) |
      ((data[index + 5] ?? 0) << 8) |
      ((data[index + 6] ?? 0) << 16) |
      ((data[index + 7] ?? 0) << 24);

    value =
      at(1792 + (low & 0xff)) ^
      at(1536 + ((low >>> 8) & 0xff)) ^
      at(1280 + ((low >>> 16) & 0xff)) ^
      at(1024 + (low >>> 24)) ^
      at(768 + (high & 0xff)) ^
      at(512 + ((high >>> 8) & 0xff)) ^
      at(256 + ((high >>> 16) & 0xff)) ^
      at(high >>> 24);
  }
  for (let index = words; index < data.length; index += 1) {
    value = at((value ^ (data[index] ?? 0)) & 0xff) ^ (value >>> 8);
  }
  return value >>> 0;
};

export const finishCrc = (crc: number): number => (crc ^ CRC_START) >>> 0;

export const crc32 = (data: Bytes): number => finishCrc(updateCrc(CRC_START, data));
