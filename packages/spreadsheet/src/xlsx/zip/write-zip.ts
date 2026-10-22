import { nativeZipCodec } from './codec';
import { CRC_START, finishCrc, updateCrc } from './crc32';
import { ZipError, collectBytes, concatBytes, streamOf } from './streams';
import type { Bytes, ZipCodec, ZipOptions, ZipRawEntry, ZipWriteEntry } from './zip.types';

interface Packed {
  readonly name: Bytes;
  readonly raw: ZipRawEntry;
}

const LOCAL = 0x04_03_4b_50;

const CENTRAL = 0x02_01_4b_50;

const END = 0x06_05_4b_50;

const VERSION = 20;

const UTF8_NAMES = 0b1000_0000_0000;

const DOS_DATE = 0x00_21;

const STORED = 0;

const DEFLATED = 8;

const LIMIT = 0xff_ff_ff_ff;

const MAX_ENTRIES = 0xff_ff;

const utf8 = new TextEncoder();

const header = (size: number, write: (view: DataView) => void): Bytes => {
  const bytes = new Uint8Array(size);

  write(new DataView(bytes.buffer));
  return bytes;
};

const common = (view: DataView, at: number, packed: Packed): void => {
  view.setUint16(at, VERSION, true);
  view.setUint16(at + 2, UTF8_NAMES, true);
  view.setUint16(at + 4, packed.raw.method, true);
  view.setUint16(at + 6, 0, true);
  view.setUint16(at + 8, DOS_DATE, true);
  view.setUint32(at + 10, packed.raw.crc, true);
  view.setUint32(at + 14, packed.raw.data.length, true);
  view.setUint32(at + 18, packed.raw.size, true);
  view.setUint16(at + 22, packed.name.length, true);
  view.setUint16(at + 24, 0, true);
};

const localHeader = (packed: Packed): Bytes => {
  const bytes = header(30 + packed.name.length, (view) => {
    view.setUint32(0, LOCAL, true);
    common(view, 4, packed);
  });

  bytes.set(packed.name, 30);
  return bytes;
};

const centralHeader = (packed: Packed, offset: number): Bytes => {
  const bytes = header(46 + packed.name.length, (view) => {
    view.setUint32(0, CENTRAL, true);
    view.setUint16(4, VERSION, true);
    common(view, 6, packed);
    view.setUint32(42, offset, true);
  });

  bytes.set(packed.name, 46);
  return bytes;
};

const endRecord = (count: number, size: number, offset: number): Bytes =>
  header(22, (view) => {
    view.setUint32(0, END, true);
    view.setUint16(8, count, true);
    view.setUint16(10, count, true);
    view.setUint32(12, size, true);
    view.setUint32(16, offset, true);
  });

const counted = (): {
  readonly stream: TransformStream<Bytes, Bytes>;
  readonly result: () => { crc: number; size: number };
} => {
  let crc = CRC_START;
  let size = 0;

  return {
    stream: new TransformStream<Bytes, Bytes>({
      transform: (chunk, controller) => {
        crc = updateCrc(crc, chunk);
        size += chunk.length;
        controller.enqueue(chunk);
      },
    }),
    result: () => ({ crc: finishCrc(crc), size }),
  };
};

const packed = async (entry: ZipWriteEntry, codec: ZipCodec): Promise<ZipRawEntry> => {
  if ('copy' in entry) {
    return entry.copy;
  }

  const source = entry.data instanceof Uint8Array ? streamOf(entry.data) : entry.data;
  const counter = counted();
  const measured = source.pipeThrough(counter.stream);
  const store = entry.store === true;
  const data = await collectBytes(store ? measured : measured.pipeThrough(codec.deflate()));

  return { method: store ? STORED : DEFLATED, ...counter.result(), data };
};

export const writeZip = async (
  entries: readonly ZipWriteEntry[],
  options: ZipOptions = {},
): Promise<Bytes> => {
  const codec = options.codec ?? nativeZipCodec;
  const parts: Bytes[] = [];
  const central: Bytes[] = [];
  let offset = 0;

  if (entries.length > MAX_ENTRIES) {
    throw new ZipError('too-large');
  }
  for (const entry of entries) {
    options.signal?.throwIfAborted();

    const item: Packed = { name: utf8.encode(entry.name), raw: await packed(entry, codec) };
    const local = localHeader(item);

    if (offset > LIMIT || item.raw.size > LIMIT || item.raw.data.length > LIMIT) {
      throw new ZipError('too-large');
    }
    central.push(centralHeader(item, offset));
    parts.push(local, item.raw.data);
    offset += local.length + item.raw.data.length;
  }

  const directory = concatBytes(central);

  if (offset + directory.length > LIMIT) {
    throw new ZipError('too-large');
  }
  return concatBytes([...parts, directory, endRecord(entries.length, directory.length, offset)]);
};
