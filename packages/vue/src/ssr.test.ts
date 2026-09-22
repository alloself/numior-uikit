// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSSRApp, h, type VNode } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { NuiButton, NuiConfigProvider, NuiField, NuiIcon, NuiInput, NuiTextarea } from './index';

interface Case {
  readonly name: string;
  render(): VNode;
}

const ssrCases: Case[] = [
  { name: 'NuiButton', render: () => h(NuiButton, { loading: true }, () => 'Save') },
  { name: 'NuiIcon', render: () => h(NuiIcon, { alias: 'check' }) },
  { name: 'NuiConfigProvider', render: () => h(NuiConfigProvider, null, () => 'content') },
  {
    name: 'NuiField with NuiInput',
    render: () =>
      h(NuiField, { label: 'Email', description: 'Work', error: 'Required' }, () =>
        h(NuiInput, { modelValue: 'a', placeholder: 'name@example.com' }),
      ),
  },
  { name: 'NuiTextarea', render: () => h(NuiTextarea, { modelValue: 'text', invalid: true }) },
];

function render(testCase: Case): Promise<string> {
  return renderToString(createSSRApp({ render: testCase.render }));
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

  it('wires field ids on the server so hydration needs no client-side fixups', async () => {
    const html = await render(ssrCases[3]!);
    const [, controlId] = /<label[^>]* for="([^"]+)"/.exec(html) ?? [];
    expect(controlId).toBeTruthy();
    expect(html).toContain(`id="${controlId}"`);
    expect(html).toContain(`aria-describedby="${controlId}-description ${controlId}-error"`);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('value="a"');
  });
});
