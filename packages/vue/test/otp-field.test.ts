import { afterEach, describe, expect, it, vi } from 'vitest';
import { OtpFieldDriver } from './drivers/otp-field';
import { fieldTextsOf } from './support/field-texts';
import { installWebOtp, type WebOtpStub } from '../../primitives/test/support/web-otp';

describe('NuiOtpField', () => {
  let stub: WebOtpStub | undefined;

  afterEach(() => {
    stub?.restore();
    stub = undefined;
    vi.useRealTimers();
  });

  it('draws one hidden slot per character in groups over a one-time-code input', () => {
    const otp = OtpFieldDriver.mount({ props: { groupSize: 3 }, modelValue: '48' });
    expect(otp.groupSizes).toEqual([3, 3]);
    expect(otp.separators).toHaveLength(1);
    expect(otp.slotsHidden).toBe(true);
    expect(otp.slotTexts).toEqual(['4', '8', '', '', '', '']);
    expect(otp.nativeValue).toBe('48');
    expect(otp.controlAttribute('autocomplete')).toBe('one-time-code');
    expect(otp.controlAttribute('inputmode')).toBe('numeric');
    expect(otp.controlAttribute('pattern')).toBe('\\d*');
    expect(otp.controlAttribute('type')).toBe('text');
    expect(otp.hasModifier('size-md')).toBe(true);
    otp.unmount();
    const custom = OtpFieldDriver.mount({ props: { length: 7, groupSize: 3 }, separator: '·' });
    expect(custom.groupSizes).toEqual([3, 3, 1]);
    expect(custom.separators.map((separator) => separator.text())).toEqual(['·', '·']);
    custom.unmount();
  });

  it('types into the next slot, refuses other characters and completes once', async () => {
    const otp = OtpFieldDriver.mount();
    await otp.focus();
    expect(otp.caretSlot).toBe(0);
    await otp.type('4');
    expect(otp.value).toBe('4');
    expect(otp.caretSlot).toBe(1);
    await otp.type('x');
    expect(otp.value).toBe('4');
    expect(otp.nativeValue).toBe('4');
    await otp.type('٨२९१३');
    expect(otp.value).toBe('482913');
    expect(otp.completions).toEqual(['482913']);
    expect(otp.activeSlots).toEqual([5]);
    expect(otp.caretSlot).toBeUndefined();
    await otp.type('3');
    expect(otp.completions).toEqual(['482913']);
    otp.unmount();
  });

  it('upper-cases alphanumeric codes and keeps other scripts out', async () => {
    const otp = OtpFieldDriver.mount({ props: { charset: 'alphanumeric', length: 4 } });
    expect(otp.controlAttribute('inputmode')).toBe('text');
    expect(otp.controlAttribute('autocapitalize')).toBe('characters');
    expect(otp.controlAttribute('pattern')).toBeUndefined();
    await otp.focus();
    await otp.type('k7кq');
    expect(otp.value).toBe('K7Q');
    expect(otp.nativeValue).toBe('K7Q');
    otp.unmount();
  });

  it('overwrites a clicked slot and moves on to the next one', async () => {
    const otp = OtpFieldDriver.mount({ modelValue: '482913' });
    await otp.clickSlot(2);
    expect(otp.activeSlots).toEqual([2]);
    expect(otp.selection).toEqual({ start: 2, end: 3 });
    await otp.type('7');
    expect(otp.value).toBe('487913');
    expect(otp.activeSlots).toEqual([3]);
    expect(otp.completions).toEqual(['487913']);
    await otp.clickSlot(0, 2);
    expect(otp.activeSlots).toEqual([3]);
    otp.unmount();
  });

  it('activates the pressed slot at once instead of passing through the end of the code', async () => {
    const otp = OtpFieldDriver.mount({ modelValue: '482913' });
    await otp.pressSlot(0);
    expect(otp.activeSlots).toEqual([0]);
    await otp.selectNatively(6, 6);
    expect(otp.activeSlots).toEqual([0]);
    await otp.pressSlot(3);
    await otp.selectNatively(6, 6);
    expect(otp.activeSlots).toEqual([3]);
    otp.unmount();
  });

  it('forgets a cancelled press and focuses the end of the code from the keyboard', async () => {
    const otp = OtpFieldDriver.mount({ modelValue: '482913' });
    await otp.cancelPress(1);
    await otp.focus();
    expect(otp.activeSlots).toEqual([5]);
    otp.unmount();
  });

  it('keeps the clicked slot when the browser places its caret after the click', async () => {
    const otp = OtpFieldDriver.mount({ modelValue: '482913' });
    await otp.clickSlot(2);
    await otp.selectNatively(6, 6);
    expect(otp.activeSlots).toEqual([2]);
    expect(otp.selection).toEqual({ start: 2, end: 3 });
    await otp.selectNatively(4, 4);
    expect(otp.activeSlots).toEqual([4]);
    otp.unmount();
  });

  it('puts the caret after the last character when an empty slot is clicked', async () => {
    const otp = OtpFieldDriver.mount({ modelValue: '48' });
    await otp.clickSlot(4);
    expect(otp.caretSlot).toBe(2);
    expect(otp.selection).toEqual({ start: 2, end: 2 });
    otp.unmount();
  });

  it('deletes backwards to the left and forwards in place', async () => {
    const otp = OtpFieldDriver.mount({ modelValue: '482913' });
    await otp.focus();
    expect(otp.activeSlots).toEqual([5]);
    await otp.deleteBackward();
    expect(otp.value).toBe('48291');
    expect(otp.caretSlot).toBe(5);
    await otp.clickSlot(2);
    await otp.deleteBackward();
    expect(otp.value).toBe('4891');
    expect(otp.activeSlots).toEqual([1]);
    await otp.deleteForward();
    expect(otp.value).toBe('491');
    expect(otp.activeSlots).toEqual([1]);
    otp.unmount();
  });

  it('moves the active slot with the arrows, Home and End', async () => {
    const otp = OtpFieldDriver.mount({ modelValue: '4829' });
    await otp.focus();
    expect(otp.caretSlot).toBe(4);
    await otp.press('ArrowLeft');
    expect(otp.activeSlots).toEqual([3]);
    await otp.press('Home');
    expect(otp.activeSlots).toEqual([0]);
    await otp.press('ArrowLeft');
    expect(otp.activeSlots).toEqual([0]);
    await otp.press('ArrowRight');
    expect(otp.activeSlots).toEqual([1]);
    await otp.press('End');
    expect(otp.caretSlot).toBe(4);
    await otp.press('ArrowRight');
    expect(otp.caretSlot).toBe(4);
    await otp.press('ArrowLeft', { shiftKey: true });
    expect(otp.caretSlot).toBe(4);
    otp.unmount();
  });

  it('follows a native selection and turns a stray caret into a slot', async () => {
    const otp = OtpFieldDriver.mount({ modelValue: '482913' });
    await otp.focus();
    await otp.selectNatively(0, 6);
    expect(otp.activeSlots).toEqual([0, 1, 2, 3, 4, 5]);
    await otp.selectNatively(2, 2);
    expect(otp.activeSlots).toEqual([2]);
    expect(otp.selection).toEqual({ start: 2, end: 3 });
    await otp.blur();
    expect(otp.activeSlots).toEqual([]);
    otp.unmount();
  });

  it('replaces the code with a pasted complete one and writes a shorter paste from the slot', async () => {
    const otp = OtpFieldDriver.mount({ modelValue: '12' });
    await otp.focus();
    await otp.paste('Your code: 482-913');
    expect(otp.value).toBe('482913');
    expect(otp.completions).toEqual(['482913']);
    await otp.clickSlot(2);
    await otp.paste('7 7');
    expect(otp.value).toBe('487713');
    expect(otp.activeSlots).toEqual([4]);
    expect(otp.completions).toEqual(['482913', '487713']);
    otp.unmount();
  });

  it('takes autofilled and composed text through the same normalisation', async () => {
    const otp = OtpFieldDriver.mount();
    await otp.focus();
    await otp.compose('４８');
    expect(otp.value).toBe('48');
    await otp.autofill('482 9130');
    expect(otp.value).toBe('482913');
    expect(otp.nativeValue).toBe('482913');
    expect(otp.completions).toEqual(['482913']);
    otp.unmount();
  });

  it('shows a programmatic value without completing it', async () => {
    const otp = OtpFieldDriver.mount({ props: { length: 4 } });
    await otp.receiveModelValue('48 2913');
    expect(otp.slotTexts).toEqual(['4', '8', '2', '9']);
    expect(otp.nativeValue).toBe('4829');
    expect(otp.value).toBe('48 2913');
    expect(otp.completions).toEqual([]);
    otp.unmount();
  });

  it('moves the caret to the end when the app replaces the code under focus', async () => {
    const otp = OtpFieldDriver.mount();
    await otp.focus();
    await otp.type('482');
    await otp.clickSlot(1);
    expect(otp.activeSlots).toEqual([1]);
    await otp.receiveModelValue('');
    expect(otp.caretSlot).toBe(0);
    expect(otp.selection).toEqual({ start: 0, end: 0 });
    await otp.receiveModelValue('482913');
    expect(otp.activeSlots).toEqual([5]);
    expect(otp.selection).toEqual({ start: 5, end: 6 });
    otp.unmount();
  });

  it('shows the placeholder in empty slots except the one with the caret', async () => {
    const otp = OtpFieldDriver.mount({ props: { length: 4, placeholder: '○' }, modelValue: '4' });
    expect(otp.placeholders).toEqual(['', '○', '○', '○']);
    expect(otp.controlAttribute('placeholder')).toBeUndefined();
    await otp.focus();
    expect(otp.placeholders).toEqual(['', '', '○', '○']);
    otp.unmount();
  });

  it('hides a secret code behind dots and reveals the last typed character for a second', async () => {
    vi.useFakeTimers();
    const otp = OtpFieldDriver.mount({ props: { secret: true, length: 4 } });
    expect(otp.controlAttribute('type')).toBe('password');
    expect(otp.controlAttribute('autocomplete')).toBe('off');
    expect(otp.hasModifier('secret')).toBe(true);
    await otp.focus();
    await otp.type('4');
    expect(otp.dotSlots).toEqual([0]);
    expect(otp.revealedSlot).toBe(0);
    await otp.type('8');
    expect(otp.revealedSlot).toBe(1);
    await otp.advance(999);
    expect(otp.revealedSlot).toBe(1);
    await otp.advance(1);
    expect(otp.revealedSlot).toBeUndefined();
    await otp.paste('29');
    expect(otp.dotSlots).toEqual([0, 1, 2, 3]);
    expect(otp.revealedSlot).toBeUndefined();
    await otp.clickSlot(1);
    await otp.type('5');
    expect(otp.revealedSlot).toBe(1);
    await otp.blur();
    expect(otp.revealedSlot).toBeUndefined();
    otp.unmount();
  });

  it('keeps a readonly code and hides the caret, and disables the input', async () => {
    const readonly = OtpFieldDriver.mount({ props: { readonly: true }, modelValue: '48' });
    await readonly.focus();
    expect(readonly.caretSlot).toBeUndefined();
    expect(readonly.activeSlots).toEqual([2]);
    await readonly.type('2');
    await readonly.paste('482913');
    expect(readonly.value).toBe('48');
    expect(readonly.hasModifier('readonly')).toBe(true);
    readonly.unmount();
    const disabled = OtpFieldDriver.mount({ props: { disabled: true } });
    expect(disabled.controlAttribute('disabled')).toBe('');
    expect(disabled.hasModifier('disabled')).toBe(true);
    disabled.unmount();
  });

  it('takes its texts, id and states from props or the surrounding field', async () => {
    const own = OtpFieldDriver.mount({
      props: { label: 'Код', description: 'Шесть цифр', error: 'Неверный код', size: 'lg' },
      attrs: { name: 'code', 'data-testid': 'otp' },
    });

    expect(fieldTextsOf(own.wrapper)).toEqual({
      label: 'Код',
      description: 'Шесть цифр',
      error: 'Неверный код',
      linked: true,
      group: false,
    });

    expect(own.controlAttribute('name')).toBe('code');
    expect(own.controlAttribute('data-testid')).toBe('otp');
    expect(own.hasModifier('size-lg')).toBe(true);
    await own.focusThroughHandle();
    expect(own.focused).toBe(true);
    own.unmount();
    const field = OtpFieldDriver.mount({ field: { label: 'Код', invalid: true, required: true } });
    expect(field.hasModifier('invalid')).toBe(true);
    expect(field.controlAttribute('aria-invalid')).toBe('true');
    expect(field.controlAttribute('required')).toBe('');
    expect(fieldTextsOf(field.wrapper).linked).toBe(true);
    field.unmount();
  });

  it('fills a code received through WebOTP and stops asking once complete', async () => {
    stub = installWebOtp();
    const otp = OtpFieldDriver.mount({ props: { webOtp: true } });
    await otp.settle();
    expect(stub.requests).toBe(1);
    stub.deliver('482 913');
    await otp.settle();
    expect(otp.value).toBe('482913');
    expect(otp.completions).toEqual(['482913']);
    await otp.focus();
    await otp.deleteBackward();
    await otp.settle();
    expect(stub.requests).toBe(2);
    stub.deliver('482913');
    await otp.settle();
    expect(otp.activeSlots).toEqual([5]);
    expect(otp.selection).toEqual({ start: 5, end: 6 });
    await otp.deleteBackward();
    await otp.settle();
    expect(stub.requests).toBe(3);
    await otp.type('3');
    await otp.settle();
    expect(stub.aborted).toBe(1);
    expect(otp.completions).toEqual(['482913', '482913', '482913']);
    otp.unmount();
  });

  it('asks WebOTP nothing without the prop', async () => {
    stub = installWebOtp();
    const otp = OtpFieldDriver.mount();
    await otp.settle();
    expect(stub.requests).toBe(0);
    otp.unmount();
  });
});
