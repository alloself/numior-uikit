import { TsvChar, type NuiTableClipboardData } from './table.types';

interface TsvState {
  readonly rows: string[][];
  row: string[];
  field: string;
  quoted: boolean;
}

interface CsvLineOptions {
  readonly formulas?: boolean | undefined;
}

const QUOTED = /[\t\n\r"]/;

const FORMULA_START = /^[=@\t\r]/;

const SIGN_START = /^[+-]/;

const SIGNED_NUMBER = /^[+-][\d\s.,']*\d%?$/;

const ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

const tsvField = (text: string): string =>
  QUOTED.test(text) ? `"${text.replaceAll('"', '""')}"` : text;

export const tsvOf = (lines: readonly (readonly string[])[]): string =>
  lines.map((cells) => cells.map(tsvField).join('\t')).join('\n');

const htmlText = (text: string): string =>
  text.replaceAll(/[&<>"]/g, (char) => ENTITIES[char] ?? char);

const htmlRow = (cells: readonly string[], tag: 'th' | 'td'): string =>
  `<tr>${cells.map((cell) => `<${tag}>${htmlText(cell)}</${tag}>`).join('')}</tr>`;

export const htmlOf = (
  header: readonly string[] | undefined,
  lines: readonly (readonly string[])[],
): string => {
  const head = header === undefined ? '' : `<thead>${htmlRow(header, 'th')}</thead>`;

  return `<table>${head}<tbody>${lines.map((cells) => htmlRow(cells, 'td')).join('')}</tbody></table>`;
};

export const clipboardDataOf = (
  lines: readonly (readonly string[])[],
  header?: readonly string[],
): NuiTableClipboardData => ({
  text: tsvOf(header === undefined ? lines : [header, ...lines]),
  html: htmlOf(header, lines),
});

const endField = (state: TsvState): void => {
  state.row.push(state.field);
  state.field = '';
};

const endRow = (state: TsvState): void => {
  endField(state);
  state.rows.push(state.row);
  state.row = [];
};

const quotedStep = (state: TsvState, char: string, next: string | undefined): number => {
  if (char !== TsvChar.Quote) {
    state.field += char;
    return 0;
  }
  if (next === TsvChar.Quote) {
    state.field += TsvChar.Quote;
    return 1;
  }
  state.quoted = false;
  return 0;
};

const plainStep = (state: TsvState, char: string, next: string | undefined): number => {
  switch (char) {
    case TsvChar.Quote:
      state.quoted = state.field === '';
      state.field += state.quoted ? '' : char;
      return 0;
    case TsvChar.Tab:
      endField(state);
      return 0;
    case TsvChar.Return:
      endRow(state);
      return next === TsvChar.Newline ? 1 : 0;
    case TsvChar.Newline:
      endRow(state);
      return 0;
    default:
      state.field += char;
      return 0;
  }
};

export const parseTsv = (text: string): string[][] => {
  const state: TsvState = { rows: [], row: [], field: '', quoted: false };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? '';
    const next = text[index + 1];

    index += state.quoted ? quotedStep(state, char, next) : plainStep(state, char, next);
  }
  if (state.field !== '' || state.row.length > 0) {
    endRow(state);
  }
  return state.rows;
};

const quoted = (text: string, separator: string): string =>
  text.includes(separator) || /["\r\n]/.test(text) || text.trim() !== text
    ? `"${text.replaceAll('"', '""')}"`
    : text;

const runsAsFormula = (text: string): boolean =>
  FORMULA_START.test(text) || (SIGN_START.test(text) && !SIGNED_NUMBER.test(text));

const csvField = (text: string, separator: string, formulas: boolean): string =>
  quoted(!formulas && runsAsFormula(text) ? `'${text}` : text, separator);

export const csvLine = (
  cells: readonly string[],
  separator: string,
  { formulas = false }: CsvLineOptions = {},
): string => cells.map((cell) => csvField(cell, separator, formulas)).join(separator);
