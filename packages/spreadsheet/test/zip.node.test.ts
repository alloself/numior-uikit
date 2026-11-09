import { readFile } from 'node:fs/promises';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import {
  ZipError,
  crc32,
  readZip,
  writeZip,
  type Bytes,
  type ZipArchive,
  type ZipCodec,
  type ZipWriteEntry,
} from '../src/xlsx';

const fixture = async (name: string): Promise<Bytes> =>
  new Uint8Array(await readFile(new URL(`./corpus/zip/${name}`, import.meta.url)));

const opened = (bytes: Bytes): ZipArchive => {
  const read = readZip(bytes);

  if (!read.ok) {
    throw new Error(`the archive was refused: ${read.reason}`);
  }
  return read.archive;
};

const reason = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
    return 'read';
  } catch (error) {
    return error instanceof ZipError ? error.reason : 'other';
  }
};

const view = (bytes: Uint8Array): DataView =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const centralOffset = (bytes: Uint8Array): number =>
  view(bytes).getUint32(bytes.length - 22 + 16, true);

const text = (value: string): Bytes => new TextEncoder().encode(value);

const contents = async (archive: ZipArchive): Promise<Record<string, readonly number[]>> =>
  Object.fromEntries(
    await Promise.all(
      archive.names.map(async (name) => [name, [...(await archive.bytes(name))]] as const),
    ),
  );

const CHUNK = 1024;

const flood = (chunks: number): ZipCodec => ({
  inflate: () =>
    new TransformStream<Bytes, Bytes>({
      transform: () => undefined,
      flush: (controller) => {
        for (let sent = 0; sent < chunks; sent += 1) {
          controller.enqueue(new Uint8Array(CHUNK));
        }
      },
    }),
  deflate: () => new TransformStream<Bytes, Bytes>(),
});

const received = async (stream: ReadableStream<Bytes>): Promise<number> => {
  const reader = stream.getReader();
  let chunks = 0;

  try {
    for (let next = await reader.read(); !next.done; next = await reader.read()) {
      chunks += 1;
    }
  } catch {
    return chunks;
  }
  return chunks;
};

describe('zip archives', () => {
  it('reads what Python writes, with stored, deflated, empty and Cyrillic entries', async () => {
    const archive = opened(await fixture('python.zip'));

    expect(archive.names).toEqual(['xl/worksheets/sheet1.xml', 'docProps/Отчёт.txt', 'empty.bin']);
    expect(await archive.text('docProps/Отчёт.txt')).toBe('Привет, мир');
    expect((await archive.text('xl/worksheets/sheet1.xml')).length).toBe(8844);
    expect(await archive.bytes('empty.bin')).toEqual(new Uint8Array());
    expect(archive.raw('xl/worksheets/sheet1.xml')).toMatchObject({ method: 8, size: 8844 });
  });

  it('reads entries with data descriptors and a ZIP64 directory', async () => {
    const descriptor = opened(await fixture('descriptor.zip'));
    const wide = opened(await fixture('zip64.zip'));

    expect(await descriptor.text('b.txt')).toBe('second entry');
    expect(crc32(await descriptor.bytes('a.xml'))).toBe(0xd0_01_cc_81);
    expect(await wide.text('part.xml')).toBe('<root>zip64 directory</root>');
  });

  it('writes archives it reads back the same, deterministically', async () => {
    const entries: ZipWriteEntry[] = [
      { name: '[Content_Types].xml', data: text('<Types/>') },
      { name: 'xl/media/image1.png', data: new Uint8Array([137, 80, 78, 71]), store: true },
      { name: 'Отчёт.xml', data: new Response('<a>stream</a>').body ?? new ReadableStream() },
    ];

    const bytes = await writeZip(entries);
    const archive = opened(bytes);

    expect(archive.names).toEqual(['[Content_Types].xml', 'xl/media/image1.png', 'Отчёт.xml']);
    expect(await archive.text('Отчёт.xml')).toBe('<a>stream</a>');
    expect(archive.raw('xl/media/image1.png')?.method).toBe(0);
    expect(await writeZip(entries.slice(0, 2))).toEqual(await writeZip(entries.slice(0, 2)));
  });

  it('copies a raw entry byte for byte without inflating it', async () => {
    const source = opened(await fixture('python.zip'));
    const raw = source.raw('xl/worksheets/sheet1.xml');

    if (raw === undefined) {
      throw new Error('the entry is missing');
    }

    const copy = opened(await writeZip([{ name: 'sheet.xml', copy: raw }]));

    expect(copy.raw('sheet.xml')?.data).toEqual(raw.data);
    expect(await copy.text('sheet.xml')).toBe(await source.text('xl/worksheets/sheet1.xml'));
  });

  it('round-trips any set of entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            data: fc.uint8Array({ maxLength: 2000 }).map((data) => new Uint8Array(data)),
            store: fc.boolean(),
          }),
          { selector: (entry) => entry.name, maxLength: 6 },
        ),
        async (entries) => {
          const archive = opened(await writeZip(entries));

          expect(await contents(archive)).toEqual(
            Object.fromEntries(entries.map((entry) => [entry.name, [...entry.data]])),
          );
        },
      ),
      { numRuns: 60 },
    );
  });

  it('stops an entry that inflates past its declared size and refuses oversized archives', async () => {
    const bytes = await writeZip([{ name: 'a.txt', data: text('hello hello hello hello') }]);
    const bomb = readZip(bytes, flood(64));

    if (!bomb.ok) {
      throw new Error(`the archive was refused: ${bomb.reason}`);
    }

    expect(await received(bomb.archive.stream('a.txt'))).toBe(0);
    expect(await reason(() => bomb.archive.text('a.txt'))).toBe('damaged');
    expect(readZip(bytes, undefined, { maxSize: 8 })).toEqual({ ok: false, reason: 'too-large' });
  });

  it('refuses what is not a zip and reports damaged, encrypted and unknown entries', async () => {
    const bytes = await writeZip([{ name: 'a.txt', data: text('hello'), store: true }]);
    const damaged = bytes.slice();
    const encrypted = bytes.slice();
    const unknown = bytes.slice();

    damaged[30 + 'a.txt'.length] = 0;
    view(encrypted).setUint16(centralOffset(encrypted) + 8, 1, true);
    view(unknown).setUint16(centralOffset(unknown) + 10, 12, true);

    expect(readZip(text('PK not really'))).toEqual({ ok: false, reason: 'not-zip' });
    expect(await reason(() => opened(damaged).text('a.txt'))).toBe('damaged');
    expect(await reason(() => opened(encrypted).text('a.txt'))).toBe('encrypted');
    expect(opened(encrypted).raw('a.txt')).toBeUndefined();
    expect(await reason(() => opened(unknown).text('a.txt'))).toBe('unsupported-method');
  });
});
