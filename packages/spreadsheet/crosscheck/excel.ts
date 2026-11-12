import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWorkbook, writeWorkbook } from '@numior/spreadsheet/xlsx';
import { functionCorpora } from '../test/function-corpus.ts';
import {
  caseBook,
  knownDifferences,
  localeOf,
  mismatchesOf,
  printMismatches,
  splitKnown,
  valuesOf,
  type BookCase,
  type CaseBook,
} from './books.ts';

const HERE = fileURLToPath(new URL('.', import.meta.url));

const FILE = 'functions';

const EXCEL_TOLERANCE = 1e-12;

const SKIPPED_FAMILIES = new Set(['volatile']);

const USAGE =
  'usage: corpus:excel export <file.xlsx> <en|ru> | check <file.xlsx> <en|ru> — the language of your Excel';

const knownFile = (language: 'en' | 'ru'): string => `excel-known-${language}.json`;

const casesIn = (language: 'en' | 'ru'): BookCase[] =>
  functionCorpora().flatMap((corpus) =>
    SKIPPED_FAMILIES.has(corpus.family)
      ? []
      : corpus.cases.reduce<BookCase[]>((found, entry, index) => {
          if (entry.locale === language) {
            found.push({
              corpus,
              entry,
              sheet: `${corpus.family.slice(0, 20)} ${String(index + 1)}`,
            });
          }
          return found;
        }, []),
  );

const bookIn = (language: 'en' | 'ru'): CaseBook =>
  caseBook(casesIn(language), FILE, EXCEL_TOLERANCE, localeOf(language));

const exported = async (path: string, language: 'en' | 'ru'): Promise<void> => {
  const { book, calculator, checks } = bookIn(language);
  const written = await writeWorkbook(book, calculator, { recalculateOnOpen: true });

  if (!written.ok) {
    throw new Error('the case book was refused by the writer');
  }
  writeFileSync(path, written.bytes);

  console.log(
    `${path}: ${String(book.sheets.length)} cases, ${String(checks.length)} cells. Open it in Excel, let it recalculate, save it as .xlsx and run: corpus:excel check <saved file> ${language}`,
  );
};

const checked = async (path: string, language: 'en' | 'ru'): Promise<void> => {
  const read = await readWorkbook(new Uint8Array(readFileSync(path)), { recalc: 'none' });

  if (read.kind === 'rejected') {
    throw new Error(`${path} was rejected: ${read.reason}`);
  }

  const { checks } = bookIn(language);
  const values = valuesOf(read);
  const mismatches = await mismatchesOf(checks, () => Promise.resolve(values), false);
  const keys = new Set(checks.map((check) => check.key));
  const file = knownFile(language);
  const { fresh, stale } = splitKnown(mismatches, knownDifferences(join(HERE, file)), checks);

  console.log(
    `Excel values: ${String(keys.size)} cases; ${String(keys.size - mismatches.size)} agree with the corpus, ${String(mismatches.size - fresh.length)} known, ${String(fresh.length)} new`,
  );

  printMismatches(fresh, 'Excel');

  stale.forEach((key) => {
    console.log(`agrees now, drop from ${file}: ${key}`);
  });

  process.exitCode = fresh.length > 0 || stale.length > 0 ? 1 : 0;
};

const [command, path, language] = process.argv.slice(2);

if (path === undefined || (language !== 'en' && language !== 'ru')) {
  console.log(USAGE);
  process.exitCode = 1;
} else if (command === 'export') {
  await exported(path, language);
} else if (command === 'check') {
  await checked(path, language);
} else {
  console.log(USAGE);
  process.exitCode = 1;
}
