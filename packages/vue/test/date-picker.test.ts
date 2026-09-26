import { describe, expect, it } from 'vitest';
import { DatePickerDriver } from './drivers/date-picker';

describe('NuiDatePicker', () => {
  it('shows the model in the locale format and parses typed text live, keeping partial input out of the model', async () => {
    const picker = DatePickerDriver.mount({ modelValue: '2026-09-24', field: { label: 'Дата' } });

    expect(picker.text).toBe('24.09.2026');
    expect(picker.input.attributes('placeholder')).toBe('ДД.ММ.ГГГГ');
    expect(picker.input.attributes('id')).toBeDefined();
    await picker.type('05.10.2026');
    expect(picker.value).toBe('2026-10-05');
    await picker.type('05.1');
    expect(picker.value).toBe('2026-10-05');
    await picker.blur();
    expect(picker.text).toBe('05.10.2026');
    await picker.type('2026-11-01');
    expect(picker.value).toBe('2026-11-01');
    await picker.blur();
    expect(picker.text).toBe('01.11.2026');
    await picker.type('');
    expect(picker.value).toBeNull();
    picker.unmount();
    const american = DatePickerDriver.mount({ modelValue: '2026-09-04', locale: 'en-US' });

    expect(american.text).toBe('09/04/2026');
    expect(american.input.attributes('placeholder')).toBe('MM/DD/YYYY');
    american.unmount();
  });

  it('opens a dialog from the button or ArrowDown, focuses the selected day and picks with focus returned', async () => {
    const picker = DatePickerDriver.mount({ modelValue: '2026-09-24' });

    expect(picker.panel.attributes('role')).toBe('dialog');
    expect(picker.panel.attributes('aria-modal')).toBe('false');
    expect(picker.panel.attributes('popover')).toBe('manual');
    expect(picker.openButton.attributes('aria-haspopup')).toBe('dialog');
    expect(picker.openButton.attributes('aria-controls')).toBe(picker.panel.attributes('id'));
    expect(picker.expanded).toBe(false);
    await picker.focusInput();
    await picker.pressInput('ArrowDown');
    expect(picker.isOpen).toBe(true);
    expect(picker.expanded).toBe(true);
    expect(picker.hasModifier('open')).toBe(true);
    expect(picker.focusedDate).toBe('2026-09-24');
    await picker.pressInPanel('ArrowRight');
    expect(picker.focusedDate).toBe('2026-09-25');
    await picker.clickDay('2026-09-30');
    expect(picker.value).toBe('2026-09-30');
    expect(picker.isOpen).toBe(false);
    expect(picker.inputFocused).toBe(true);
    expect(picker.text).toBe('30.09.2026');
    await picker.clickOpen();
    expect(picker.isOpen).toBe(true);
    await picker.pressInPanel('Escape');
    expect(picker.isOpen).toBe(false);
    expect(picker.inputFocused).toBe(true);
    picker.unmount();
  });

  it('closes when focus leaves, clears through the button and submits a hidden input', async () => {
    const picker = DatePickerDriver.mount({
      modelValue: '2026-09-24',
      props: { clearable: true, name: 'trip', clearLabel: 'Очистить' },
    });

    expect(picker.hiddenValue).toBe('2026-09-24');
    await picker.clickOpen();
    expect(picker.isOpen).toBe(true);
    await picker.focusOutside();
    expect(picker.isOpen).toBe(false);
    expect(picker.clearButton.attributes('aria-label')).toBe('Очистить');
    await picker.clickClear();
    expect(picker.value).toBeNull();
    expect(picker.text).toBe('');
    expect(picker.clearButton.exists()).toBe(false);
    expect(picker.hiddenValue).toBe('');
    picker.unmount();
  });

  it('respects disabled, readonly, bounds and field errors', async () => {
    const picker = DatePickerDriver.mount({
      modelValue: '2026-09-24',
      props: { readonly: true, min: '2026-09-10', max: '2026-09-20' },
      field: { label: 'Дата', error: 'Слишком поздно' },
    });

    expect(picker.hasModifier('readonly')).toBe(true);
    expect(picker.hasModifier('invalid')).toBe(true);
    expect(picker.input.attributes('readonly')).toBeDefined();
    expect(picker.input.attributes('aria-invalid')).toBe('true');
    expect(picker.openButton.attributes('disabled')).toBeDefined();
    await picker.pressInput('ArrowDown');
    expect(picker.isOpen).toBe(false);
    picker.unmount();
    const disabled = DatePickerDriver.mount({ field: { label: 'Дата', disabled: true } });

    expect(disabled.hasModifier('disabled')).toBe(true);
    expect(disabled.input.attributes('disabled')).toBeDefined();
    disabled.unmount();
  });

  it('combines a date with a time when time is on and keeps the dialog open after picking a day', async () => {
    const picker = DatePickerDriver.mount({
      modelValue: '2026-09-24T09:30',
      props: { time: true, timeLabel: 'Время' },
    });

    expect(picker.text).toBe('24.09.2026 09:30');
    expect(picker.input.attributes('placeholder')).toBe('ДД.ММ.ГГГГ ЧЧ:ММ');
    await picker.type('25.09.2026 10:15');
    expect(picker.value).toBe('2026-09-25T10:15');
    await picker.type('26.09.2026');
    expect(picker.value).toBe('2026-09-26T10:15');
    await picker.blur();
    expect(picker.text).toBe('26.09.2026 10:15');
    await picker.clickOpen();
    expect(picker.timeSegments).toEqual(['10', '15']);
    await picker.clickDay('2026-09-30');
    expect(picker.value).toBe('2026-09-30T10:15');
    expect(picker.isOpen).toBe(true);
    await picker.pressInTime('Enter');
    expect(picker.isOpen).toBe(false);
    expect(picker.inputFocused).toBe(true);
    picker.unmount();
  });

  it('follows external model changes in the text and the calendar', async () => {
    const picker = DatePickerDriver.mount({ modelValue: '2026-09-24' });

    await picker.receive('2026-12-31');
    expect(picker.text).toBe('31.12.2026');
    await picker.clickOpen();
    expect(picker.focusedDate).toBe('2026-12-31');
    picker.unmount();
  });

  it('speaks the configured language and switches with its own locale prop', () => {
    const russian = DatePickerDriver.mount({
      modelValue: '2026-09-24',
      props: { clearable: true },
    });

    expect(russian.openButton.attributes('aria-label')).toBe('Выбрать дату');
    expect(russian.clearButton.attributes('aria-label')).toBe('Очистить');
    expect(russian.panel.attributes('aria-label')).toBe('Календарь');
    russian.unmount();

    const english = DatePickerDriver.mount({ props: { locale: 'en-US' } });
    expect(english.openButton.attributes('aria-label')).toBe('Choose date');
    expect(english.input.attributes('placeholder')).toBe('MM/DD/YYYY');
    english.unmount();

    const labelled = DatePickerDriver.mount({ props: { openLabel: 'Открыть календарь' } });
    expect(labelled.openButton.attributes('aria-label')).toBe('Открыть календарь');
    labelled.unmount();
  });
});
