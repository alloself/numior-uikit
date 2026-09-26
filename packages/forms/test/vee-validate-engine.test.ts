import { describe, expect, it } from 'vitest';
import { NuiFormError, required, type SubmittedValues } from '../src';
import { veeValidateEngine } from '../src/vee-validate';
import { FieldArrayDriver } from './drivers/field-array';
import { FormDriver } from './drivers/form';
import { VeeInterop } from './harness/vee-interop';

const rejectTaken = (values: SubmittedValues<{ name: string; email: string }>): void => {
  if (values.email === 'taken@example.com') {
    throw new NuiFormError({ email: 'This address is taken' });
  }
};

describe('forms on the vee-validate engine', () => {
  it('checks, focuses, submits and keeps a server error like the own engine', async () => {
    const form = FormDriver.mount({
      engine: veeValidateEngine,
      initialValues: { name: '', email: '' },
      fields: [
        { path: 'name', label: 'Name', rules: [required()] },
        { path: 'email', label: 'Email' },
      ],
      onSubmit: rejectTaken,
    });

    await form.submit();
    expect(form.error('name')).toBe('Fill in this field');
    expect(form.focused).toBe('name');

    await form.type('name', 'Ann');
    await form.type('email', 'taken@example.com');
    await form.submit();
    expect(form.error('email')).toBe('This address is taken');

    await form.type('email', 'ann@example.com');
    await form.submit();
    expect(form.submissions.at(-1)).toEqual({ name: 'Ann', email: 'ann@example.com' });
    expect(form.form.meta.value).toMatchObject({ submitted: true, dirty: false });
  });

  it('adds, moves and removes rows with their values and focus', async () => {
    const list = FieldArrayDriver.mount({
      engine: veeValidateEngine,
      names: ['Ann', 'Bob'],
      reorderable: true,
    });

    await list.add();
    await list.type(2, 'Cid');
    await list.press(0, ' ');
    await list.press(0, 'ArrowDown');
    await list.press(0, 'Enter');
    expect(list.names).toEqual(['Bob', 'Ann', 'Cid']);

    await list.remove(0);
    expect(list.names).toEqual(['Ann', 'Cid']);
    expect(list.values).toEqual([{ name: 'Ann' }, { name: 'Cid' }]);
  });

  it('shares its values with components built on vee-validate useField', async () => {
    const interop = VeeInterop.mount('ann');

    expect(interop.veeValue).toBe('ann');
    await interop.typeInVee('bob');
    expect(interop.formValue).toBe('bob');
    await interop.setInForm('cid');
    expect(interop.veeValue).toBe('cid');
  });
});
