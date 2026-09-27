import { describe, expect, it } from 'vitest';
import { tocItemsOf } from '../.vitepress/theme/toc-items';

describe('docs table of contents', () => {
  it('nests third-level headers under the previous second-level one and drops the rest', () => {
    const items = tocItemsOf([
      { level: 3, title: 'Сирота', slug: 'сирота', link: '#сирота', children: [] },
      { level: 2, title: 'Размеры', slug: 'размеры', link: '#размеры', children: [] },
      { level: 3, title: 'Компактный', slug: 'компактный', link: '#компактный', children: [] },
      { level: 4, title: 'Глубже', slug: 'глубже', link: '#глубже', children: [] },
      { level: 2, title: 'API', slug: 'api', link: '#api', children: [] },
    ]);

    expect(items).toEqual([
      {
        id: 'размеры',
        label: 'Размеры',
        children: [{ id: 'компактный', label: 'Компактный', children: [] }],
      },
      { id: 'api', label: 'API', children: [] },
    ]);
  });
});
