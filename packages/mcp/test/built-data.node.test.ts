import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import { parseData } from '../src/data';
import { McpSession } from './harness/mcp-session';

const BUILT_DATA = new URL('../dist/data.json', import.meta.url);

describe('the data built from the documentation', () => {
  it('serves the reference, both page copies and a check of real kit code', async () => {
    const data = parseData(readFileSync(BUILT_DATA, 'utf8'));
    const session = await McpSession.open(data);

    const select = await session.call('get_component', { name: 'select', locale: 'ru' });
    const page = await session.call('get_page', { path: '/en/components/button/' });
    const hits = await session.call('search', { query: 'dark theme tokens', limit: 3 });

    const check = await session.call('check_usage', {
      code: `<template>
  <NuiButton variant="primary" icon="trash">Delete</NuiButton>
</template>
<script setup lang="ts">
import { NuiButton } from '@numior/vue';
import '@numior/vue/styles.css';
</script>`,
    });

    await session.close();

    expect(data.pages.en.map((entry) => entry.path)).toEqual(
      data.pages.ru.map((entry) => entry.path),
    );

    expect(Object.keys(data.examples.ru)).toEqual(Object.keys(data.examples.en));
    expect(data.tokens.length).toBeGreaterThan(50);
    expect(data.icons.length).toBeGreaterThan(20);
    expect(select.json()).toMatchObject({ name: 'NuiSelect', package: '@numior/vue' });
    expect(select.texts[1]).toMatch(/^# /u);
    expect(page.text).toMatch(/^# Button/u);
    expect(hits.json()).toHaveLength(3);

    expect(check.json()).toMatchObject({
      diagnostics: [{ line: 2, code: 'invalid-value', hint: expect.stringContaining('`tone`') }],
    });
  });
});
