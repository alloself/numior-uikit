import { describe, expect, it } from 'vitest';
import { DatePickerDriver } from './drivers/date-picker';
import { fieldTextsOf } from './support/field-texts';

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

  it('masks typed digits by the locale pattern and commits the date once it is whole', async () => {
    const picker = DatePickerDriver.mount({ field: { label: 'Дата' } });

    await picker.typeKeys('0310');
    expect(picker.text).toBe('03.10.');
    expect(picker.value).toBeNull();
    await picker.typeKeys('2026');
    expect(picker.text).toBe('03.10.2026');
    expect(picker.value).toBe('2026-10-03');
    await picker.placeCaret(3);
    await picker.typeKeys('7');
    expect(picker.text).toBe('03.07.2026');
    expect(picker.value).toBe('2026-07-03');
    expect(picker.caret).toBe(6);
    await picker.placeCaret(10);
    await picker.pressBackspace();
    await picker.pressBackspace();
    await picker.pressBackspace();
    await picker.pressBackspace();
    expect(picker.text).toBe('03.07');
    expect(picker.value).toBe('2026-07-03');
    await picker.typeKeys('.26');
    expect(picker.text).toBe('03.07.26');
    await picker.blur();
    expect(picker.text).toBe('03.07.2026');
    picker.unmount();
  });

  it('masks a date with a time and fills single digits in the order of the locale', async () => {
    const picker = DatePickerDriver.mount({ locale: 'en-US', props: { time: true } });

    await picker.typeKeys('9.4.2026 7:5');
    expect(picker.text).toBe('09/04/2026 07:5');
    await picker.typeKeys('0');
    expect(picker.text).toBe('09/04/2026 07:50');
    expect(picker.value).toBe('2026-09-04T07:50');
    picker.unmount();
  });

  it('opens the calendar from a click on the field and leaves the caret in it', async () => {
    const plain = DatePickerDriver.mount();

    await plain.clickInput();
    expect(plain.isOpen).toBe(false);
    plain.unmount();
    const picker = DatePickerDriver.mount({ props: { openOnClick: true } });

    await picker.clickInput();
    expect(picker.isOpen).toBe(true);
    expect(picker.inputFocused).toBe(true);
    await picker.typeKeys('05');
    expect(picker.text).toBe('05.');
    await picker.pressInput('ArrowDown');
    expect(picker.focusedDate).toBe('2026-09-24');
    await picker.clickDay('2026-09-12');
    expect(picker.value).toBe('2026-09-12');
    expect(picker.isOpen).toBe(false);
    expect(picker.inputFocused).toBe(true);
    picker.unmount();
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

  it('renders its own label, description and error and links them to the control', () => {
    const control = DatePickerDriver.mount({
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

  it('keeps typed dates outside min, max and isDateDisabled out of the model and rolls the text back', async () => {
    const picker = DatePickerDriver.mount({
      modelValue: '2026-09-24',
      locale: 'en-US',
      props: {
        min: '2026-09-01',
        max: '2026-09-30',
        isDateDisabled: (date) => date === '2026-09-15',
      },
    });

    await picker.type('08/01/2026');
    expect(picker.value).toBe('2026-09-24');
    await picker.blur();
    expect(picker.text).toBe('09/24/2026');
    await picker.type('09/15/2026');
    expect(picker.value).toBe('2026-09-24');
    await picker.type('09/16/2026');
    expect(picker.value).toBe('2026-09-16');
    picker.unmount();
  });
});
