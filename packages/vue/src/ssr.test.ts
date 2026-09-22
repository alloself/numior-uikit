// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSSRApp, h, type Component } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { NuiButton, NuiConfigProvider, NuiIcon } from './index';

interface Case {
  readonly name: string;
  readonly component: Component;
  readonly props?: Record<string, unknown>;
  readonly slot?: string;
}

const ssrCases: Case[] = [
  { name: 'NuiButton', component: NuiButton, props: { loading: true }, slot: 'Save' },
  { name: 'NuiIcon', component: NuiIcon, props: { alias: 'check' } },
  { name: 'NuiConfigProvider', component: NuiConfigProvider, slot: 'content' },
];

function render({ component, props, slot }: Case): Promise<string> {
  const app = createSSRApp({
    render: () => h(component, props ?? {}, slot === undefined ? undefined : () => slot),
  });
  return renderToString(app);
}

describe('server rendering', () => {
  for (const testCase of ssrCases) {
    it(`${testCase.name} renders deterministic markup without a DOM`, async () => {
      const first = await render(testCase);
      expect(first).toBe(await render(testCase));
      expect(first).not.toContain('undefined');
      expect(first).not.toMatch(/aria-describedby=""|id=""/);
    });
  }
});
