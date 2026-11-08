import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { TopLayerStubs } from '../../vue/test/support/top-layer';
import { createStepper } from '../src/core';
import type { NuiSpreadsheetFile, NuiSpreadsheetSaved } from '../src';
import { readWorkbook, type Bytes, type XlsxRead } from '../src/xlsx';
import { SpreadsheetDriver } from './drivers/spreadsheet';
import { SALES_SHEET, xlsxPackage } from './xlsx-package';

type Opened = Extract<XlsxRead, { readonly kind: 'editable' | 'read-only' }>;

const opened = async (bytes: Bytes): Promise<Opened> => {
  const read = await readWorkbook(bytes);

  if (read.kind === 'rejected') {
    throw new Error(`rejected: ${read.reason}`);
  }
  return read;
};

const salesFile = async (name = 'Orders.xlsx'): Promise<File> =>
  new File([await xlsxPackage()], name);

const mounted: SpreadsheetDriver[] = [];

const stubs: TopLayerStubs[] = [];

const sheetOf = (...args: Parameters<typeof SpreadsheetDriver.mount>): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount(...args);

  mounted.push(driver);
  return driver;
};

const salesSheet = async (
  extra: Partial<Parameters<typeof SpreadsheetDriver.mount>[0]> = {},
  bytes?: Bytes,
): Promise<{ sheet: SpreadsheetDriver; read: Opened }> => {
  const read = await opened(bytes ?? (await xlsxPackage()));

  const sheet = sheetOf({
    book: read.book,
    calculator: read.calculator,
    source: read.source,
    label: 'Sales',
    fileBar: true,
    ...extra,
  });

  await sheet.settle();
  return { sheet, read };
};

const savedInto = (saved: NuiSpreadsheetSaved[]) => (next: NuiSpreadsheetSaved) => {
  saved.push(next);
};

