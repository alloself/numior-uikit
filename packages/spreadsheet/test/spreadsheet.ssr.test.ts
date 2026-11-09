// @vitest-environment node
import { renderToString } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vite-plus/test';
import { NuiSpreadsheet } from '../src';
import {
  createCalculator,
  createWorkbook,
  createWorkbookDocument,
  textValue,
  type WorkbookDocumentListener,
} from '../src/core';

const book = createWorkbook();

book.addSheet('Sales').cells.set(0, 0, textValue('Item'));

describe('NuiSpreadsheet on the server', () => {
  it('renders the first screen of the sheet the same way twice', async () => {
    const first = await renderToString(NuiSpreadsheet, { props: { book, label: 'Sales book' } });
    const second = await renderToString(NuiSpreadsheet, { props: { book, label: 'Sales book' } });

    expect(first).toContain('class="nui-spreadsheet"');
    expect(first).toContain('Item');
    expect(first).toContain('>A<');
    expect(second).toBe(first);
  });

  it('does not listen to a shared book on the server', async () => {
    const subscribe = vi.fn<(listener: WorkbookDocumentListener) => () => void>();
    const session = createWorkbookDocument({ book, calculator: createCalculator(book) });

    const html = await renderToString(NuiSpreadsheet, {
      props: { book, label: 'Sales book', collaboration: { ...session, subscribe } },
    });

    expect(html).toContain('Item');
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('renders the file bar with the name of the file', async () => {
    const html = await renderToString(NuiSpreadsheet, {
      props: { book, label: 'Sales book', fileBar: true, fileName: 'Sales.xlsx' },
    });

    expect(html).toContain('nui-spreadsheet__file');
    expect(html).toContain('Sales.xlsx');
  });

  it('renders the limitations report of a read-only book and a hidden recalculation status', async () => {
    const html = await renderToString(NuiSpreadsheet, {
      props: {
        book,
        label: 'Sales book',
        report: {
          readOnly: true,
          staleFormulas: 0,
          items: [{ code: 'macros', severity: 'info', count: 1, sheets: [], names: [] }],
        },
      },
    });

    expect(html).toContain('The book is open read-only');
    expect(html).toContain('nui-alert--tone-warning');
    expect(html).toContain('class="nui-spreadsheet__status"');
    expect(html).not.toContain('nui-spreadsheet__status--shown');
  });
});
