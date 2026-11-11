import { describe, expect, it } from 'vite-plus/test';
import { descriptionOf, pageHead, routeOf, type PageMeta } from '../.vitepress/meta';
import { site } from '../.vitepress/theme/site';

const PAGES = ['index.md', 'en/index.md', 'components/button.md', 'en/components/button.md'];
const published = { siteUrl: 'https://ui.example.org', repository: '' };

const button: PageMeta = {
  relativePath: 'en/components/button.md',
  title: 'Button',
  description: 'Starts an action.',
  pages: [...PAGES, 'guide/only-russian.md'],
};

const contentOf = (head: ReturnType<typeof pageHead>, property: string): string | undefined =>
  head.find(([, attrs]) => attrs.property === property || attrs.name === property)?.[1].content;

const hrefsOf = (head: ReturnType<typeof pageHead>, rel: string): string[] =>
  head.reduce<string[]>((hrefs, [, attrs]) => {
    if (attrs.rel === rel) {
      hrefs.push(`${attrs.hreflang ?? ''} ${attrs.href ?? ''}`.trim());
    }
    return hrefs;
  }, []);

describe('page meta', () => {
  it('turns a page file into its address', () => {
    expect(routeOf('index.md')).toBe('/');
    expect(routeOf('en/index.md')).toBe('/en/');
    expect(routeOf('en/components/button.md')).toBe('/en/components/button');
  });

  it('takes the description from the lead without markup and falls back to the site text', () => {
    const page = '# Select\n\nВыбор из [списка](/components/list) через `v-model`.\n\n## API\n';

    expect(descriptionOf(page, 'Сайт')).toBe('Выбор из списка через v-model.');
    expect(descriptionOf('---\nlayout: home\n---\n', 'Сайт')).toBe('Сайт');
  });

  it('describes the page for link previews in the language of the page', () => {
    const head = pageHead(site, button);

    expect(contentOf(head, 'og:title')).toBe('Button');
    expect(contentOf(head, 'og:description')).toBe('Starts an action.');
    expect(contentOf(head, 'og:locale')).toBe('en_US');
    expect(contentOf(head, 'og:locale:alternate')).toBe('ru_RU');
    expect(contentOf(head, 'twitter:card')).toBe('summary');
  });

  it('writes no address while the site address is not set', () => {
    const head = pageHead(site, button);

    expect(hrefsOf(head, 'canonical')).toEqual([]);
    expect(hrefsOf(head, 'alternate')).toEqual([]);
    expect(contentOf(head, 'og:url')).toBeUndefined();
  });

  it('points at the Markdown copy of the page when it has one', () => {
    const head = pageHead(site, { ...button, twin: '/en/components/button.md' });

    expect(hrefsOf(head, 'alternate')).toEqual(['/en/components/button.md']);

    expect(head).toContainEqual([
      'link',
      { rel: 'alternate', type: 'text/markdown', href: '/en/components/button.md' },
    ]);
  });

  it('points at the page and its other language once the site address is known', () => {
    const head = pageHead(published, button);

    expect(hrefsOf(head, 'canonical')).toEqual(['https://ui.example.org/en/components/button']);
    expect(contentOf(head, 'og:url')).toBe('https://ui.example.org/en/components/button');

    expect(hrefsOf(head, 'alternate')).toEqual([
      'en https://ui.example.org/en/components/button',
      'ru https://ui.example.org/components/button',
      'x-default https://ui.example.org/components/button',
    ]);
  });

  it('names no other language for a page written in one', () => {
    const head = pageHead(published, { ...button, relativePath: 'guide/only-russian.md' });

    expect(hrefsOf(head, 'alternate')).toEqual([]);
    expect(contentOf(head, 'og:locale:alternate')).toBeUndefined();
    expect(contentOf(pageHead(site, { ...button, title: '' }), 'og:title')).toBe('Numior UI');
  });
});
