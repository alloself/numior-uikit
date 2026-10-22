import type { Bytes, ZipFailure } from './zip.types';

const CHUNK = 65_536;

export class ZipError extends Error {
  readonly reason: ZipFailure;

  constructor(reason: ZipFailure) {
    super(`zip: ${reason}`);
    this.reason = reason;
  }
}

export const streamOf = (bytes: Bytes): ReadableStream<Bytes> => {
  let at = 0;

  return new ReadableStream<Bytes>({
    pull: (controller) => {
      if (at >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.subarray(at, at + CHUNK));
      at += CHUNK;
    },
  });
};

export const concatBytes = (chunks: readonly Bytes[]): Bytes => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const joined = new Uint8Array(total);
  let at = 0;

  chunks.forEach((chunk) => {
    joined.set(chunk, at);
    at += chunk.length;
  });

  return joined;
};

export const eachChunk = async <T>(
  stream: ReadableStream<T>,
  visit: (chunk: T) => void,
): Promise<void> => {
  const reader = stream.getReader();

  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    visit(next.value);
  }
};

export const collectBytes = async (stream: ReadableStream<Bytes>): Promise<Bytes> => {
  const chunks: Bytes[] = [];

  await eachChunk(stream, (chunk) => {
    chunks.push(chunk);
  });

  return concatBytes(chunks);
};
