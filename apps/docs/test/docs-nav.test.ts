import { describe, expect, it } from 'vite-plus/test';
import { DocsNavDriver } from './drivers/docs-nav';

const SECTIONS = ['Документация', 'Компоненты', 'Таблица', 'Книга', 'Блоки'].map((text, index) => ({
  text,
  link: `/section-${index}`,
  current: text === 'Книга',
}));

describe('DocsNav', () => {
  it('shows every section while the row has room for them', async () => {
    const nav = DocsNavDriver.mount(SECTIONS, SECTIONS.length);

    await nav.measured();

    expect(nav.visible).toEqual(['Документация', 'Компоненты', 'Таблица', 'Книга', 'Блоки']);
    expect(nav.current).toEqual(['Книга']);
    expect(nav.hasMore).toBe(false);

    nav.unmount();
  });

  it('moves the sections that wrapped to the next row into the menu', async () => {
    const nav = DocsNavDriver.mount(SECTIONS, 3);

    await nav.measured();

    expect(nav.visible).toEqual(['Документация', 'Компоненты', 'Таблица']);
    expect(nav.hasMore).toBe(true);

    await nav.openMore();
    expect(nav.overflowed).toEqual(['Книга', 'Блоки']);

    nav.unmount();
  });
});
