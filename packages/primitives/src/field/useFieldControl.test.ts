import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, type PropType } from 'vue';
import { provideField, type FieldOptions } from './field-context';
import {
  useFieldControl,
  type FieldControlOptions,
  type FieldControlProps,
} from './useFieldControl';

const Control = defineComponent({
  props: {
    control: { type: Object as PropType<FieldControlProps>, default: () => ({}) },
    options: { type: Object as PropType<FieldControlOptions>, default: () => ({}) },
  },
  setup(props) {
    const { attrs } = useFieldControl(props.control, props.options);
    return () => h('input', attrs.value);
  },
});

function mountIn(field: FieldOptions | null, control: FieldControlProps = {}, options = {}) {
  return mount(
    defineComponent({
      setup() {
        if (field) provideField(field);
        return () => h(Control, { control, options });
      },
    }),
  ).find('input');
}

describe('useFieldControl', () => {
  it('works standalone with its own id and no field state', () => {
    const input = mountIn(null);
    expect(input.attributes('id')).toBeTruthy();
    expect(input.attributes('aria-describedby')).toBeUndefined();
    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(input.attributes('required')).toBeUndefined();
    expect(input.attributes('disabled')).toBeUndefined();
  });

  it('adopts the field id, description and state', () => {
    const input = mountIn({
      id: 'name',
      hasDescription: true,
      hasError: true,
      required: true,
      disabled: true,
    });
    expect(input.attributes('id')).toBe('name');
    expect(input.attributes('aria-describedby')).toBe('name-description name-error');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(input.attributes('required')).toBe('');
    expect(input.attributes('disabled')).toBe('');
  });

  it('lets explicit props override the field', () => {
    const input = mountIn(
      { id: 'name', hasError: true, required: true },
      { id: 'custom', invalid: false, required: false },
    );
    expect(input.attributes('id')).toBe('custom');
    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(input.attributes('required')).toBeUndefined();
  });

  it('ignores a group field unless the control is the group root', () => {
    const group: FieldOptions = { id: 'plan', labelable: false, hasError: true };
    const plain = mountIn(group);
    expect(plain.attributes('id')).not.toBe('plan');
    expect(plain.attributes('aria-invalid')).toBeUndefined();
    const root = mountIn(group, {}, { group: true });
    expect(root.attributes('id')).toBe('plan');
    expect(root.attributes('aria-describedby')).toBe('plan-error');
    expect(root.attributes('aria-invalid')).toBe('true');
  });
});
