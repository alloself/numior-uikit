import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { llmsDistProblems } from '../.vitepress/content/check';
import { llmsEntries, llmsFiles, writeLlms } from '../.vitepress/llms/files';
import type { LlmsSource } from '../.vitepress/llms/llms.types';
import { llmsPaths } from '../.vitepress/llms/paths';
import { llmsResponse } from '../.vitepress/llms/plugin';
import { navigationPages } from '../.vitepress/navigation';
import { parseBundle } from '../.vitepress/reference/bundle';
import { site } from '../.vitepress/theme/site';

const DOCS = fileURLToPath(new URL('..', import.meta.url));
const BUNDLE = join(DOCS, '.reference/bundle.json');
const DOCS_TAG_RE = /^<(?:Example|Configurator|[A-Z][A-Za-z]*Reference)\b/m;
const FENCED_RE = /^(`{3,})[^\n]*\n[\s\S]*?\n\1$/gm;

const SOURCE: LlmsSource = {
  srcDir: DOCS,
  examplesRoot: join(DOCS, 'examples'),
  bundle: existsSync(BUNDLE) ? parseBundle(readFileSync(BUNDLE, 'utf8')) : undefined,
  site,
};

const MARKDOWN = { accept: 'text/markdown' };

describe('Markdown copies of the docs pages', () => {
  it('gives every page of the navigation a copy with a heading and without docs tags', () => {
    for (const locale of ['ru', 'en'] as const) {
      const entries = llmsEntries(SOURCE, locale);

      expect(entries.map((entry) => entry.link)).toEqual(
        navigationPages(locale).map((page) => page.link),
      );

      const broken = entries.reduce<string[]>((found, entry) => {
        if (
          !entry.twin.startsWith('# ') ||
          DOCS_TAG_RE.test(entry.twin.replaceAll(FENCED_RE, ''))
        ) {
          found.push(entry.path);
        }
        return found;
      }, []);

      expect(broken).toEqual([]);
    }
  });

  it('prints the examples of a page as code with the data files of the shop', () => {
    const select = llmsEntries(SOURCE, 'ru').find((entry) => entry.link === '/components/select');

    expect(select?.description).not.toBe('');
    expect(select?.twin).toContain('```vue\n<template>');
    expect(select?.twin).toContain('`team.ts`');
    expect(select?.twin).not.toContain('#demo/');
  });

  it('writes the copies and both catalogs of each language into the built site', () => {
    const dist = mkdtempSync(join(tmpdir(), 'nui-llms-'));

    expect(llmsDistProblems(dist, ['llms.txt'])).toEqual([
      'llms.txt: the Markdown copy for language models is missing',
    ]);

    writeLlms(dist, SOURCE);

    expect(llmsDistProblems(dist, llmsPaths())).toEqual([]);

    expect(
      llmsFiles(SOURCE)
        .map((file) => file.path)
        .toSorted(),
    ).toEqual(llmsPaths().toSorted());

    expect(readFileSync(join(dist, 'llms.txt'), 'utf8')).toContain('](/en/components/button.md)');
    expect(readFileSync(join(dist, 'llms-ru.txt'), 'utf8')).toContain('](/components/button.md)');
    expect(readFileSync(join(dist, 'en/components/button.md'), 'utf8')).toMatch(/^# Button\n/);
    expect(readFileSync(join(dist, 'llms-ru.txt'), 'utf8')).toContain('](/editor/index.md)');
    expect(readFileSync(join(dist, 'editor/index.md'), 'utf8')).toMatch(/^# Редактор\n/);
    expect(readFileSync(join(dist, 'llms-ru.txt'), 'utf8')).toContain(
      '](/components/table/index.md)',
    );
    expect(readFileSync(join(dist, 'en/components/table/index.md'), 'utf8')).toMatch(/^# Table\n/);

    rmSync(dist, { recursive: true });
  });

  it('answers a page address with its copy only when Markdown is asked for', () => {
    const copy = llmsResponse(SOURCE, '/components/button.md?t=1', MARKDOWN);

    expect(copy?.type).toBe('text/markdown; charset=utf-8');
    expect(copy?.body).toMatch(/^# Button\n/);

    expect(llmsResponse(SOURCE, '/components/button.md', { accept: '*/*' })).toBeUndefined();
    expect(llmsResponse(SOURCE, '/components/unknown.md', MARKDOWN)).toBeUndefined();
    expect(llmsResponse(SOURCE, '/../package.json.md', MARKDOWN)).toBeUndefined();
    expect(llmsResponse(SOURCE, '/components/button', MARKDOWN)).toBeUndefined();
  });

  it('answers the catalog addresses with plain text', () => {
    const index = llmsResponse(SOURCE, '/llms.txt', {});

    expect(index?.type).toBe('text/plain; charset=utf-8');
    expect(index?.body).toMatch(/^# Numior UI\n/);
    expect(llmsResponse(SOURCE, '/llms-full-ru.txt', {})?.body).toContain('\n# Button\n');
  });
});
