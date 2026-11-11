import { describe, expect, it } from 'vite-plus/test';
import { suggestionsOf } from '../.vitepress/theme/suggestions';

const LINKS = [
  { text: 'Начало работы', link: '/guide/getting-started' },
  { text: 'Button', link: '/components/button' },
  { text: 'Date picker', link: '/components/date-picker' },
  { text: 'Date range picker', link: '/components/date-range-picker' },
  { text: 'Toggle group', link: '/components/toggle-group' },
];

describe('pages suggested for a missing address', () => {
  it('finds the page whose address differs by a typo', () => {
    expect(suggestionsOf('/components/buton', LINKS)).toEqual([
      { text: 'Button', link: '/components/button' },
    ]);

    expect(suggestionsOf('/guide/geting-started.html', LINKS)).toEqual([
      { text: 'Начало работы', link: '/guide/getting-started' },
    ]);
  });

  it('looks at the last part of the address whatever section it was typed under', () => {
    expect(suggestionsOf('/docs/old/date-picker/', LINKS).map((item) => item.text)).toEqual([
      'Date picker',
      'Date range picker',
    ]);
  });

  it('caps the list and stays empty for the root and for an unknown word', () => {
    expect(suggestionsOf('/components/date', LINKS, 1)).toHaveLength(1);
    expect(suggestionsOf('/', LINKS)).toEqual([]);
    expect(suggestionsOf('/components/zzzzzz', LINKS)).toEqual([]);
  });
});
