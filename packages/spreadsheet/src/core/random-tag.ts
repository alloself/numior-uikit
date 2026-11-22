const TAG_RADIX = 36;

export const randomTag = (length: number): string =>
  Array.from(globalThis.crypto.getRandomValues(new Uint8Array(length)), (byte) =>
    (byte % TAG_RADIX).toString(TAG_RADIX),
  ).join('');
