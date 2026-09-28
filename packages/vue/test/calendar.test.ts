import { describe, expect, it } from 'vitest';
import { CalendarDriver } from './drivers/calendar';

describe('NuiCalendar', () => {
  it('renders the month from the locale week start with outside days, today and one tab stop', () => {
    const calendar = CalendarDriver.mount({
      modelValue: '2026-09-24',
      props: { weekNumbers: true },
    });

    expect(calendar.captions).toEqual(['сентябрь 2026']);
    expect(calendar.weekdays).toEqual(['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']);
    expect(calendar.rows).toBe(6);
    expect(calendar.days[0]).toBe('2026-08-31');
    expect(calendar.weekNumbers).toEqual(['36', '37', '38', '39', '40', '41']);
    expect(calendar.dayClasses('2026-08-31')).toContain('outside');

    expect(calendar.dayClasses('2026-09-24')).toEqual(
      expect.arrayContaining(['selected', 'today']),
    );

    expect(calendar.dayAttr('2026-09-24', 'aria-current')).toBe('date');
    expect(calendar.dayAttr('2026-09-24', 'aria-label')).toBe('четверг, 24 сентября 2026 г.');
    expect(calendar.tabStop).toBe('2026-09-24');
    expect(calendar.selected).toEqual(['2026-09-24']);
    expect(calendar.hasModifier('mode-single')).toBe(true);
    calendar.unmount();

    const american = CalendarDriver.mount({
      props: { locale: 'en-US', fixedWeeks: false },
      month: '2027-02',
    });

    expect(american.weekdays[0]).toBe('Sun');
    expect(american.rows).toBe(5);
    expect(american.captions).toEqual(['February 2027']);
    american.unmount();

    const compact = CalendarDriver.mount({
      props: { weekStart: 1, fixedWeeks: false },
      month: '2027-02',
    });

    expect(compact.rows).toBe(4);
    compact.unmount();
  });

  it('moves focus with arrows, Home/End and pages, shifting the view across months and clamping to bounds', async () => {
    const calendar = CalendarDriver.mount({
      modelValue: '2026-09-24',
      props: { min: '2026-09-02', max: '2026-11-15' },
    });

    await calendar.focusGrid();
    expect(calendar.focusedDate).toBe('2026-09-24');
    await calendar.press('ArrowRight');
    expect(calendar.focusedDate).toBe('2026-09-25');
    await calendar.press('ArrowDown');
    expect(calendar.focusedDate).toBe('2026-10-02');
    expect(calendar.captions).toEqual(['октябрь 2026']);
    expect(calendar.monthValue).toBe('2026-10');
    await calendar.press('Home');
    expect(calendar.focusedDate).toBe('2026-09-28');
    expect(calendar.captions).toEqual(['сентябрь 2026']);
    await calendar.press('End');
    expect(calendar.focusedDate).toBe('2026-10-04');
    await calendar.press('PageDown');
    expect(calendar.focusedDate).toBe('2026-11-04');
    await calendar.press('PageDown');
    expect(calendar.focusedDate).toBe('2026-11-15');
    await calendar.press('PageUp', true);
    expect(calendar.focusedDate).toBe('2026-09-02');
    await calendar.press('ArrowLeft');
    expect(calendar.focusedDate).toBe('2026-09-02');
    expect(calendar.tabStop).toBe('2026-09-02');
    calendar.unmount();
  });

  it('swaps horizontal arrows in RTL and keeps disabled dates focusable but not selectable', async () => {
    const calendar = CalendarDriver.mount({
      modelValue: '2026-09-24',
      dir: 'rtl',
      props: { isDateDisabled: (date) => date === '2026-09-25' },
    });

    await calendar.focusGrid();
    await calendar.press('ArrowLeft');
    expect(calendar.focusedDate).toBe('2026-09-25');
    await calendar.focusDay('2026-09-10');
    await calendar.press('ArrowRight');
    expect(calendar.focusedDate).toBe('2026-09-09');
    expect(calendar.dayAttr('2026-09-25', 'aria-disabled')).toBe('true');
    await calendar.clickDay('2026-09-25');
    expect(calendar.value).toBe('2026-09-24');
    await calendar.press('ArrowLeft');
    await calendar.press('Enter');
    calendar.unmount();
  });

  it('opens month and year pickers from the title, pages years and returns to days on pick or Escape', async () => {
    const calendar = CalendarDriver.mount({ modelValue: '2026-09-24' });

    await calendar.clickTitle('month');
    expect(calendar.view).toBe('months');
    expect(calendar.options).toHaveLength(12);
    expect(calendar.focusedOption).toBe('2026-09');
    await calendar.press('ArrowRight');
    expect(calendar.focusedOption).toBe('2026-10');
    await calendar.press('ArrowDown');
    expect(calendar.focusedOption).toBe('2026-12');
    await calendar.press('Escape');
    expect(calendar.view).toBe('days');
    await calendar.clickTitle('year');
    expect(calendar.view).toBe('years');
    expect(calendar.options[0]).toBe('2016');
    expect(calendar.focusedOption).toBe('2026');
    await calendar.press('PageDown');
    expect(calendar.options[0]).toBe('2028');
    await calendar.clickOption('2028');
    expect(calendar.view).toBe('months');
    expect(calendar.captions).toEqual(['сентябрь 2028']);
    await calendar.clickOption('февр.');
    expect(calendar.view).toBe('days');
    expect(calendar.captions).toEqual(['февраль 2028']);
    expect(calendar.focusedDate).toBe('2028-02-24');
    expect(calendar.value).toBe('2026-09-24');
    calendar.unmount();
  });

  it('selects today in single mode, only navigates in range mode and hides the button on demand', async () => {
    const calendar = CalendarDriver.mount({ month: '2020-01' });

    expect(calendar.captions).toEqual(['январь 2020']);
    await calendar.clickToday();
    expect(calendar.value).toBe('2026-09-24');
    expect(calendar.captions).toEqual(['сентябрь 2026']);
    calendar.unmount();
    const range = CalendarDriver.mount({ props: { mode: 'range' }, month: '2020-01' });

    await range.clickToday();
    expect(range.value).toBeNull();
    expect(range.captions).toEqual(['сентябрь 2026']);
    expect(range.tabStop).toBe('2026-09-24');
    range.unmount();
    const hidden = CalendarDriver.mount({ props: { showToday: false }, actions: 'Готово' });

    expect(hidden.todayButton.exists()).toBe(false);
    expect(hidden.actionsText).toBe('Готово');
    hidden.unmount();
  });

  it('toggles and sorts dates in multiple mode', async () => {
    const calendar = CalendarDriver.mount({
      props: { mode: 'multiple' },
      modelValue: ['2026-09-10'],
    });

    expect(calendar.root.find('[role="grid"]').attributes('aria-multiselectable')).toBe('true');
    await calendar.clickDay('2026-09-03');
    expect(calendar.value).toEqual(['2026-09-03', '2026-09-10']);
    await calendar.clickDay('2026-09-10');
    expect(calendar.value).toEqual(['2026-09-03']);
    expect(calendar.selected).toEqual(['2026-09-03']);
    calendar.unmount();
  });

  it('picks ranges by two clicks, swaps reversed ends, previews on hover and supports drag', async () => {
    const calendar = CalendarDriver.mount({ props: { mode: 'range' } });

    await calendar.clickDay('2026-09-10');
    expect(calendar.value).toEqual({ start: '2026-09-10', end: null });
    expect(calendar.hasModifier('picking')).toBe(true);
    await calendar.hoverDay('2026-09-14');

    expect(calendar.cellState('2026-09-12')).toEqual({
      start: false,
      end: false,
      middle: true,
      preview: true,
    });

    expect(calendar.cellState('2026-09-14')).toEqual({
      start: false,
      end: true,
      middle: false,
      preview: true,
    });

    await calendar.clickDay('2026-09-05');
    expect(calendar.value).toEqual({ start: '2026-09-05', end: '2026-09-10' });

    expect(calendar.cellState('2026-09-05')).toEqual({
      start: true,
      end: false,
      middle: false,
      preview: false,
    });

    expect(calendar.cellState('2026-09-07').middle).toBe(true);

    expect(calendar.selected).toEqual(
      expect.arrayContaining(['2026-09-05', '2026-09-07', '2026-09-10']),
    );

    expect(calendar.dayClasses('2026-09-07')).not.toContain('selected');
    await calendar.dragDays('2026-09-20', '2026-09-23');
    expect(calendar.value).toEqual({ start: '2026-09-20', end: '2026-09-23' });
    await calendar.clickDay('2026-09-01');
    expect(calendar.value).toEqual({ start: '2026-09-01', end: null });
    calendar.unmount();
  });

  it('shows presets in range mode and marks the matching one as pressed', async () => {
    const calendar = CalendarDriver.mount({
      props: {
        mode: 'range',
        months: 2,
        presets: [
          { label: 'Сегодня', range: (today) => ({ start: today, end: today }) },
          { label: 'Неделя', range: { start: '2026-09-21', end: '2026-09-27' } },
        ],
      },
      month: '2026-07',
    });

    expect(calendar.hasModifier('multi')).toBe(true);
    expect(calendar.captions).toEqual(['июль 2026', 'август 2026']);
    expect(calendar.navHidden('next', 0)).toBe(true);
    expect(calendar.navHidden('previous', 1)).toBe(true);
    expect(calendar.presetLabels).toEqual(['Сегодня', 'Неделя']);
    await calendar.clickPreset('Неделя');
    expect(calendar.value).toEqual({ start: '2026-09-21', end: '2026-09-27' });
    expect(calendar.presetPressed('Неделя')).toBe(true);
    expect(calendar.captions).toEqual(['август 2026', 'сентябрь 2026']);
    await calendar.clickPreset('Сегодня');
    expect(calendar.value).toEqual({ start: '2026-09-24', end: '2026-09-24' });
    expect(calendar.presetPressed('Неделя')).toBe(false);
    await calendar.clickNav('next', 1);
    expect(calendar.captions).toEqual(['сентябрь 2026', 'октябрь 2026']);
    calendar.unmount();
  });

  it('renders function presets before today is known and resolves them from the clock after mount', async () => {
    const calendar = CalendarDriver.mount({
      clock: true,
      props: {
        mode: 'range',
        presets: [{ label: 'Сегодня', range: (today) => ({ start: today, end: today }) }],
      },
    });

    expect(calendar.presetLabels).toEqual(['Сегодня']);
    expect(calendar.presetPressed('Сегодня')).toBe(false);
    await calendar.clickPreset('Сегодня');

    expect(calendar.value).toEqual(
      expect.objectContaining({ start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
    );

    expect(calendar.presetPressed('Сегодня')).toBe(true);
    calendar.unmount();
  });

  it('follows external model changes without stealing focus', async () => {
    const calendar = CalendarDriver.mount({ modelValue: '2026-09-24' });

    await calendar.focusOutside();
    await calendar.receive('2026-12-05');
    expect(calendar.captions).toEqual(['декабрь 2026']);
    expect(calendar.tabStop).toBe('2026-12-05');
    expect(calendar.focusedDate).toBeUndefined();
    calendar.unmount();
  });

  it('names its controls in its locale and lets label props win', () => {
    const russian = CalendarDriver.mount();
    expect(russian.navLabel('previous')).toBe('Предыдущий месяц');
    expect(russian.navLabel('next')).toBe('Следующий месяц');
    expect(russian.todayButton.text()).toBe('Сегодня');

    const english = CalendarDriver.mount({ props: { locale: 'en-GB', todayLabel: 'Now' } });
    expect(english.navLabel('previous')).toBe('Previous month');
    expect(english.todayButton.text()).toBe('Now');
  });

  it('gives every month its own picker id so two-month calendars keep their controls unambiguous', async () => {
    const calendar = CalendarDriver.mount({ modelValue: '2026-09-24', props: { months: 2 } });

    await calendar.clickTitle('month');
    expect(calendar.pickerIds).toHaveLength(2);
    expect(new Set(calendar.pickerIds).size).toBe(2);
    expect(calendar.titleControls).toEqual(calendar.pickerIds);
    calendar.unmount();
  });
});
