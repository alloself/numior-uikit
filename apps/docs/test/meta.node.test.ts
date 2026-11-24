import { describe, expect, it } from 'vite-plus/test';
import {
  describePage,
  descriptionOf,
  pageHead,
  routeOf,
  type PageMeta,
  type PageSource,
} from '../.vitepress/meta';

const unpublished = { siteUrl: '', repository: '' };

const PAGES = ['index.md', 'en/index.md', 'components/button.md', 'en/components/button.md'];
const published = { siteUrl: 'https://ui.example.org', repository: '' };

const button: PageMeta = {
  relativePath: 'en/components/button.md',
  title: 'Button',
  description: 'Starts an action.',
  pages: [...PAGES, 'guide/only-russian.md'],
};

const select: PageSource = {
  relativePath: 'components/select.md',
  title: 'Select',
  markdown: '# Select\n\nВыбор из списка.\n\n## API\n',
  head: undefined,
  pages: PAGES,
  twins: new Set(['components/select.md']),
  descriptions: { ru: 'Сайт', en: 'Site' },
};

const contentOf = (head: ReturnType<typeof pageHead>, property: string): string | undefined =>
  head.find(([, attrs]) => attrs.property === property || attrs.name === property)?.[1].content;

const REPOSITORY = 'https://github.com/example/numior-ui';

const isGraph = (value: unknown): value is { '@graph': Record<string, unknown>[] } =>
  typeof value === 'object' &&
  value !== null &&
  '@graph' in value &&
  Array.isArray(value['@graph']);

const graphOf = (head: ReturnType<typeof pageHead>): Record<string, unknown>[] => {
  const script = head.find(
    ([tag, attrs]) => tag === 'script' && attrs.type === 'application/ld+json',
  );

  const parsed: unknown = script?.[2] === undefined ? undefined : JSON.parse(script[2]);

  return isGraph(parsed) ? parsed['@graph'] : [];
};

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
    const head = pageHead(unpublished, button);

    expect(contentOf(head, 'og:title')).toBe('Button');
    expect(contentOf(head, 'og:description')).toBe('Starts an action.');
    expect(contentOf(head, 'og:locale')).toBe('en_US');
    expect(contentOf(head, 'og:locale:alternate')).toBe('ru_RU');
    expect(contentOf(head, 'twitter:card')).toBe('summary');
  });

  it('writes no address while the site address is not set', () => {
    const head = pageHead(unpublished, button);

    expect(hrefsOf(head, 'canonical')).toEqual([]);
    expect(hrefsOf(head, 'alternate')).toEqual([]);
    expect(contentOf(head, 'og:url')).toBeUndefined();
  });

  it('points at the Markdown copy of the page when it has one', () => {
    const head = pageHead(unpublished, { ...button, twin: '/en/components/button.md' });

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

  it('shows the cover of the page language in link previews once the site address is known', () => {
    const head = pageHead(published, button);

    expect(contentOf(head, 'og:image')).toBe('https://ui.example.org/og-cover-en.png');
    expect(contentOf(head, 'og:image:width')).toBe('1200');
    expect(contentOf(head, 'og:image:height')).toBe('630');
    expect(contentOf(head, 'og:image:alt')).toBe('Numior UI, a UI kit for Vue 3');
    expect(contentOf(head, 'twitter:card')).toBe('summary_large_image');
    expect(contentOf(head, 'twitter:image')).toBe('https://ui.example.org/og-cover-en.png');
    expect(contentOf(pageHead(unpublished, button), 'og:image')).toBeUndefined();
  });

  it('describes a page as an article of the site with a way back to the home page', () => {
    const graph = graphOf(pageHead(published, button));

    expect(graph.map((node) => node['@type'])).toEqual(['TechArticle', 'BreadcrumbList']);

    expect(graph[0]).toMatchObject({
      headline: 'Button',
      description: 'Starts an action.',
      url: 'https://ui.example.org/en/components/button',
      inLanguage: 'en',
      isPartOf: { '@id': 'https://ui.example.org/#website' },
      image: 'https://ui.example.org/og-cover-en.png',
    });

    expect(graph[1]).toMatchObject({
      itemListElement: [
        { position: 1, name: 'Numior UI', item: 'https://ui.example.org/en/' },
        { position: 2, name: 'Button', item: 'https://ui.example.org/en/components/button' },
      ],
    });
  });

  it('describes the home page as the site, the studio and the library with its repository', () => {
    const home = { ...button, relativePath: 'index.md', title: 'Numior UI', description: 'Кит.' };
    const graph = graphOf(pageHead({ ...published, repository: REPOSITORY }, home));

    expect(graph.map((node) => node['@type'])).toEqual([
      'WebSite',
      'Organization',
      'SoftwareSourceCode',
    ]);

    expect(graph[0]).toMatchObject({ url: 'https://ui.example.org/', inLanguage: 'ru' });
    expect(graph[1]).toMatchObject({ name: 'Numior', sameAs: [REPOSITORY] });

    expect(graph[2]).toMatchObject({
      name: 'Numior UI',
      codeRepository: REPOSITORY,
      license: 'https://opensource.org/licenses/MIT',
    });
  });

  it('writes no structured data while the site address is not set', () => {
    expect(graphOf(pageHead(unpublished, button))).toEqual([]);
  });

  it('names no other language for a page written in one', () => {
    const head = pageHead(published, { ...button, relativePath: 'guide/only-russian.md' });

    expect(hrefsOf(head, 'alternate')).toEqual([]);
    expect(contentOf(head, 'og:locale:alternate')).toBeUndefined();

    expect(contentOf(pageHead(unpublished, { ...button, title: '' }), 'og:title')).toBe(
      'Numior UI',
    );
  });

  it('describes a page from its lead and adds the Markdown copy after the head of the page', () => {
    const robots: ReturnType<typeof pageHead>[number] = [
      'meta',
      { name: 'robots', content: 'noindex' },
    ];

    const page = describePage(unpublished, { ...select, head: [robots] });

    expect(page.description).toBe('Выбор из списка.');
    expect(page.head[0]).toEqual(robots);
    expect(contentOf(page.head, 'og:description')).toBe('Выбор из списка.');
    expect(hrefsOf(page.head, 'alternate')).toEqual(['/components/select.md']);
  });

  it('falls back to the site text of the page language and names no copy for a page without one', () => {
    const page = describePage(unpublished, {
      ...select,
      relativePath: 'en/index.md',
      markdown: '---\nlayout: home\n---\n',
    });

    expect(page.description).toBe('Site');
    expect(hrefsOf(page.head, 'alternate')).toEqual([]);
    expect(page.head[0]).toEqual(['meta', { property: 'og:type', content: 'website' }]);
  });
});
