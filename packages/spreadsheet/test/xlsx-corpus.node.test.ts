import { describe, expect, it } from 'vite-plus/test';
import { readWorkbook, readZip, writeWorkbook, type Bytes } from '../src/xlsx';
import {
  corpusFixtures,
  corpusPackage,
  differingCells,
  dumpOf,
  expectedPath,
  modelOf,
} from './xlsx-corpus';

interface RoundTrip {
  readonly written: boolean;
  readonly sameModel: boolean;
  readonly changedParts: readonly string[];
  readonly calcChain: boolean;
}

const REGENERATED = /^\[Content_Types\]\.xml$|calcChain\.xml$|\.rels$/u;

const KEPT: RoundTrip = { written: true, sameModel: true, changedParts: [], calcChain: false };

const changedParts = (before: Bytes, after: Bytes, parts: readonly string[]): string[] => {
  const left = readZip(before);
  const right = readZip(after);

  return parts.reduce<string[]>((changed, part) => {
    const original = left.ok ? left.archive.raw(part)?.data.join(',') : undefined;
    const written = right.ok ? right.archive.raw(part)?.data.join(',') : undefined;

    if (original === undefined || original !== written) {
      changed.push(part);
    }
    return changed;
  }, []);
};

const roundTripOf = async (bytes: Bytes): Promise<RoundTrip> => {
  const read = await readWorkbook(bytes);

  if (read.kind === 'rejected') {
    return KEPT;
  }

  const result = await writeWorkbook(read.book, read.calculator, { source: read.source });

  if (!result.ok) {
    return { ...KEPT, written: false };
  }
  if (read.kind === 'read-only') {
    return { ...KEPT, sameModel: result.bytes === bytes };
  }

  const again = await readWorkbook(result.bytes);
  const zip = readZip(result.bytes);

  const kept = read.source.parts.reduce<string[]>((names, part) => {
    if (part.kind === 'opaque' && !REGENERATED.test(part.name)) {
      names.push(part.name);
    }
    return names;
  }, []);

  return {
    written: true,
    sameModel:
      again.kind !== 'rejected' && JSON.stringify(modelOf(again)) === JSON.stringify(modelOf(read)),
    changedParts: changedParts(bytes, result.bytes, kept),
    calcChain: zip.ok && zip.archive.has('xl/calcChain.xml'),
  };
};

const recalculatedDifferences = async (bytes: Bytes): Promise<string[]> => {
  const imported = await readWorkbook(bytes);
  const computed = await readWorkbook(bytes, { recalc: 'chunked' });

  if (imported.kind === 'rejected' || computed.kind === 'rejected') {
    return [];
  }

  const before = modelOf(imported);
  const after = modelOf(computed);

  return JSON.stringify(before.sheets) === JSON.stringify(after.sheets)
    ? []
    : differingCells(before.sheets, after.sheets);
};

describe.each(corpusFixtures())('xlsx corpus: %s', (name) => {
  it('computes the values the file caches', async () => {
    expect(await recalculatedDifferences(await corpusPackage(name))).toEqual([]);
  });

  it('reads the model the corpus expects', async () => {
    const read = await readWorkbook(await corpusPackage(name));

    await expect(dumpOf(read)).toMatchFileSnapshot(expectedPath(name));
  });

  it('writes back what it read and keeps the parts it does not model byte for byte', async () => {
    expect(await roundTripOf(await corpusPackage(name))).toEqual(KEPT);
  });
});
