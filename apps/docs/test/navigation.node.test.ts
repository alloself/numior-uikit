import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import {
  NAVIGATION,
  localized,
  navOf,
  navigationLinks,
  navigationPages,
  navigationTexts,
  sidebarOf,
} from '../.vitepress/navigation';
import type { NavSection } from '../.vitepress/theme/theme.types';

const DOCS = fileURLToPath(new URL('..', import.meta.url));
const SECTION_DIRS = ['guide', 'components', 'components/table', 'composables', 'theme', 'editor'];
const PAGE_SECTIONS = ['/blocks/'];
const INDEX_PAGE = 'index';

const SHOP: readonly NavSection[] = [
  {
    title: { ru: 'Документация', en: 'Docs' },
    prefixes: ['/guide/', '/composables/'],
    groups: [
      {
        title: { ru: 'Руководство', en: 'Guide' },
        pages: [{ link: '/guide/theming', title: { ru: 'Темы оформления', en: 'Theming' } }],
      },
      { title: 'Hooks', pages: [{ link: '/composables/toast', title: 'useToast' }] },
    ],
  },
  { title: 'Blocks', prefixes: ['/blocks/'], groups: [] },
];

const pagesOf = (dir: string): string[] =>
  readdirSync(`${DOCS}${dir}`).reduce<string[]>((links, name) => {
    const page = name.slice(0, -'.md'.length);

    if (name.endsWith('.md')) {
      links.push(`/${dir}/${page === INDEX_PAGE ? '' : page}`);
    }
    return links;
  }, []);

const fileOf = (link: string): string => (link.endsWith('/') ? `${link}${INDEX_PAGE}` : link);

const missingIn = (links: readonly string[]): string[] =>
  links.filter(
    (link) =>
      !existsSync(`${DOCS}${fileOf(link).slice(1)}.md`) ||
      !existsSync(`${DOCS}en${fileOf(link)}.md`),
  );

describe('docs navigation', () => {
  it('builds the header items and the sidebar of each locale from one record', () => {
    expect(navOf('ru', SHOP)).toEqual([
      {
        text: 'Документация',
        link: '/guide/theming',
        sections: ['/guide/', '/composables/'],
      },
    ]);

    expect(navOf('en', SHOP)).toEqual([
      {
        text: 'Docs',
        link: '/en/guide/theming',
        sections: ['/en/guide/', '/en/composables/'],
      },
    ]);

    expect(sidebarOf('en', SHOP)).toEqual({
      '/en/guide/': [
        { text: 'Guide', items: [{ text: 'Theming', link: '/en/guide/theming' }] },
        { text: 'Hooks', items: [{ text: 'useToast', link: '/en/composables/toast' }] },
      ],
      '/en/composables/': [
        { text: 'Guide', items: [{ text: 'Theming', link: '/en/guide/theming' }] },
        { text: 'Hooks', items: [{ text: 'useToast', link: '/en/composables/toast' }] },
      ],
      '/en/blocks/': [],
    });

    expect(navigationTexts('ru', SHOP)).toEqual([
      'Документация',
      'Руководство',
      'Темы оформления',
      'Hooks',
      'useToast',
      'Blocks',
    ]);

    expect(navigationLinks(SHOP)).toEqual(['/guide/theming', '/composables/toast']);

    expect(
      navOf('en', [{ title: 'Blocks', link: '/blocks/', prefixes: ['/blocks/'], groups: [] }]),
    ).toEqual([{ text: 'Blocks', link: '/en/blocks/', sections: ['/en/blocks/'] }]);

    expect(navigationPages('en', SHOP)).toEqual([
      { link: '/en/guide/theming', title: 'Theming', group: 'Guide', section: 'Docs' },
      { link: '/en/composables/toast', title: 'useToast', group: 'Hooks', section: 'Docs' },
    ]);

    expect(localized('/guide/theming', 'ru')).toBe('/guide/theming');
  });

  it('lists every page of the site once and points only at pages of both locales', () => {
    const links = navigationLinks();

    expect(links.toSorted()).toEqual(SECTION_DIRS.flatMap(pagesOf).toSorted());
    expect(new Set(links).size).toBe(links.length);
    expect(missingIn(links)).toEqual([]);

    expect(navOf('ru').map((item) => item.text)).toEqual(
      NAVIGATION.map((section) => navigationTexts('ru', [section])[0]),
    );
  });

  it('leads a section of one page without a sidebar to a page of both locales', () => {
    const pageSections = NAVIGATION.filter((section) => section.groups.length === 0);

    expect(pageSections.map((section) => section.link)).toEqual(PAGE_SECTIONS);
    expect(missingIn(PAGE_SECTIONS)).toEqual([]);
  });

  it('keeps the editor in the header and the table, spreadsheet and charts among the components', () => {
    expect(navOf('en').map((item) => item.text)).toEqual([
      'Docs',
      'Components',
      'Editor',
      'Blocks',
      'Themes',
    ]);
    expect(
      sidebarOf('en')
        ['/en/components/']?.at(-1)
        ?.items.map((item) => item.link),
    ).toEqual([
      '/en/components/table/',
      '/en/components/table/data',
      '/en/components/table/cells',
      '/en/components/table/editing',
      '/en/components/table/columns',
      '/en/components/spreadsheet',
      '/en/components/charts',
    ]);
  });
});
