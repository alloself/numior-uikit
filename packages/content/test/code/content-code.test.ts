import type { NuiHighlighter } from '@numior/primitives';
import { createNuiConfig } from '@numior/vue';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { NuiContentCode } from '../../src/code';
import { ContentDriver } from '../drivers/content';
import { docOf, node } from '../support/documents';

let driver: ContentDriver | undefined;

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const highlighter: NuiHighlighter = {
  languages: [{ id: 'typescript', label: 'TypeScript', aliases: ['ts'] }],
  tokens: (code) =>
    Promise.resolve([[{ text: code.slice(0, 5), scope: 'keyword' }, { text: code.slice(5) }]]),
};

describe('NuiContentCode', () => {
  it('publishes a code block with its language, copying and highlighting from the config', async () => {
    driver = ContentDriver.mount(
      {
        document: docOf(node('code_block', ['const a = 1'], { language: 'ts' })),
        views: { code_block: NuiContentCode },
      },
      [createNuiConfig({ highlighter })],
    );

    await driver.settle();

    expect(driver.codeTitles).toEqual(['TypeScript']);
    expect(driver.codeScopes).toEqual(['keyword:const']);
  });

  it('colours a block with the built-in Shiki when nothing is configured', async () => {
    const content = ContentDriver.mount({
      document: docOf(node('code_block', ['SELECT 1'], { language: 'sql' })),
      views: { code_block: NuiContentCode },
    });

    driver = content;

    await vi.waitFor(
      () => {
        expect(content.codeScopes).toContain('keyword:SELECT');
      },
      { timeout: 30_000 },
    );

    expect(content.codeTitles).toEqual(['SQL']);
  }, 30_000);

  it('stays plain when the config turns highlighting off and keeps the language as written', async () => {
    driver = ContentDriver.mount(
      {
        document: docOf(node('code_block', ['SELECT 1'], { language: 'sql' })),
        views: { code_block: NuiContentCode },
      },
      [createNuiConfig({ highlighter: false })],
    );

    await driver.settle();

    expect(driver.codeTitles).toEqual([]);
    expect(driver.codeScopes).toEqual([]);
    expect(driver.markup).toContain('SELECT 1');
  });
});
