import type { HeadConfig } from 'vitepress';
import type { ExampleLocale } from './examples/example.types.ts';
import { absoluteUrl, repositoryUrl } from './theme/site.ts';
import type { DocsSite } from './theme/theme.types.ts';

export interface StructuredPage {
  readonly locale: ExampleLocale;
  readonly url: string;
  readonly home: string;
  readonly title: string;
  readonly description: string;
  readonly image: string | undefined;
}

const SITE_NAME = 'Numior UI';
const STUDIO_NAME = 'Numior';
const LOGO = 'icon-512.png';
const LICENSE = 'https://opensource.org/licenses/MIT';
const SCRIPT_CLOSE_RE = /</g;

const idsOf = (origin: string) => ({
  website: `${origin}/#website`,
  organization: `${origin}/#organization`,
  software: `${origin}/#software`,
});

const homeGraph = (site: DocsSite, origin: string, page: StructuredPage): object[] => {
  const ids = idsOf(origin);
  const repository = repositoryUrl(site);

  return [
    {
      '@type': 'WebSite',
      '@id': ids.website,
      url: page.home,
      name: SITE_NAME,
      description: page.description,
      inLanguage: page.locale,
      publisher: { '@id': ids.organization },
    },
    {
      '@type': 'Organization',
      '@id': ids.organization,
      name: STUDIO_NAME,
      url: `${origin}/`,
      logo: absoluteUrl(site, LOGO),
      ...(repository === undefined ? {} : { sameAs: [repository] }),
    },
    {
      '@type': 'SoftwareSourceCode',
      '@id': ids.software,
      name: SITE_NAME,
      description: page.description,
      url: page.home,
      ...(repository === undefined ? {} : { codeRepository: repository }),
      programmingLanguage: 'TypeScript',
      runtimePlatform: 'Vue 3.5+',
      license: LICENSE,
      author: { '@id': ids.organization },
      ...(page.image === undefined ? {} : { image: page.image }),
    },
  ];
};

const articleGraph = (origin: string, page: StructuredPage): object[] => {
  const ids = idsOf(origin);

  return [
    {
      '@type': 'TechArticle',
      '@id': `${page.url}#article`,
      url: page.url,
      headline: page.title,
      description: page.description,
      inLanguage: page.locale,
      isPartOf: { '@id': ids.website },
      about: { '@id': ids.software },
      publisher: { '@id': ids.organization },
      ...(page.image === undefined ? {} : { image: page.image }),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: page.home },
        { '@type': 'ListItem', position: 2, name: page.title, item: page.url },
      ],
    },
  ];
};

export const structuredDataOf = (site: DocsSite, page: StructuredPage): HeadConfig[] => {
  const origin = absoluteUrl(site, '')?.replace(/\/$/u, '');

  if (origin === undefined) {
    return [];
  }

  const graph = page.url === page.home ? homeGraph(site, origin, page) : articleGraph(origin, page);
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });

  return [['script', { type: 'application/ld+json' }, json.replaceAll(SCRIPT_CLOSE_RE, '\\u003c')]];
};
