import { describe, expect, it } from 'vite-plus/test';
import { structureProblemsOf } from '../.vitepress/content/check';

const GOOD = [
  '# Button',
  '',
  'Lead.',
  '',
  '<Example name="button/Basic" />',
  '',
  '## Установка',
  '',
  '```ts',
  "import { NuiButton } from '@numior/vue';",
  '```',
  '',
  '## API',
  '',
  '<ApiReference name="NuiButton" />',
].join('\n');

describe('structureProblemsOf', () => {
  it('accepts a page with a hero example, an installation block and an API reference', () => {
    expect(structureProblemsOf('components/button.md', GOOD)).toEqual([]);

    expect(
      structureProblemsOf('en/components/button.md', GOOD.replace('Установка', 'Installation')),
    ).toEqual([]);

    expect(structureProblemsOf('guide/getting-started.md', '# Guide')).toEqual([]);
  });

  it('reports old demo markup, missing sections and mustaches inside attributes', () => {
    const old = [
      '# Checkbox',
      '<div class="vp-raw nui-demo">',
      '<NuiField description="Выбрано: {{ channels.join() }}"></NuiField>',
      '</div>',
    ].join('\n');

    expect(structureProblemsOf('components/checkbox.md', old)).toEqual([
      'components/checkbox.md: no hero <Example>',
      'components/checkbox.md: no installation section',
      'components/checkbox.md: no <ApiReference>',
      'components/checkbox.md: mustaches inside an attribute value',
      'components/checkbox.md: old vp-raw demo markup',
    ]);
  });
});
