import { describe, expect, it } from 'vitest';
import { TimeFieldDriver } from './drivers/time-field';

describe('NuiTimeField', () => {
  it('lays out segments from the locale, hour cycle and seconds', () => {
    const us = TimeFieldDriver.mount({ locale: 'en-US' });
    expect(us.segmentLabels).toEqual(['hour', 'minute', 'AM/PM']);
    expect(us.literals).toEqual([':', '']);
    us.unmount();
    const german = TimeFieldDriver.mount({ locale: 'de-DE' });
    expect(german.segmentLabels).toEqual(['Stunde', 'Minute']);
    german.unmount();
    const forced = TimeFieldDriver.mount({ locale: 'en-US', props: { hourCycle: 'h23' } });
    expect(forced.segments).toHaveLength(2);
    forced.unmount();
    const precise = TimeFieldDriver.mount({ locale: 'en-US', props: { seconds: true } });
    expect(precise.segmentLabels).toEqual(['hour', 'minute', 'second', 'AM/PM']);
    precise.unmount();
  });

  it('renders placeholders for an empty model and splits a model into segments', async () => {
    const empty = TimeFieldDriver.mount({ locale: 'en-US' });
    expect(empty.segmentTexts).toEqual(['', '', '']);
    expect(empty.segments[0]?.attributes('placeholder')).toBe('--');
    empty.unmount();
    const us = TimeFieldDriver.mount({ locale: 'en-US', modelValue: '13:05' });
    expect(us.segmentTexts).toEqual(['01', '05', 'PM']);
    await us.setLocale('de-DE');
    expect(us.segmentTexts).toEqual(['13', '05']);
    us.unmount();
  });

  it('types digits with auto-advance and emits a normalised model once complete', async () => {
    const german = TimeFieldDriver.mount({ locale: 'de-DE' });
    await german.focusSegment(0);
    await german.typeText('1');
    expect(german.value).toBeNull();
    expect(german.focusedSegment).toBe(0);
    await german.typeText('3');
    expect(german.focusedSegment).toBe(1);
    await german.typeText('05');
    expect(german.value).toBe('13:05');
    german.unmount();
    const us = TimeFieldDriver.mount({ locale: 'en-US' });
    await us.focusSegment(0);
    await us.typeText('9');
    expect(us.focusedSegment).toBe(1);
    await us.typeText('05');
    expect(us.value).toBeNull();
    await us.typeText('p');
    expect(us.value).toBe('21:05');
    expect(us.segmentTexts).toEqual(['09', '05', 'PM']);
    us.unmount();
    const pasted = TimeFieldDriver.mount({ locale: 'de-DE' });
    await pasted.focusSegment(0);
    await pasted.insert('0930');
    expect(pasted.value).toBe('09:30');
    pasted.unmount();
  });

  it('steps segments with wrap-around, jumps to the bounds and clears', async () => {
    const field = TimeFieldDriver.mount({ locale: 'de-DE', modelValue: '23:00' });
    await field.focusSegment(0);
    await field.press('ArrowUp');
    expect(field.value).toBe('00:00');
    await field.focusSegment(1);
    await field.press('ArrowDown');
    expect(field.value).toBe('00:59');
    await field.press('Backspace');
    expect(field.value).toBeNull();
    expect(field.segmentTexts).toEqual(['00', '']);
    await field.press('Home');
    expect(field.value).toBe('00:00');
    await field.press('End');
    expect(field.value).toBe('00:59');
    field.unmount();
    const period = TimeFieldDriver.mount({ locale: 'en-US', modelValue: '09:00' });
    await period.focusSegment(2);
    await period.press('ArrowUp');
    expect(period.value).toBe('21:00');
    period.unmount();
  });

  it('moves between segments with arrows, keeps one tab stop and stays left-to-right in RTL', async () => {
    const field = TimeFieldDriver.mount({ locale: 'en-US', modelValue: '13:05', dir: 'rtl' });
    expect(field.tabStops).toEqual([0]);
    expect(field.segmentTexts).toEqual(['01', '05', 'PM']);
    await field.focusSegment(0);
    await field.press('ArrowRight');
    expect(field.focusedSegment).toBe(1);
    await field.press('ArrowRight');
    expect(field.focusedSegment).toBe(2);
    await field.press('ArrowLeft');
    expect(field.focusedSegment).toBe(1);
    await field.press('Enter');
    expect(field.focusedSegment).toBe(2);
    field.unmount();
  });

  it('focuses the first empty segment, or the hours, when the field itself is clicked', async () => {
    const filled = TimeFieldDriver.mount({ locale: 'de-DE', modelValue: '13:05' });
    await filled.clickField();
    expect(filled.focusedSegment).toBe(0);
    filled.unmount();
    const partial = TimeFieldDriver.mount({ locale: 'de-DE' });
    await partial.focusSegment(0);
    await partial.typeText('10');
    await partial.focusOutside();
    await partial.clickField();
    expect(partial.focusedSegment).toBe(1);
    partial.unmount();
  });

  it('shifts the whole time by the step with PageUp and PageDown inside the bounds', async () => {
    const field = TimeFieldDriver.mount({
      locale: 'de-DE',
      modelValue: '17:45',
      props: { min: '09:00', max: '18:00', step: 30 },
    });
    await field.focusSegment(1);
    await field.press('PageUp');
    expect(field.value).toBe('18:00');
    await field.press('PageDown');
    expect(field.value).toBe('17:30');
    field.unmount();
    const empty = TimeFieldDriver.mount({ locale: 'de-DE' });
    await empty.focusSegment(0);
    await empty.press('PageUp');
    expect(empty.value).toBeNull();
    empty.unmount();
  });

  it('suggests times by step and picks one with the pointer or the keyboard', async () => {
    const field = TimeFieldDriver.mount({
      locale: 'en-US',
      modelValue: '09:30',
      props: { min: '09:00', max: '10:00', step: 30 },
    });
    expect(field.listbox.attributes('popover')).toBe('auto');
    expect(field.expanded).toBe(false);
    await field.clickClock();
    expect(field.expanded).toBe(true);
    expect(field.hasModifier('open')).toBe(true);
    expect(field.optionLabels).toEqual(['9:00 AM', '9:30 AM', '10:00 AM']);
    expect(field.selectedLabels).toEqual(['9:30 AM']);
    await field.clickOption('10:00 AM');
    expect(field.value).toBe('10:00');
    expect(field.expanded).toBe(false);
    expect(field.focusedSegment).toBe(0);
    await field.press('ArrowDown', { altKey: true });
    expect(field.expanded).toBe(true);
    await field.press('ArrowDown');
    await field.press('Enter');
    expect(field.value).toBe('09:00');
    expect(field.focusedSegment).toBe(0);
    await field.clickClock();
    await field.dismissNatively();
    expect(field.expanded).toBe(false);
    await field.clickClock();
    await field.focusOutside();
    expect(field.expanded).toBe(false);
    field.unmount();
    const none = TimeFieldDriver.mount({
      props: { min: '12:00', max: '09:00', emptyLabel: 'Nothing' },
    });
    expect(none.optionLabels).toEqual([]);
    expect(none.emptyText).toBe('Nothing');
    none.unmount();
  });

  it('clamps a complete time into the range when focus leaves and mirrors external changes', async () => {
    const field = TimeFieldDriver.mount({
      locale: 'de-DE',
      props: { min: '09:00', max: '18:00' },
    });
    await field.focusSegment(0);
    await field.typeText('0730');
    expect(field.value).toBe('07:30');
    await field.focusOutside();
    expect(field.value).toBe('09:00');
    expect(field.segmentTexts).toEqual(['09', '00']);
    field.unmount();
    const us = TimeFieldDriver.mount({ locale: 'en-US', modelValue: '09:00' });
    await us.receiveModelValue('15:45');
    expect(us.segmentTexts).toEqual(['03', '45', 'PM']);
    await us.receiveModelValue(null);
    expect(us.segmentTexts).toEqual(['', '', '']);
    us.unmount();
  });

  it('wires into a field, mirrors the model into a named hidden input and respects states', async () => {
    const field = TimeFieldDriver.mount({
      locale: 'en-US',
      modelValue: '13:05',
      props: { name: 'start', invalid: true },
      field: { label: 'Start', description: 'Local time' },
    });
    expect(field.fieldLabelFor).toBe(field.hourId);
    expect(field.group.attributes('aria-labelledby')).toBeDefined();
    expect(field.group.attributes('aria-describedby')).toBeDefined();
    expect(field.segments.every((segment) => segment.attributes('aria-invalid') === 'true')).toBe(
      true,
    );
    expect(field.hiddenValue).toBe('13:05');
    field.unmount();
    const disabled = TimeFieldDriver.mount({ props: { disabled: true } });
    expect(disabled.segments.every((segment) => segment.attributes('disabled') !== undefined)).toBe(
      true,
    );
    expect(disabled.clockButton.attributes('disabled')).toBeDefined();
    disabled.unmount();
    const readonly = TimeFieldDriver.mount({
      locale: 'de-DE',
      modelValue: '10:00',
      props: { readonly: true },
    });
    await readonly.focusSegment(0);
    await readonly.press('ArrowUp');
    await readonly.typeText('5');
    expect(readonly.value).toBe('10:00');
    readonly.unmount();
  });

  it('displays and accepts Eastern Arabic digits and periods', async () => {
    const field = TimeFieldDriver.mount({ locale: 'ar-EG', modelValue: '13:05' });
    expect(field.segmentTexts.slice(0, 2)).toEqual(['٠١', '٠٥']);
    expect(field.segmentTexts[2]).toBe('م');
    await field.focusSegment(0);
    await field.typeText('٠٩');
    await field.typeText('٣٠');
    await field.typeText('ص');
    expect(field.value).toBe('09:30');
    field.unmount();
  });
});
