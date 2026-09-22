import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { provideField, useField, type FieldOptions } from './field-context';

const Probe = defineComponent({
  setup() {
    const field = useField();
    return () =>
      h(
        'output',
        field
          ? {
              'data-id': field.id.value,
              'data-label': field.labelId.value,
              'data-described': field.describedBy.value ?? '',
              'data-invalid': String(field.invalid.value),
              'data-required': String(field.required.value),
              'data-disabled': String(field.disabled.value),
              'data-labelable': String(field.labelable.value),
            }
          : { 'data-missing': 'true' },
      );
  },
});

function mountField(options: FieldOptions) {
  return mount(
    defineComponent({
      setup() {
        provideField(options);
        return () => h('div', [h(Probe)]);
      },
    }),
  ).find('output');
}

describe('field context', () => {
  it('is absent outside a field', () => {
    expect(mount(Probe).attributes('data-missing')).toBe('true');
  });

  it('derives ids and describedby from what the field renders', () => {
    const probe = mountField({ id: 'email', hasDescription: true, hasError: true, required: true });
    expect(probe.attributes('data-id')).toBe('email');
    expect(probe.attributes('data-label')).toBe('email-label');
    expect(probe.attributes('data-described')).toBe('email-description email-error');
    expect(probe.attributes('data-invalid')).toBe('true');
    expect(probe.attributes('data-required')).toBe('true');
    expect(probe.attributes('data-labelable')).toBe('true');
  });

  it('follows reactive options and marks group fields as not labelable', async () => {
    const hasError = ref(false);
    const probe = mountField({ id: 'plan', hasError, labelable: false, disabled: () => true });
    expect(probe.attributes('data-described')).toBe('');
    expect(probe.attributes('data-invalid')).toBe('false');
    expect(probe.attributes('data-labelable')).toBe('false');
    expect(probe.attributes('data-disabled')).toBe('true');
    hasError.value = true;
    await nextTick();
    expect(probe.attributes('data-described')).toBe('plan-error');
    expect(probe.attributes('data-invalid')).toBe('true');
  });
});
