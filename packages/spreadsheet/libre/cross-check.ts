import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EN_LOCALE,
  MAX_COLS,
  MAX_ROWS,
  booleanValue,
  createCalculator,
  createWorkbook,
  formatCell,
  numberValue,
  parseCell,
  textValue,
  type Calculator,
  type CellValue,
  type Sheet,
} from '@numior/spreadsheet/core';
import { readWorkbook, writeWorkbook, writeZip, type Bytes } from '@numior/spreadsheet/xlsx';
import { corpusFixtures, corpusSource } from '../test/corpus-files.ts';
import {
  RESULT,
  agrees,
  functionCorpora,
  wantedGrid,
  type Corpus,
  type CorpusCase,
  type Input,
} from '../test/function-corpus.ts';

interface Check {
  readonly key: string;
  readonly file: string;
  readonly sheet: string;
  readonly row: number;
  readonly col: number;
  readonly wanted: Input;
  readonly tolerance: number;
}

interface Mismatch {
  readonly cell: string;
  readonly wanted: Input;
  readonly found: Input | undefined;
}

const HERE = fileURLToPath(new URL('.', import.meta.url));

const IMAGE = 'numior-libre';

const WHOLE = { top: 0, left: 0, bottom: MAX_ROWS - 1, right: MAX_COLS - 1 };

const LIBRE_TOLERANCE = 1e-13;

const SKIPPED_FAMILIES = new Set(['volatile']);

const isError = (value: Input | undefined): boolean =>
  typeof value === 'string' && /^#[A-Z/0!?]+[!?A]?$/u.test(value);

const same = (found: Input | undefined, check: Check): boolean =>
  found !== undefined &&
  (agrees(found, check.wanted, check.tolerance) || (isError(found) && isError(check.wanted)));

const CLOCK = new Date(2026, 9, 18, 12);

const USER = `${String(process.getuid?.() ?? 0)}:${String(process.getgid?.() ?? 0)}`;

const at = (address: string): { readonly row: number; readonly col: number } => {
  const cell = parseCell(address);

  if (cell === undefined) {
    throw new Error(`${address} is not a cell`);
  }
  return cell;
};

const valueOf = (input: Input): CellValue => {
  switch (typeof input) {
    case 'number':
      return numberValue(input);
    case 'boolean':
      return booleanValue(input);
    default:
      return textValue(input);
  }
};

const place = (calculator: Calculator, sheet: Sheet, address: string, input: Input): void => {
  const { row, col } = at(address);

  if (typeof input === 'string' && input.startsWith('=')) {
    if (!calculator.setFormula(sheet, row, col, input).ok) {
      throw new Error(`${input} does not parse`);
    }
    return;
  }
  calculator.setValue(sheet, row, col, valueOf(input));
};

const savedBytes = async (
  folder: string,
  file: string,
  bytes: Promise<{ readonly ok: true; readonly bytes: Bytes } | { readonly ok: false }>,
): Promise<void> => {
  const written = await bytes;

  if (!written.ok) {
    throw new Error(`${file} was refused by the writer`);
  }
  writeFileSync(join(folder, `${file}.xlsx`), written.bytes);
};

const caseChecks = (corpus: Corpus, entry: CorpusCase, file: string, sheet: Sheet): Check[] =>
  wantedGrid(entry.expected).flatMap((row, rowIndex) =>
    row.map((wanted, colIndex) => ({
      key: `${corpus.family}: ${entry.formula}`,
      file,
      sheet: sheet.name,
      row: RESULT.row + rowIndex,
      col: RESULT.col + colIndex,
      wanted,
      tolerance: Math.max(entry.tolerance, LIBRE_TOLERANCE),
    })),
  );

