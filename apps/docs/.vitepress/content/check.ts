import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { llmsPaths } from '../llms/paths.ts';
import { ROBOTS } from '../robots.ts';
import { lintProse } from './prose-lint.ts';
import { PENDING_PAGES } from './pending.ts';
import type { DocsSite } from '../theme/theme.types.ts';

const SKIPPED_DIRS = new Set(['node_modules', '.reference', 'cache', 'dist']);

const walk = (dir: string): string[] =>
  readdirSync(dir)
    .toSorted()
    .flatMap((name) => {
      const path = join(dir, name);

      if (statSync(path).isDirectory()) {
        return SKIPPED_DIRS.has(name) ? [] : walk(path);
      }
      return [path];
    });

const styleProblems = (root: string, files: readonly string[]): string[] =>
  files.reduce<string[]>((found, file) => {
    if (
      (file.endsWith('.vue') || file.endsWith('.md')) &&
      /<style[\s>]/.test(readFileSync(file, 'utf8'))
    ) {
      found.push(`${relative(root, file)}: has a <style> block`);
    }
    return found;
  }, []);

const COMPONENT_PAGE_RE = /^(?:en\/)?components\/[^/]+\.md$/;
const ATTRIBUTE_MUSTACHE_RE = /=\s*"[^"]*\{\{/;

const STRUCTURE_RULES: ReadonlyArray<readonly [(source: string) => boolean, string]> = [
  [(source) => /<Example\s+name=/.test(source), 'no hero <Example>'],
  [(source) => /^## (?:Установка|Installation)\s*$/m.test(source), 'no installation section'],
  [(source) => /<ApiReference\s/.test(source), 'no <ApiReference>'],
  [(source) => !ATTRIBUTE_MUSTACHE_RE.test(source), 'mustaches inside an attribute value'],
  [(source) => !source.includes('vp-raw'), 'old vp-raw demo markup'],
];

export const structureProblemsOf = (page: string, source: string): string[] =>
  COMPONENT_PAGE_RE.test(page)
    ? STRUCTURE_RULES.reduce<string[]>((found, [passes, text]) => {
        if (!passes(source)) {
          found.push(`${page}: ${text}`);
        }
        return found;
      }, [])
    : [];

const pageProblems = (root: string, files: readonly string[]): string[] =>
  files.reduce<string[]>((found, file) => {
    if (!file.endsWith('.md')) {
      return found;
    }
    const page = relative(root, file);

    if (PENDING_PAGES.includes(page)) {
      return found;
    }
    const source = readFileSync(join(root, page), 'utf8');

    found.push(
      ...structureProblemsOf(page, source),
      ...lintProse(source, page.startsWith('en/') ? 'en' : 'ru').map(
        (problem) => `${page}:${problem.line}: ${problem.rule} — ${problem.text}`,
      ),
    );

    return found;
  }, []);

export const checkContent = (root: string): string[] => {
  const files = walk(root);

  return [...styleProblems(root, files), ...pageProblems(root, files)];
};

const UNRESOLVED_RE =
  /<(?:Nui[A-Za-z]*|Example|Block|ApiReference|Configurator|SignatureReference|KeyboardReference)\b/;

const NOT_FOUND_PAGE = '404.html';
const SITEMAP = 'sitemap.xml';
const DESCRIPTION_RE = /<meta name="description" content="[^"]+">/;
const PREVIEW_TITLE_RE = /<meta property="og:title" content="[^"]+">/;
const ADDRESS_RE = /rel="canonical"|property="og:url"|hreflang="/;
const CANONICAL_RE = /rel="canonical"/;
const COVER_RE = /<meta property="og:image" content="https:\/\/[^"]+">/;
const STRUCTURED_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
const EDIT_LINK_RE = /href="[^"]*\/edit\/[^"]*\/apps\/docs\//;
const FOOTER_RE = /<footer[\s\S]*?<\/footer>/;
const REPOSITORY_LINK_RE = /GitHub/;

const metaProblems = (html: string): string[] => [
  ...(DESCRIPTION_RE.test(html) ? [] : ['has no description']),
  ...(PREVIEW_TITLE_RE.test(html) ? [] : ['has no title for link previews']),
];

const addressProblems = (page: string, html: string, site: DocsSite): string[] => {
  if (site.siteUrl.trim() === '') {
    return ADDRESS_RE.test(html) ? ['has an address although the site address is not set'] : [];
  }
  return page === NOT_FOUND_PAGE || CANONICAL_RE.test(html) ? [] : ['has no canonical address'];
};

const parsesAsJson = (text: string): boolean => {
  try {
    JSON.parse(text);
  } catch {
    return false;
  }

  return true;
};

const structuredProblems = (html: string): string[] => {
  const structured = STRUCTURED_RE.exec(html)?.[1];

  if (structured === undefined) {
    return ['has no structured data'];
  }

  return parsesAsJson(structured) ? [] : ['has structured data that is not JSON'];
};

const previewProblems = (page: string, html: string, site: DocsSite): string[] => {
  if (site.siteUrl.trim() === '' || page === NOT_FOUND_PAGE) {
    return [];
  }

  return [
    ...(COVER_RE.test(html) ? [] : ['has no image for link previews']),
    ...structuredProblems(html),
  ];
};

const repositoryProblems = (html: string, site: DocsSite): string[] => {
  if (site.repository.trim() !== '') {
    return [];
  }
  return [
    ...(EDIT_LINK_RE.test(html) ? ['has an edit link although the repository is not set'] : []),
    ...(REPOSITORY_LINK_RE.test(FOOTER_RE.exec(html)?.[0] ?? '')
      ? ['links to GitHub in the footer although the repository is not set']
      : []),
  ];
};

export const pageDistProblems = (page: string, html: string, site: DocsSite): string[] => [
  ...(UNRESOLVED_RE.test(html) ? ['has an unresolved component tag'] : []),
  ...(page === NOT_FOUND_PAGE ? [] : metaProblems(html)),
  ...addressProblems(page, html, site),
  ...previewProblems(page, html, site),
  ...repositoryProblems(html, site),
];

export const addressFileProblems = (dist: string, site: DocsSite, file: string): string[] => {
  const published = site.siteUrl.trim() !== '';
  const written = existsSync(join(dist, file));

  if (published === written) {
    return [];
  }
  return [
    published
      ? `${file}: is missing although the site address is set`
      : `${file}: is written although the site address is not set`,
  ];
};

export const llmsDistProblems = (dist: string, paths: readonly string[]): string[] =>
  paths.reduce<string[]>((found, path) => {
    if (!existsSync(join(dist, path))) {
      found.push(`${path}: the Markdown copy for language models is missing`);
    }
    return found;
  }, []);

export const checkDist = (dist: string, site: DocsSite): string[] =>
  walk(dist).reduce<string[]>(
    (found, file) => {
      if (file.endsWith('.html')) {
        const page = relative(dist, file);

        found.push(
          ...pageDistProblems(page, readFileSync(file, 'utf8'), site).map(
            (problem) => `${page}: ${problem}`,
          ),
        );
      }
      return found;
    },
    [
      ...addressFileProblems(dist, site, SITEMAP),
      ...addressFileProblems(dist, site, ROBOTS),
      ...llmsDistProblems(dist, llmsPaths()),
    ],
  );
