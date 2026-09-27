import { describe, expect, it } from 'vitest';
import { ApiComponentDriver, referenceOf } from './drivers/api-component';

describe('ApiComponent', () => {
  it('renders one table per populated section in the page language', () => {
    const api = ApiComponentDriver.mount(referenceOf());

    expect(api.sectionTitles).toEqual([
      'Свойства',
      'Модели',
      'События',
      'Слоты',
      'Клавиатура',
      'Стили',
    ]);

    expect(api.rows('Свойства')).toEqual([
      ['size', 'NuiSize | undefined', '"md"', 'Ступень размера.'],
      ['itemsобязательно', 'readonly string[]', '—', '—'],
    ]);

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
    expect(api.rows('Props')[0]?.[3]).toBe('Size step.');
    expect(api.rows('Slots')).toEqual([['default', '{}', 'Content.']]);
  });

  it('lists keyboard keys, the style import and the BEM parts and modifiers', () => {
    const api = ApiComponentDriver.mount(referenceOf());

    expect(api.keys).toEqual(['↵']);
    expect(api.rows('Клавиатура')).toEqual([['↵', 'Выбирает.']]);
    expect(api.styleImport).toBe("import '@numior/vue/styles/sample.css';");
    expect(api.badges).toEqual(['обязательно', '__label', '--size-sm', '--__label--muted']);
  });

  it('hides sections without members', () => {
    const api = ApiComponentDriver.mount(
      referenceOf({ models: [], events: [], slots: [], keyboard: [], styles: undefined }),
    );

    expect(api.sectionTitles).toEqual(['Свойства']);
  });
});
