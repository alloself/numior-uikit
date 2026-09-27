import { describe, expect, it } from 'vitest';
import type { ReferenceBundle } from '../.vitepress/reference/reference.types';
import { apiSearchText, referencedComponents } from '../.vitepress/reference/search-text';

const bundle: ReferenceBundle = {
  version: 1,
  components: {
    NuiButton: {
      name: 'NuiButton',
      package: '@numior/vue',
      family: 'button',
      file: '',
      styles: undefined,
      messages: undefined,
      props: [
        {
          name: 'variant',
          type: 'NuiButtonVariant',
          kind: 'enum',
          required: false,
          default: '"solid"',
          values: ['solid'],
          description: { ru: 'Форма кнопки.', en: 'Button shape.' },
        },
      ],
      models: [],
      events: [],
      slots: [{ name: 'default', type: 'any', description: undefined }],
      exposed: [],
      keyboard: [],
      configurator: undefined,
    },
  },
  catalogs: {},
  declarations: [],
  tokens: [],
  icons: [],
};

describe('search text', () => {
  it('finds the components a page references', () => {
    expect(referencedComponents('<ApiReference name="NuiButton" />')).toEqual(['NuiButton']);

    expect(referencedComponents(`<ApiReference :names="['NuiCard', 'NuiCardHeader']" />`)).toEqual([
      'NuiCard',
      'NuiCardHeader',
    ]);

    expect(referencedComponents('plain text')).toEqual([]);
  });

  it('appends the API members with descriptions in the page language', () => {
    expect(apiSearchText(bundle, '# Кнопка\n\n<ApiReference name="NuiButton" />', 'ru')).toBe(
      '\n\n### NuiButton\n\n- `variant` — Форма кнопки.\n- `default`\n',
    );

    expect(apiSearchText(bundle, '<ApiReference name="NuiButton" />', 'en')).toContain(
      'Button shape.',
    );

    expect(apiSearchText(bundle, '<ApiReference name="NuiNope" />', 'ru')).toBe('');
  });
});
