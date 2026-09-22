import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { InputDriver, mountInputWithFocusHandle } from './drivers/input';

describe('NuiInput', () => {
  it('updates the model on every input by default', async () => {
    const input = InputDriver.mount({ modelValue: '' });
    await input.type('abc');
    expect(input.emittedValues).toEqual(['abc']);
  });

  it('waits for a commit with the lazy modifier', async () => {
    const input = InputDriver.mount({ modelValue: '', modifiers: { lazy: true } });
    await input.type('abc');
    expect(input.emittedValues).toEqual([]);
    await input.commit();
    expect(input.emittedValues).toEqual(['abc']);
  });

  it('trims the model while typing and the control on commit', async () => {
    const input = InputDriver.mount({
      modelValue: '',
      modifiers: { trim: true },
      attachToBody: true,
    });
    input.focusNatively();
    expect(input.focused).toBe(true);
    await input.type(' a ');
    expect(input.emittedValues).toEqual(['a']);
    expect(input.value).toBe(' a ');
    await input.commit();
    expect(input.value).toBe('a');
    input.unmount();
  });

  it('writes external model changes into the native control', async () => {
    const input = InputDriver.mount({ modelValue: 'first' });
    expect(input.value).toBe('first');
    await input.receiveModelValue('second');
    expect(input.value).toBe('second');
  });

  it('routes class and style to the wrapper and other attributes to the native input', async () => {
    const focuses = { count: 0 };
    const input = InputDriver.mount({
      props: { type: 'email', size: 'lg', readonly: true },
      attrs: {
        class: 'wide',
        style: 'max-width: 10rem',
        placeholder: 'Name',
        autocomplete: 'name',
        'aria-label': 'Name',
        onFocus: () => {
          focuses.count += 1;
        },
      },
    });
    expect(input.wrapper.classes()).toContain('wide');
    expect(input.attribute('style')).toContain('max-width');
    expect(input.hasModifier('size-lg')).toBe(true);
    expect(input.control.attributes('placeholder')).toBe('Name');
    expect(input.control.attributes('autocomplete')).toBe('name');
    expect(input.control.attributes('aria-label')).toBe('Name');
    expect(input.control.attributes('type')).toBe('email');
    expect(input.control.attributes('readonly')).toBe('');
    expect(input.control.attributes('id')).toBeTruthy();
    await input.control.trigger('focus');
    expect(focuses.count).toBe(1);
  });

  it('reflects invalid and disabled on the wrapper and the control', () => {
    const input = InputDriver.mount({ props: { invalid: true, disabled: true, required: true } });
    expect(input.hasModifier('invalid')).toBe(true);
    expect(input.hasModifier('disabled')).toBe(true);
    expect(input.control.attributes('aria-invalid')).toBe('true');
    expect(input.control.attributes('disabled')).toBe('');
    expect(input.control.attributes('required')).toBe('');
    const plain = InputDriver.mount();
    expect(plain.hasModifier('invalid')).toBe(false);
    expect(plain.control.attributes('disabled')).toBeUndefined();
  });

  it('renders prefix and suffix slots only when provided', () => {
    const bare = InputDriver.mount();
    expect(bare.prefix.exists()).toBe(false);
    const input = InputDriver.mount({ slots: { prefix: () => '@', suffix: () => h('b', '.ru') } });
    expect(input.prefix.text()).toBe('@');
    expect(input.suffix.find('b').text()).toBe('.ru');
  });

  it('exposes focus() to template refs', () => {
    const host = mountInputWithFocusHandle();
    host.focus();
    expect(document.activeElement).toBe(host.control.element);
    host.unmount();
  });
});
