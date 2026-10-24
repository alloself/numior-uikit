// @vitest-environment node
import { renderToString } from '@vue/test-utils';
import { describe, expect, it } from 'vite-plus/test';
import { NuiSpreadsheet } from '../src';
import { createWorkbook, textValue } from '../src/core';

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
});