const functionBook = async (corpus: Corpus, folder: string): Promise<Check[]> => {
  const cases = corpus.cases.reduce<CorpusCase[]>((found, entry) => {
    if (entry.locale === 'en' && !SKIPPED_FAMILIES.has(corpus.family)) {
      found.push(entry);
    }
    return found;
  }, []);

  if (cases.length === 0) {
    return [];
  }

  const book = createWorkbook();
  const file = `functions-${corpus.family}`;

  const calculator = createCalculator(book, {
    locale: EN_LOCALE,
    clock: () => CLOCK,
    random: () => 0.5,
  });

  const checks = cases.flatMap((entry, index) => {
    const sheet = book.addSheet(`c${String(index + 1)}`);

    Object.entries(entry.cells).forEach(([address, input]) => {
      place(calculator, sheet, address, input);
    });

    place(calculator, sheet, formatCell(RESULT), entry.formula);
    return caseChecks(corpus, entry, file, sheet);
  });

  calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });
  await savedBytes(folder, file, writeWorkbook(book, calculator));
  return checks;
};

const shownInput = (value: CellValue): Input => {
  switch (value.kind) {
    case 'empty':
      return '';
    case 'error':
      return value.code;
    default:
      return value.value;
  }
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

  await savedBytes(
    folder,
    file,
    writeWorkbook(read.book, read.calculator, { source: read.source }),
  );

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

const libreValues = async (folder: string, file: string): Promise<Map<string, CellValue>> => {
  const path = join(folder, 'libre', `${file}.xlsx`);
  const values = new Map<string, CellValue>();

  if (!existsSync(path)) {
    return values;
  }

  const read = await readWorkbook(new Uint8Array(readFileSync(path)));

  if (read.kind === 'rejected') {
    return values;
  }

  read.book.sheets.forEach((sheet) => {
    sheet.cells.forEachInRange(WHOLE, (row, col, value) => {
      values.set(`${sheet.name}!${formatCell({ row, col })}`, value);
    });
  });

  return values;
};

const knownDifferences = (): Map<string, string> => {
  const data: unknown = JSON.parse(readFileSync(join(HERE, 'known.json'), 'utf8'));

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('known.json must map case keys to reasons');
  }
  return new Map(
    Object.entries(data).map(([key, reason]) => [key, typeof reason === 'string' ? reason : '']),
  );
};

const recorded = (
  found: Map<string, Mismatch[]>,
  check: Check,
  value: CellValue | undefined,
): void => {
  const shown = value === undefined ? undefined : shownInput(value);

  if (same(shown, check)) {
    return;
  }

  const list = found.get(check.key) ?? [];

  list.push({ cell: formatCell(check), wanted: check.wanted, found: shown });
  found.set(check.key, list);
};

const mismatchesOf = async (
  folder: string,
  checks: readonly Check[],
): Promise<Map<string, Mismatch[]>> => {
  const files = new Map<string, Map<string, CellValue>>();
  const found = new Map<string, Mismatch[]>();

  for (const check of checks) {
    const values = files.get(check.file) ?? (await libreValues(folder, check.file));

    files.set(check.file, values);
    recorded(found, check, values.get(`${check.sheet}!${formatCell(check)}`));
  }
  return found;
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
  const mismatches = await mismatchesOf(folder, checks);
  const known = knownDifferences();
  const keys = new Set(checks.map((check) => check.key));
  const fresh = [...mismatches].filter(([key]) => !known.has(key));
  const stale = [...known.keys()].filter((key) => keys.has(key) && !mismatches.has(key));

  console.log(
    `${version}: ${String(keys.size)} cases, ${String(checks.length)} cells; ${String(keys.size - mismatches.size)} agree, ${String(mismatches.size - fresh.length)} known, ${String(fresh.length)} new; ${String(skipped)} skipped (Russian locale, clock and random)`,
  );

  fresh.forEach(([key, list]) => {
    console.log(`new  ${key}`);

    list.forEach((item) => {
      console.log(
        `       ${item.cell}: wanted ${JSON.stringify(item.wanted)}, LibreOffice ${JSON.stringify(item.found ?? null)}`,
      );
    });
  });

  stale.forEach((key) => {
    console.log(`agrees now, drop from known.json: ${key}`);
  });

  rmSync(folder, { recursive: true, force: true });
  process.exitCode = fresh.length > 0 || stale.length > 0 ? 1 : 0;
};

await run();
