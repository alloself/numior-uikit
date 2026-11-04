import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vite-plus/test';
import type { NuiControlEntry } from '@numior/primitives';
import { kitControls } from '../src/controls';

interface Sample {
  readonly entry: NuiControlEntry;
  readonly value: unknown;
  readonly props: Readonly<Record<string, unknown>>;
}

const OPTIONS = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B', disabled: true },
];

const SAMPLES: readonly Sample[] = [
  { entry: kitControls.text, value: 'Ann', props: { type: 'email', placeholder: 'Почта' } },
  { entry: kitControls.textarea, value: 'Bio', props: { rows: 2, resize: 'none' } },
  { entry: kitControls.number, value: 3, props: { min: 0, max: 10, step: 1 } },
  { entry: kitControls.select, value: 'a', props: { options: OPTIONS, clearable: true } },
  { entry: kitControls.combobox, value: 'a', props: { options: OPTIONS, multiple: false } },
  { entry: kitControls.checkbox, value: true, props: { size: 'sm' } },
  { entry: kitControls.switch, value: false, props: {} },
  { entry: kitControls.radio, value: 'a', props: { options: OPTIONS, orientation: 'horizontal' } },
  { entry: kitControls.date, value: '2026-09-28', props: { min: '2026-01-01', clearable: true } },
  { entry: kitControls.dateRange, value: { start: '2026-09-01', end: null }, props: {} },
  { entry: kitControls.time, value: '10:30', props: { step: 15 } },
  {
    entry: kitControls.otp,
    value: '4829',
    props: { length: 4, groupSize: 2, charset: 'digits', secret: true, placeholder: '·' },
  },
];

describe('kit controls', () => {
  it('accepts its sample value and props, rejects unknown props and mounts with them', () => {
    for (const { entry, value, props } of SAMPLES) {
      expect(entry.accepts(value)).toBe(true);
      expect(entry.props(props)).toBe(true);
      expect(entry.props({ ...props, bogus: 1 })).toBe(false);

      const wrapper = mount(entry.component, { props: { ...props, [entry.model]: value } });
      expect(wrapper.find('[class^="nui-"]').exists()).toBe(true);

      wrapper.unmount();
    }
  });

  it('rejects values of another kind', () => {
    expect(kitControls.text.accepts(1)).toBe(false);
    expect(kitControls.number.accepts('1')).toBe(false);
    expect(kitControls.checkbox.accepts('yes')).toBe(false);
    expect(kitControls.dateRange.accepts({ start: 1, end: null })).toBe(false);
    expect(kitControls.otp.accepts(4829)).toBe(false);
    expect(kitControls.otp.props({ charset: 'hex' })).toBe(false);
  });
});
