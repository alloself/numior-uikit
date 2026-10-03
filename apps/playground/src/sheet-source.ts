import {
  columnName,
  type NuiTableCellSource,
  type NuiTableCellStyle,
  type NuiTableSourceCell,
} from '@numior/table';

export const SHEET_ROWS = 1_048_576;
export const SHEET_COLS = 16_384;

const LEDGER_ROWS = 500;
const LEDGER_COLS = 30;
const MARK_ROWS = 1000;
const MARK_COLS = 100;

const HEAD: NuiTableCellStyle = {
  fill: 'var(--nui-surface-muted)',
  style: { 'font-weight': 'var(--nui-font-weight-semibold)' },
};

const NUMBER: NuiTableCellStyle = { align: 'end' };
const numbers = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

const ledgerCell = (row: number, col: number): NuiTableSourceCell =>
  row === 0
    ? { text: `Показатель ${columnName(col)}`, style: HEAD }
    : { text: numbers.format(((row * 31 + col * 17) % 1000) / 10), style: NUMBER };

const inLedger = (row: number, col: number): boolean => row < LEDGER_ROWS && col < LEDGER_COLS;

const isMark = (row: number, col: number): boolean =>
  row % MARK_ROWS === 0 && col % MARK_COLS === 0;

const markCell = (row: number, col: number): NuiTableSourceCell | undefined =>
  isMark(row, col) ? { text: `${columnName(col)}${row + 1}` } : undefined;

export const bigSheet: NuiTableCellSource = {
  rows: SHEET_ROWS,
  cols: SHEET_COLS,
  cellAt: (row, col) => (inLedger(row, col) ? ledgerCell(row, col) : markCell(row, col)),
};
