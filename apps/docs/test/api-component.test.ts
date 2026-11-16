import { describe, expect, it } from 'vite-plus/test';
import { ApiComponentDriver, referenceOf } from './drivers/api-component';

describe('ApiComponent', () => {
  it('renders one table per populated section in the page language', () => {
    const api = ApiComponentDriver.mount(referenceOf());

    expect(api.sectionTitles).toEqual(['Свойства', 'Модели', 'События', 'Слоты', 'Стили']);

    expect(api.rows('Свойства')).toEqual([
      ['size', 'NuiSize | undefined', '"md"', 'Размер: sm, md или lg.'],
      ['items*', 'readonly string[]', '—', '—'],
    ]);

    expect(api.descriptionCode('Свойства')).toEqual(['sm', 'md', 'lg']);

    expect(api.rows('Модели')).toEqual([
      ['v-model', 'string | null', 'null', 'Выбранное значение.'],
    ]);

    expect(api.rows('События')).toEqual([['select', '[value: string]', '—']]);
    expect(api.heading.exists()).toBe(false);
  });

  it('switches descriptions to English and shows the component heading for composites', () => {
    const api = ApiComponentDriver.mount(referenceOf(), 'en', true);

    expect(api.heading.text()).toBe('NuiSample');
    expect(api.heading.attributes('id')).toBe('api-nuisample');
    expect(api.rows('Props')[0]?.[3]).toBe('Size: sm, md or lg.');
    expect(api.rows('Slots')).toEqual([['default', '{}', 'Content.']]);
  });

  it('lists the dictionary texts and the style import without class or token lists', () => {
    const api = ApiComponentDriver.mount(referenceOf(), 'ru', false, {
      namespace: 'sample',
      texts: { empty: { ru: 'Пусто', en: 'Empty' } },
    });

    expect(api.sectionTitles).toContain('Тексты');
    expect(api.rows('Тексты')).toEqual([['empty', 'Пусто', 'Empty']]);
    expect(api.styleImport).toBe("@import '@numior/vue/styles/sample.css';");
    expect(api.requiredMarks).toEqual(['обязательно']);
    expect(api.nativeTitles).toEqual([]);
    expect(api.text).not.toContain('nui-sample');
    expect(api.text).not.toContain('--color-primary');
  });

  it('hides sections without members', () => {
    const api = ApiComponentDriver.mount(
      referenceOf({ models: [], events: [], slots: [], styles: undefined }),
    );

    expect(api.sectionTitles).toEqual(['Свойства']);
  });
});
