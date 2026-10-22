import { nativeZipCodec } from './codec';
import { CRC_START, finishCrc, updateCrc } from './crc32';
import { ZipError, collectBytes, streamOf } from './streams';
import type { Bytes, ZipArchive, ZipCodec, ZipFailure, ZipRawEntry, ZipRead } from './zip.types';

interface Entry {
  readonly name: string;
  readonly flags: number;
  readonly method: number;
  readonly crc: number;
  readonly compressed: number;
  readonly size: number;
  readonly offset: number;
}

type Located = { readonly ok: true; readonly entries: Entry[] } | ZipRefusal;

interface ZipRefusal {
  readonly ok: false;
  readonly reason: ZipFailure;
}

const END = 0x06_05_4b_50;

const CENTRAL = 0x02_01_4b_50;

const LOCAL = 0x04_03_4b_50;

const ZIP64_END = 0x06_06_4b_50;

const ZIP64_LOCATOR = 0x07_06_4b_50;

const ZIP64_EXTRA = 0x00_01;

const END_SIZE = 22;

const LOCAL_SIZE = 30;

const CENTRAL_SIZE = 46;

const MAX_COMMENT = 0xff_ff;

const WIDE = 0xff_ff_ff_ff;

const ENCRYPTED = 0b1;

const STORED = 0;

const DEFLATED = 8;

const utf8 = new TextDecoder();

const refuse = (reason: ZipFailure): ZipRefusal => ({ ok: false, reason });

const wide = (view: DataView, at: number): number =>
  view.getUint32(at, true) + view.getUint32(at + 4, true) * 0x1_00_00_00_00;

const endOf = (view: DataView): number | undefined => {
  const last = view.byteLength - END_SIZE;

  for (let at = last; at >= Math.max(0, last - MAX_COMMENT); at -= 1) {
    if (view.getUint32(at, true) === END) {
      return at;
    }
  }
  return undefined;
};

interface Directory {
  readonly count: number;
  readonly offset: number;
}

const directoryOf = (view: DataView, end: number): Directory | undefined => {
  const count = view.getUint16(end + 10, true);
  const offset = view.getUint32(end + 16, true);

  if (count !== 0xff_ff && offset !== WIDE) {
    return { count, offset };
  }

  const locator = end - 20;

  if (locator < 0 || view.getUint32(locator, true) !== ZIP64_LOCATOR) {
    return undefined;
  }

  const record = wide(view, locator + 8);

  if (record + 56 > view.byteLength || view.getUint32(record, true) !== ZIP64_END) {
    return undefined;
  }
  return { count: wide(view, record + 32), offset: wide(view, record + 48) };
};

const widened = (
  view: DataView,
  extra: number,
  length: number,
  values: readonly number[],
): number[] => {
  const result = [...values];
  let at = extra;

  while (at + 4 <= extra + length) {
    const id = view.getUint16(at, true);
    const size = view.getUint16(at + 2, true);

    if (id === ZIP64_EXTRA) {
      let field = at + 4;

      result.forEach((value, index) => {
        if (value === WIDE && field + 8 <= at + 4 + size) {
          result[index] = wide(view, field);
          field += 8;
        }
      });

      return result;
    }
    at += 4 + size;
  }
  return result;
};

const entryAt = (view: DataView, bytes: Bytes, at: number): Entry | undefined => {
  if (at + CENTRAL_SIZE > view.byteLength || view.getUint32(at, true) !== CENTRAL) {
    return undefined;
  }

  const nameLength = view.getUint16(at + 28, true);
  const extraLength = view.getUint16(at + 30, true);
  const name = utf8.decode(bytes.subarray(at + CENTRAL_SIZE, at + CENTRAL_SIZE + nameLength));

  const [size = 0, compressed = 0, offset = 0] = widened(
    view,
    at + CENTRAL_SIZE + nameLength,
    extraLength,
    [view.getUint32(at + 24, true), view.getUint32(at + 20, true), view.getUint32(at + 42, true)],
  );

  return {
    name,
    flags: view.getUint16(at + 8, true),
    method: view.getUint16(at + 10, true),
    crc: view.getUint32(at + 16, true),
    compressed,
    size,
    offset,
  };
};

