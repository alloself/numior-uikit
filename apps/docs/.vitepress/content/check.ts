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
  files
    .filter((file) => file.endsWith('.vue') || file.endsWith('.md'))
    .filter((file) => /<style[\s>]/.test(readFileSync(file, 'utf8')))
    .map((file) => `${relative(root, file)}: has a <style> block`);

const proseProblems = (root: string, files: readonly string[]): string[] =>
  files
    .filter((file) => file.endsWith('.md'))
    .map((file) => relative(root, file))
    .filter((page) => !PENDING_PAGES.includes(page))
    .flatMap((page) =>
      lintProse(readFileSync(join(root, page), 'utf8'), page.startsWith('en/') ? 'en' : 'ru').map(
        (problem) => `${page}:${problem.line}: ${problem.rule} — ${problem.text}`,
      ),
    );

export const checkContent = (root: string): string[] => {
  const files = walk(root);

  return [...styleProblems(root, files), ...proseProblems(root, files)];
};

const UNRESOLVED_RE = /<(?:Nui[A-Za-z]*|Example|ApiReference|Configurator)\b/;

export const checkDist = (dist: string): string[] =>
  walk(dist)
    .filter((file) => file.endsWith('.html'))
    .filter((file) => UNRESOLVED_RE.test(readFileSync(file, 'utf8')))
    .map((file) => `${relative(dist, file)}: has an unresolved component tag`);
