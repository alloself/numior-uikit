import { describe, expect, it } from 'vite-plus/test';
import { ru } from '../.vitepress/theme/texts';
import { CopyPageDriver } from './drivers/copy-page';

const PAGES = { '/components/button.md': '# Button\n\nКнопка для действий.\n' };

describe('CopyPage', () => {
  it('asks for the Markdown copy of the page and puts it on the clipboard', async () => {
    const page = new CopyPageDriver('/components/button.md', PAGES);

    expect(page.labels).toEqual([ru.copyPage, ru.copyPage]);
    expect(page.requests).toEqual([]);

    await page.copy();

    expect(page.requests).toEqual([{ url: '/components/button.md', accept: 'text/markdown' }]);
    expect(page.copied).toEqual(['# Button\n\nКнопка для действий.\n']);
    expect(page.labels).toEqual([ru.copyPage, ru.copied]);

    page.unmount();
  });

  it('copies nothing when the page has no Markdown copy', async () => {
    const page = new CopyPageDriver('/components/unknown.md', PAGES);

    await page.copy();

    expect(page.requests).toHaveLength(1);
    expect(page.copied).toEqual([]);
    expect(page.labels).toEqual([ru.copyPage, ru.copyPage]);

    page.unmount();
  });
});