const centralLength = (view: DataView, at: number): number =>
  CENTRAL_SIZE +
  view.getUint16(at + 28, true) +
  view.getUint16(at + 30, true) +
  view.getUint16(at + 32, true);

const locate = (bytes: Bytes): Located => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length >= END_SIZE ? endOf(view) : undefined;
  const directory = end === undefined ? undefined : directoryOf(view, end);

  if (directory === undefined) {
    return refuse('not-zip');
  }

  const entries: Entry[] = [];
  let at = directory.offset;

  while (entries.length < directory.count) {
    const entry = entryAt(view, bytes, at);

    if (entry === undefined) {
      return refuse('damaged');
    }
    entries.push(entry);
    at += centralLength(view, at);
  }
  return { ok: true, entries };
};

const dataOf = (bytes: Bytes, entry: Entry): Bytes => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (entry.offset + LOCAL_SIZE > bytes.length || view.getUint32(entry.offset, true) !== LOCAL) {
    throw new ZipError('damaged');
  }

  const start =
    entry.offset +
    LOCAL_SIZE +
    view.getUint16(entry.offset + 26, true) +
    view.getUint16(entry.offset + 28, true);

  if (start + entry.compressed > bytes.length) {
    throw new ZipError('damaged');
  }
  return bytes.subarray(start, start + entry.compressed);
};

const checked = (entry: Entry): TransformStream<Bytes, Bytes> => {
  let crc = CRC_START;
  let size = 0;

  return new TransformStream<Bytes, Bytes>({
    transform: (chunk, controller) => {
      crc = updateCrc(crc, chunk);
      size += chunk.length;
      controller.enqueue(chunk);
    },
    flush: (controller) => {
      if (finishCrc(crc) !== entry.crc || size !== entry.size) {
        controller.error(new ZipError('damaged'));
      }
    },
  });
};

const opened = (bytes: Bytes, entry: Entry, codec: ZipCodec): ReadableStream<Bytes> => {
  if ((entry.flags & ENCRYPTED) !== 0) {
    throw new ZipError('encrypted');
  }
  if (entry.method !== STORED && entry.method !== DEFLATED) {
    throw new ZipError('unsupported-method');
  }

  const source = streamOf(dataOf(bytes, entry));

  return (entry.method === DEFLATED ? source.pipeThrough(codec.inflate()) : source).pipeThrough(
    checked(entry),
  );
};

export const readZip = (bytes: Bytes, codec: ZipCodec = nativeZipCodec): ZipRead => {
  const located = locate(bytes);

  if (!located.ok) {
    return located;
  }

  const byName = new Map(located.entries.map((entry) => [entry.name, entry]));

  const entryNamed = (name: string): Entry => {
    const entry = byName.get(name);

    if (entry === undefined) {
      throw new RangeError(`The archive has no ${name}`);
    }
    return entry;
  };

  const stream = (name: string): ReadableStream<Bytes> => opened(bytes, entryNamed(name), codec);

  const archive: ZipArchive = {
    names: located.entries.map((entry) => entry.name),
    has: (name) => byName.has(name),
    stream,
    bytes: async (name) => collectBytes(stream(name)),
    text: async (name) => utf8.decode(await collectBytes(stream(name))),
    raw: (name): ZipRawEntry | undefined => {
      const entry = byName.get(name);

      return entry === undefined || (entry.flags & ENCRYPTED) !== 0
        ? undefined
        : { method: entry.method, crc: entry.crc, size: entry.size, data: dataOf(bytes, entry) };
    },
  };

  return { ok: true, archive };
};
