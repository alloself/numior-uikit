import type { NuiHighlighter } from '@numior/primitives';
import { createNuiConfig } from '@numior/vue';
import { afterEach, describe, expect, it } from 'vite-plus/test';
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

  it('stays plain without a highlighter and keeps the language as written', async () => {
    driver = ContentDriver.mount({
      document: docOf(node('code_block', ['SELECT 1'], { language: 'sql' })),
      views: { code_block: NuiContentCode },
    });

    await driver.settle();

    expect(driver.codeTitles).toEqual([]);
    expect(driver.codeScopes).toEqual([]);
    expect(driver.markup).toContain('SELECT 1');
  });
});
