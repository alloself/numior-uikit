import { describe, expect, it } from 'vite-plus/test';
import { TextareaDriver } from './drivers/textarea';
import { fieldTextsOf } from './support/field-texts';

describe('NuiTextarea', () => {
  it('is a native textarea that receives attributes directly and reflects props', () => {
    const textarea = TextareaDriver.mount({
      props: { rows: 5, resize: 'none', size: 'sm', invalid: true, readonly: true },
      attrs: { class: 'tall', placeholder: 'Bio', 'aria-label': 'Bio' },
    });

    expect(textarea.element.tagName).toBe('TEXTAREA');
    expect(textarea.root.classes()).toContain('tall');
    expect(textarea.attribute('placeholder')).toBe('Bio');
    expect(textarea.attribute('rows')).toBe('5');
    expect(textarea.hasModifier('resize-none')).toBe(true);
    expect(textarea.hasModifier('size-sm')).toBe(true);
    expect(textarea.hasModifier('invalid')).toBe(true);
    expect(textarea.attribute('aria-invalid')).toBe('true');
    expect(textarea.attribute('readonly')).toBe('');
    expect(textarea.attribute('id')).toBeTruthy();
  });

  it('updates the model on input, or on commit with the lazy modifier', async () => {
    const eager = TextareaDriver.mount({ modelValue: '' });
    await eager.type('text');
    expect(eager.value).toBe('text');
    expect(eager.emittedValues).toEqual(['text']);

    const lazy = TextareaDriver.mount({ modelValue: '', modifiers: { lazy: true } });
    await lazy.type('text');
    expect(lazy.emittedValues).toEqual([]);

    await lazy.commit();
    expect(lazy.emittedValues).toEqual(['text']);
  });

  it('writes the model when an IME composition ends, not while it runs', async () => {
    const textarea = TextareaDriver.mount({ modelValue: '' });

    await textarea.compose('ni');

    expect(textarea.emittedValues).toEqual([]);

    await textarea.compose('你');
    await textarea.endComposition();

    expect(textarea.emittedValues).toEqual(['你']);

    textarea.unmount();
  });

  it('renders its own label, description and error and links them to the control', () => {
    const control = TextareaDriver.mount({
      props: { label: 'Имя', description: 'Подсказка', error: 'Ошибка' },
    });

    expect(fieldTextsOf(control.wrapper)).toEqual({
      label: 'Имя',
      description: 'Подсказка',
      error: 'Ошибка',
      linked: true,
      group: false,
    });
  });
});
