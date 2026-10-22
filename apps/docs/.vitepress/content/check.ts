import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { lintProse } from './prose-lint.ts';
import { PENDING_PAGES } from './pending.ts';

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
  /<(?:Nui[A-Za-z]*|Example|ApiReference|Configurator|SignatureReference|KeyboardReference)\b/;

export const checkDist = (dist: string): string[] =>
  walk(dist).reduce<string[]>((found, file) => {
    if (file.endsWith('.html') && UNRESOLVED_RE.test(readFileSync(file, 'utf8'))) {
      found.push(`${relative(dist, file)}: has an unresolved component tag`);
    }
    return found;
  }, []);
