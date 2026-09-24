import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { FieldHarness } from './harness/field';

describe('field context', () => {
  it('is absent outside a field', () => {
    const field = FieldHarness.outside();
    expect(field.present).toBe(false);
  });

  it('derives ids and describedby from what the field renders', () => {
    const field = FieldHarness.inside({
      id: 'email',
      hasLabel: true,
      hasDescription: true,
      hasError: true,
      required: true,
    });

    expect(field.id).toBe('email');
    expect(field.labelId).toBe('email-label');
    expect(field.labelledBy).toBe('email-label');
    expect(field.describedBy).toBe('email-description email-error');
    expect(field.invalid).toBe(true);
    expect(field.required).toBe(true);
    expect(field.labelable).toBe(true);
  });

  it('follows reactive options and marks group fields as not labelable', async () => {
    const hasError = ref(false);

    const field = FieldHarness.inside({
      id: 'plan',
      hasError,
      labelable: false,
      disabled: () => true,
    });

    expect(field.describedBy).toBeUndefined();
    expect(field.labelledBy).toBeUndefined();
    expect(field.invalid).toBe(false);
    expect(field.labelable).toBe(false);
    expect(field.disabled).toBe(true);
    hasError.value = true;
    await nextTick();
    expect(field.describedBy).toBe('plan-error');
    expect(field.invalid).toBe(true);
  });
});