beforeEach(() => {
  stubs.push(new TopLayerStubs());
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('ReadableStream', NodeReadableStream);
  vi.stubGlobal('File', NodeFile);
});

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }

  for (const stub of stubs.splice(0)) {
    stub.restore();
  }

  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('NuiSpreadsheet file', () => {
  it('saves the edited book so the file reads back with the edit', async () => {
    const saved: NuiSpreadsheetSaved[] = [];
    const { sheet } = await salesSheet({ fileName: 'Sales.xlsx', saveFile: savedInto(saved) });

    await sheet.enter(1, 1, '7');
    await sheet.pressSaveFile();

    await vi.waitFor(() => {
      expect(saved).toHaveLength(1);
    });

    const again = await opened(saved[0]?.bytes ?? new Uint8Array());
    const back = sheetOf({ book: again.book, calculator: again.calculator, label: 'Back' });

    await back.settle();

    expect(saved[0]?.name).toBe('Sales.xlsx');
    expect(back.text(1, 1)).toBe('7');
  });

  it('marks unsaved edits and clears the mark after a save', async () => {
    const saved: NuiSpreadsheetSaved[] = [];
    const { sheet } = await salesSheet({ saveFile: savedInto(saved) });

    expect(sheet.fileName).toBe('Book');
    expect(sheet.fileEdited).toBe(false);

    await sheet.enter(1, 1, '7');

    expect(sheet.fileEdited).toBe(true);

    await sheet.pressSaveFile();

    await vi.waitFor(() => {
      expect(saved).toHaveLength(1);
    });

    await sheet.settle();

    expect(saved[0]?.name).toBe('Book.xlsx');
    expect(sheet.fileEdited).toBe(false);
    expect(sheet.announcement).toBe('Saved Book.xlsx');
  });

  it('saves on Ctrl+S with the file bar', async () => {
    const saved: NuiSpreadsheetSaved[] = [];
    const { sheet } = await salesSheet({ saveFile: savedInto(saved) });

    await sheet.focus(1, 1);

    expect(await sheet.pressPrevented('s', { ctrl: true, code: 'KeyS' })).toBe(true);

    await vi.waitFor(() => {
      expect(saved).toHaveLength(1);
    });
  });

  it('leaves Ctrl+S to the browser without the file bar', async () => {
    const { sheet } = await salesSheet({ fileBar: false });

    await sheet.focus(1, 1);

    expect(await sheet.pressPrevented('s', { ctrl: true, code: 'KeyS' })).toBe(false);
  });

  it('downloads the file when no adapter is given', async () => {
    const created = vi.fn<(file: Blob) => string>(() => 'blob:book');
    const link = { name: '' };

    Object.assign(URL, {
      createObjectURL: created,
      revokeObjectURL: vi.fn<(url: string) => void>(),
    });

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function record(
      this: HTMLAnchorElement,
    ) {
      link.name = this.download;
    });

    const { sheet } = await salesSheet({ fileName: 'Sales' });

    await sheet.pressSaveFile();

    await vi.waitFor(() => {
      expect(link.name).toBe('Sales.xlsx');
    });

    expect(created).toHaveBeenCalledOnce();
  });

  it('opens a chosen file and hands the book to the application', async () => {
    const files: NuiSpreadsheetFile[] = [];

    const { sheet } = await salesSheet({
      onOpen: (file: NuiSpreadsheetFile) => {
        files.push(file);
      },
    });

    await sheet.chooseFile(await salesFile());

    await vi.waitFor(() => {
      expect(files).toHaveLength(1);
    });

    expect(files[0]?.fileName).toBe('Orders.xlsx');
    expect(files[0]?.book.sheets.map((each) => each.name)).toContain('Sales');
    expect(files[0]?.report.readOnly).toBe(false);
    expect(files[0]?.source.bytes.length).toBeGreaterThan(0);
  });

  it('names the reason when a file is refused', async () => {
    const { sheet } = await salesSheet();

    await sheet.chooseFile(new File(['plain text'], 'notes.xlsx'));

    await vi.waitFor(() => {
      expect(sheet.fileFailure).toBe('This file is not an XLSX book');
    });

    await sheet.dismissFileFailure();

    expect(sheet.fileFailure).toBeUndefined();
  });

  it('asks before another file replaces unsaved edits', async () => {
    const files: NuiSpreadsheetFile[] = [];

    const { sheet } = await salesSheet({
      onOpen: (file: NuiSpreadsheetFile) => {
        files.push(file);
      },
    });

    await sheet.enter(1, 1, '7');
    await sheet.chooseFile(await salesFile());

    expect(sheet.fileDialogTitle).toBe('Discard unsaved edits?');
    expect(files).toHaveLength(0);

    await sheet.dismissFileDialog();

    expect(sheet.fileDialogOpen).toBe(false);

    await sheet.chooseFile(await salesFile());
    await sheet.confirmFileDialog();

    await vi.waitFor(() => {
      expect(files).toHaveLength(1);
    });
  });

  it('lists what a save would lose and saves only after the answer', async () => {
    const saved: NuiSpreadsheetSaved[] = [];

    const scenarios =
      '<scenarios><scenario name="Low" count="1"><inputCell r="B2" val="1"/></scenario></scenarios><mergeCells';

    const bytes = await xlsxPackage({
      'xl/worksheets/sheet1.xml': SALES_SHEET.replace('<mergeCells', scenarios),
    });

    const { sheet, read } = await salesSheet({ saveFile: savedInto(saved) }, bytes);

    createStepper(read.book, read.calculator).apply({
      kind: 'insertLines',
      sheet: 'Sales',
      axis: 'rows',
      at: 10,
      count: 1,
    });

    await sheet.pressSaveFile();

    await vi.waitFor(() => {
      expect(sheet.fileDialogOpen).toBe(true);
    });

    expect(sheet.fileDialogTitle).toBe('Save with losses?');

    expect(sheet.fileDialogLines).toEqual([
      'Sales: rows or columns moved, so unsupported items tied to cells are dropped',
    ]);

    expect(saved).toHaveLength(0);

    await sheet.confirmFileDialog();

    await vi.waitFor(() => {
      expect(saved).toHaveLength(1);
    });
  });

  it('reports a save the adapter could not finish and keeps the edits marked', async () => {
    const { sheet } = await salesSheet({
      saveFile: () => Promise.reject(new Error('offline')),
    });

    await sheet.enter(1, 1, '7');
    await sheet.pressSaveFile();

    await vi.waitFor(() => {
      expect(sheet.fileFailure).toBe('The book could not be saved');
    });

    expect(sheet.fileEdited).toBe(true);
  });

  it('stops reading a file on Cancel and leaves the book in place', async () => {
    const files: NuiSpreadsheetFile[] = [];
    const releases: ((bytes: ArrayBuffer) => void)[] = [];
    const file = new File([], 'Large.xlsx');

    vi.spyOn(file, 'arrayBuffer').mockImplementation(
      () =>
        new Promise<ArrayBuffer>((resolve) => {
          releases.push(resolve);
        }),
    );

    const { sheet } = await salesSheet({
      onOpen: (next: NuiSpreadsheetFile) => {
        files.push(next);
      },
    });

    await sheet.chooseFile(file);

    await vi.waitFor(() => {
      expect(releases).toHaveLength(1);
    });

    expect(sheet.fileReading).toBe(true);

    await sheet.cancelFileRead();
    releases[0]?.(new ArrayBuffer(0));

    await vi.waitFor(() => {
      expect(sheet.fileReading).toBe(false);
    });

    expect(files).toHaveLength(0);
    expect(sheet.fileFailure).toBeUndefined();
  });
});
