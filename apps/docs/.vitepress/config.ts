import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHighlighter } from 'shiki';
import tailwindcss from '@tailwindcss/vite';
import { defineConfigWithTheme } from 'vitepress';
import { colorSchemeScript } from '@numior/primitives';
import { CODE_LANGUAGES, docsMarkdown } from './markdown';
import { headingPermalink } from './markdown/anchors';
import { docsDemo, demoRootOf } from './examples/demo';
import { docsExamples } from './examples/plugin';
import { isEnglishPage } from './markdown/env';
import { descriptionOf, localeOfPage, pageHead } from './meta';
import { navOf, sidebarOf } from './navigation';
import { parseBundle } from './reference/bundle';
import { docsReference } from './reference/plugin';
import { sourceCssAliases } from '../../../scripts/source-css';
import { apiSearchText } from './reference/search-text';
import type { DocsSearchOptions } from './theme/theme.types';
import { ACCENT_STORAGE_KEY, accentScript } from './theme/composables/use-accent';
import { searchFields } from './theme/search-index';
import { absoluteUrl, site } from './theme/site';
import { en, ru } from './theme/texts';
import type { DocsThemeConfig } from './theme/theme.types';

const examplesRoot = fileURLToPath(new URL('../examples', import.meta.url));
const bundleFile = fileURLToPath(new URL('../.reference/bundle.json', import.meta.url));
const bundle = existsSync(bundleFile) ? parseBundle(readFileSync(bundleFile, 'utf8')) : undefined;

const searchOptions: DocsSearchOptions = {
  miniSearch: { options: searchFields() },
  _render: (source, env, md) =>
    md.render(
      bundle === undefined
        ? source
        : source + apiSearchText(bundle, source, isEnglishPage(env) ? 'en' : 'ru'),
      env,
    ),
};

const origin = absoluteUrl(site, '');
const descriptions = { ru: ru.description, en: en.description } as const;

const highlighter = await createHighlighter({
  themes: ['github-light'],
  langs: [...CODE_LANGUAGES],
});

export default defineConfigWithTheme<DocsThemeConfig>({
  title: 'Numior UI',
  description: en.description,
  cleanUrls: true,
  appearance: false,
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: '48x48' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['script', {}, colorSchemeScript('nui-theme')],
    ['script', {}, accentScript(ACCENT_STORAGE_KEY)],
  ],
  ...(origin === undefined ? {} : { sitemap: { hostname: origin } }),
  transformPageData: (pageData, { siteConfig }) => {
    const file = join(siteConfig.srcDir, pageData.filePath);

    if (pageData.isNotFound === true || !existsSync(file)) {
      return undefined;
    }

    const description = descriptionOf(
      readFileSync(file, 'utf8'),
      descriptions[localeOfPage(pageData.relativePath)],
    );

    return {
      description,
      frontmatter: {
        ...pageData.frontmatter,
        head: [
          ...(Array.isArray(pageData.frontmatter.head) ? pageData.frontmatter.head : []),
          ...pageHead(site, {
            relativePath: pageData.relativePath,
            title: pageData.title,
            description,
            pages: siteConfig.pages,
          }),
        ],
      },
    };
  },
  markdown: {
    headers: { level: [2, 3] },
    anchor: { permalink: headingPermalink },
    config: (md) => docsMarkdown(md, highlighter),
  },
  vite: {
    resolve:
      process.env.NODE_ENV === 'production'
        ? {}
        : { conditions: ['@numior/source'], alias: sourceCssAliases() },
    plugins: [
      tailwindcss(),
      docsDemo(demoRootOf(examplesRoot)),
      docsExamples(examplesRoot, highlighter),
      docsReference(bundleFile, highlighter),
    ],
  },
  themeConfig: {
    nav: [],
    sidebar: {},
    texts: ru,
    search: { provider: 'local', options: searchOptions },
  },
  locales: {
    root: {
      label: 'Русский',
      lang: 'ru',
      description: ru.description,
      themeConfig: {
        nav: navOf('ru'),
        sidebar: sidebarOf('ru'),
        texts: ru,
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      description: en.description,
      themeConfig: {
        nav: navOf('en'),
        sidebar: sidebarOf('en'),
        texts: en,
      },
    },
  },
});
