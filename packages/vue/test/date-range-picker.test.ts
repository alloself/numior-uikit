import { describe, expect, it } from 'vitest';
import { DateRangePickerDriver } from './drivers/date-range-picker';
import { fieldTextsOf } from './support/field-texts';

describe('NuiDateRangePicker', () => {
  it('shows both ends, labels the end input and swaps reversed typed dates', async () => {
    const picker = DateRangePickerDriver.mount({
      modelValue: { start: '2026-09-10', end: '2026-09-20' },
      field: { label: 'Период' },
      props: { endLabel: 'Конец' },
    });

    expect(picker.hasModifier('range')).toBe(true);
    expect(picker.texts).toEqual(['10.09.2026', '20.09.2026']);
    expect(picker.inputs[0]?.attributes('id')).toBeDefined();
    expect(picker.inputs[1]?.attributes('aria-label')).toBe('Конец');
    await picker.type(1, '05.09.2026');
    expect(picker.value).toEqual({ start: '2026-09-05', end: '2026-09-10' });
    await picker.type(0, '');
    expect(picker.value).toEqual({ start: null, end: '2026-09-10' });
    picker.unmount();
  });

  it('opens two months, closes after the second pick or a preset and focuses the start input', async () => {
    const picker = DateRangePickerDriver.mount({
      props: {
        presets: [{ label: 'Неделя', range: { start: '2026-09-21', end: '2026-09-27' } }],
        startName: 'from',
        endName: 'to',
        clearable: true,
      },
    });

    await picker.clickOpen();
    expect(picker.isOpen).toBe(true);
    expect(picker.months).toBe(2);
    await picker.clickDay('2026-08-31');
    expect(picker.isOpen).toBe(true);
    expect(picker.value).toEqual({ start: '2026-08-31', end: null });
    await picker.clickClear();
    expect(picker.isOpen).toBe(true);
    expect(picker.value).toEqual({ start: null, end: null });
    expect(picker.presetLabels).toEqual(['Неделя']);
    await picker.clickDay('2026-09-10');
    expect(picker.isOpen).toBe(true);
    expect(picker.value).toEqual({ start: '2026-09-10', end: null });
    await picker.clickDay('2026-09-03');
    expect(picker.value).toEqual({ start: '2026-09-03', end: '2026-09-10' });
    expect(picker.isOpen).toBe(false);
    expect(picker.startFocused).toBe(true);
    expect(picker.texts).toEqual(['03.09.2026', '10.09.2026']);
    expect(picker.hiddenValues).toEqual(['2026-09-03', '2026-09-10']);
    await picker.clickOpen();
    await picker.clickPreset('Неделя');
    expect(picker.value).toEqual({ start: '2026-09-21', end: '2026-09-27' });
    expect(picker.isOpen).toBe(false);
    await picker.clickClear();
    expect(picker.value).toEqual({ start: null, end: null });
    expect(picker.hiddenValues).toEqual(['', '']);
    picker.unmount();
  });

  it('names the end input and the open button in the configured language', () => {
    const picker = DateRangePickerDriver.mount();
    expect(picker.inputs[1]?.attributes('aria-label')).toBe('Дата окончания');
    expect(picker.openLabel).toBe('Выбрать период');
    picker.unmount();
  });

  it('renders its own label, description and error and links them to the control', () => {
    const control = DateRangePickerDriver.mount({
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
