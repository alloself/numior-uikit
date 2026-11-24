import type { HeadConfig } from 'vitepress';
import { leadTextOf } from './content/page-guards.ts';
import type { ExampleLocale } from './examples/example.types.ts';
import { structuredDataOf } from './structured-data.ts';
import { absoluteUrl } from './theme/site.ts';
import type { DocsSite } from './theme/theme.types.ts';

export interface PageMeta {
  readonly relativePath: string;
  readonly title: string;
  readonly description: string;
  readonly pages: readonly string[];
  readonly twin?: string | undefined;
}

export interface PageSource {
  readonly relativePath: string;
  readonly title: string;
  readonly markdown: string;
  readonly head: unknown;
  readonly pages: readonly string[];
  readonly twins: ReadonlySet<string>;
  readonly descriptions: Readonly<Record<ExampleLocale, string>>;
}

export interface PageDescription {
  readonly description: string;
  readonly head: HeadConfig[];
}

const SITE_NAME = 'Numior UI';
const EN_PREFIX = 'en/';
const DEFAULT_LOCALE: ExampleLocale = 'ru';
const OG_LOCALES = { ru: 'ru_RU', en: 'en_US' } as const;
const COVER = { width: '1200', height: '630', type: 'image/png' } as const;

const COVER_ALT = {
  ru: 'Numior UI — UI-кит для Vue 3',
  en: 'Numior UI, a UI kit for Vue 3',
} as const;

const LINK_RE = /\[([^\]]*)\]\([^)]*\)/g;
const MARKUP_RE = /<[^>]+>|[`*_]/g;

const localeOfPage = (relativePath: string): ExampleLocale =>
  relativePath.startsWith(EN_PREFIX) ? 'en' : 'ru';

const otherLocale = (locale: ExampleLocale): ExampleLocale => (locale === 'ru' ? 'en' : 'ru');

const pageOf = (relativePath: string, locale: ExampleLocale): string => {
  const tail = relativePath.startsWith(EN_PREFIX)
    ? relativePath.slice(EN_PREFIX.length)
    : relativePath;

  return locale === 'en' ? `${EN_PREFIX}${tail}` : tail;
};

export const routeOf = (relativePath: string): string =>
  `/${relativePath.replace(/(^|\/)index\.md$/u, '$1').replace(/\.md$/u, '')}`;

export const descriptionOf = (markdown: string, fallback: string): string => {
  const lead = leadTextOf(markdown);

  return lead === undefined
    ? fallback
    : lead.replaceAll(LINK_RE, '$1').replaceAll(MARKUP_RE, '').replaceAll(/\s+/g, ' ').trim();
};

const alternatesOf = (meta: PageMeta): ExampleLocale[] => {
  const locale = localeOfPage(meta.relativePath);
  const other = otherLocale(locale);

  return meta.pages.includes(pageOf(meta.relativePath, other)) ? [locale, other] : [locale];
};

const addressHead = (site: DocsSite, meta: PageMeta): HeadConfig[] => {
  const url = absoluteUrl(site, routeOf(meta.relativePath));

  if (url === undefined) {
    return [];
  }

  const locales = alternatesOf(meta);

  const alternates = locales.reduce<HeadConfig[]>((links, locale) => {
    const href = absoluteUrl(site, routeOf(pageOf(meta.relativePath, locale)));

    if (href !== undefined) {
      links.push(['link', { rel: 'alternate', hreflang: locale, href }]);
    }
    if (href !== undefined && locale === DEFAULT_LOCALE) {
      links.push(['link', { rel: 'alternate', hreflang: 'x-default', href }]);
    }
    return links;
  }, []);

  return [
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:url', content: url }],
    ...(locales.length > 1 ? alternates : []),
  ];
};

const coverHead = (site: DocsSite, locale: ExampleLocale): HeadConfig[] => {
  const image = absoluteUrl(site, `og-cover-${locale}.png`);

  if (image === undefined) {
    return [['meta', { name: 'twitter:card', content: 'summary' }]];
  }

  return [
    ['meta', { property: 'og:image', content: image }],
    ['meta', { property: 'og:image:width', content: COVER.width }],
    ['meta', { property: 'og:image:height', content: COVER.height }],
    ['meta', { property: 'og:image:type', content: COVER.type }],
    ['meta', { property: 'og:image:alt', content: COVER_ALT[locale] }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: image }],
  ];
};

const structuredHead = (site: DocsSite, meta: PageMeta, title: string): HeadConfig[] => {
  const locale = localeOfPage(meta.relativePath);
  const url = absoluteUrl(site, routeOf(meta.relativePath));
  const home = absoluteUrl(site, routeOf(pageOf('index.md', locale)));

  if (url === undefined || home === undefined) {
    return [];
  }

  return structuredDataOf(site, {
    locale,
    url,
    home,
    title,
    description: meta.description,
    image: absoluteUrl(site, `og-cover-${locale}.png`),
  });
};

const twinHead = (meta: PageMeta): HeadConfig[] =>
  meta.twin === undefined
    ? []
    : [['link', { rel: 'alternate', type: 'text/markdown', href: meta.twin }]];

export const pageHead = (site: DocsSite, meta: PageMeta): HeadConfig[] => {
  const locale = localeOfPage(meta.relativePath);
  const title = meta.title === '' || meta.title === SITE_NAME ? SITE_NAME : meta.title;

  return [
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: meta.description }],
    ['meta', { property: 'og:locale', content: OG_LOCALES[locale] }],
    ...alternatesOf(meta)
      .slice(1)
      .map<HeadConfig>((other) => [
        'meta',
        { property: 'og:locale:alternate', content: OG_LOCALES[other] },
      ]),
    ...coverHead(site, locale),
    ...twinHead(meta),
    ...addressHead(site, meta),
    ...structuredHead(site, meta, title),
  ];
};

const ownHead = (head: unknown): HeadConfig[] => (Array.isArray(head) ? head : []);

export const describePage = (site: DocsSite, source: PageSource): PageDescription => {
  const description = descriptionOf(
    source.markdown,
    source.descriptions[localeOfPage(source.relativePath)],
  );

  return {
    description,
    head: [
      ...ownHead(source.head),
      ...pageHead(site, {
        relativePath: source.relativePath,
        title: source.title,
        description,
        pages: source.pages,
        twin: source.twins.has(source.relativePath) ? `/${source.relativePath}` : undefined,
      }),
    ],
  };
};
