import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatCell } from '@numior/spreadsheet/core';
import { readWorkbook, writeWorkbook, writeZip, type XlsxWrite } from '@numior/spreadsheet/xlsx';
import { corpusFixtures, corpusSource } from '../test/corpus-files.ts';
import { functionCorpora, type Corpus } from '../test/function-corpus.ts';
import {
  caseBook,
  mismatchesOf,
  printMismatches,
  shownInput,
  valuesOf,
  type BookCase,
  type Check,
  type Values,
} from './books.ts';

const HERE = fileURLToPath(new URL('.', import.meta.url));

const IMAGE = 'numior-libre';

const LIBRE_TOLERANCE = 1e-13;

const SKIPPED_FAMILIES = new Set(['volatile']);

const USER = `${String(process.getuid?.() ?? 0)}:${String(process.getgid?.() ?? 0)}`;

const saved = (folder: string, file: string, written: XlsxWrite): void => {
  if (!written.ok) {
    throw new Error(`${file} was refused by the writer`);
  }
  writeFileSync(join(folder, `${file}.xlsx`), written.bytes);
};

const functionBook = async (corpus: Corpus, folder: string): Promise<readonly Check[]> => {
  const cases = SKIPPED_FAMILIES.has(corpus.family)
    ? []
    : corpus.cases.reduce<BookCase[]>((found, entry) => {
        if (entry.locale === 'en') {
          found.push({ corpus, entry, sheet: `c${String(found.length + 1)}` });
        }
        return found;
      }, []);

  if (cases.length === 0) {
    return [];
  }

  const file = `functions-${corpus.family}`;
  const { book, calculator, checks } = caseBook(cases, file, LIBRE_TOLERANCE);

  saved(folder, file, await writeWorkbook(book, calculator));
  return checks;
};

const fixtureBook = async (name: string, folder: string): Promise<Check[]> => {
  const source = corpusSource(name);
  const bytes = source.kind === 'bytes' ? source.bytes : await writeZip(source.parts);
  const read = await readWorkbook(bytes, { recalc: 'chunked' });

  if (read.kind !== 'editable') {
    return [];
  }

  const file = `xlsx-${name}`;
  const checks: Check[] = [];

  read.calculator.forEachFormula((sheet, row, col) => {
    checks.push({
      key: `${name}: ${sheet.name}!${formatCell({ row, col })}`,
      file,
      sheet: sheet.name,
      row,
      col,
      wanted: shownInput(sheet.cells.get(row, col)),
      tolerance: LIBRE_TOLERANCE,
    });
  });

  saved(folder, file, await writeWorkbook(read.book, read.calculator, { source: read.source }));
  return checks;
};

const convert = (folder: string): string => {
  execFileSync('docker', ['build', '-q', '-t', IMAGE, HERE], { stdio: 'ignore' });

  execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '--user',
      USER,
      '-e',
      'HOME=/tmp',
      '-v',
      `${folder}:/work`,
      IMAGE,
      'sh',
      '-c',
      `cp -r /opt/profile /tmp/profile && soffice --headless -env:UserInstallation=file:///tmp/profile --convert-to xlsx --outdir /work/libre /work/*.xlsx`,
    ],
    { stdio: 'ignore' },
  );

  return execFileSync('docker', ['run', '--rm', IMAGE, 'soffice', '--version'], {
    encoding: 'utf8',
  }).trim();
};

const libreValues = async (folder: string, file: string): Promise<Values> => {
  const path = join(folder, 'libre', `${file}.xlsx`);

  const read = existsSync(path)
    ? await readWorkbook(new Uint8Array(readFileSync(path)))
    : undefined;

  return read === undefined || read.kind === 'rejected' ? new Map() : valuesOf(read);
};

const knownDifferences = (): Map<string, string> => {
  const data: unknown = JSON.parse(readFileSync(join(HERE, 'libre-known.json'), 'utf8'));

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('libre-known.json must map case keys to reasons');
  }
  return new Map(
    Object.entries(data).map(([key, reason]) => [key, typeof reason === 'string' ? reason : '']),
  );
};

const run = async (): Promise<void> => {
  const folder = mkdtempSync(join(tmpdir(), 'numior-libre-'));

  mkdirSync(join(folder, 'libre'));

  const corpora = functionCorpora();

  const skipped = corpora.reduce(
    (count, corpus) =>
      count +
      corpus.cases.reduce(
        (inner, entry) =>
          inner + (SKIPPED_FAMILIES.has(corpus.family) || entry.locale === 'ru' ? 1 : 0),
        0,
      ),
    0,
  );

  const functionChecks = await Promise.all(corpora.map((corpus) => functionBook(corpus, folder)));

  const fixtureChecks = await Promise.all(
    corpusFixtures().map((name) => fixtureBook(name, folder)),
  );

  const checks = [...functionChecks.flat(), ...fixtureChecks.flat()];
  const version = convert(folder);
  const mismatches = await mismatchesOf(checks, (file) => libreValues(folder, file), true);
  const known = knownDifferences();
  const keys = new Set(checks.map((check) => check.key));
  const fresh = [...mismatches].filter(([key]) => !known.has(key));
  const stale = [...known.keys()].filter((key) => keys.has(key) && !mismatches.has(key));

  console.log(
    `${version}: ${String(keys.size)} cases, ${String(checks.length)} cells; ${String(keys.size - mismatches.size)} agree, ${String(mismatches.size - fresh.length)} known, ${String(fresh.length)} new; ${String(skipped)} skipped (Russian locale, clock and random)`,
  );

  printMismatches(fresh, 'LibreOffice');

  stale.forEach((key) => {
    console.log(`agrees now, drop from libre-known.json: ${key}`);
  });

  rmSync(folder, { recursive: true, force: true });
  process.exitCode = fresh.length > 0 || stale.length > 0 ? 1 : 0;
};

await run();
