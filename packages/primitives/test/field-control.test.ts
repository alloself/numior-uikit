import { describe, expect, it } from 'vitest';
import { ControlHarness, DraftHarness } from './harness/field';

describe('useFieldControl', () => {
  it('works standalone with its own id and no field state', () => {
    const control = ControlHarness.inside(null);
    expect(control.id).toBeTruthy();
    expect(control.describedBy).toBeUndefined();
    expect(control.ariaInvalid).toBeUndefined();
    expect(control.required).toBe(false);
    expect(control.disabled).toBe(false);
  });

  it('adopts the field id, description and state', () => {
    const control = ControlHarness.inside({
      id: 'name',
      hasDescription: true,
      hasError: true,
      required: true,
      disabled: true,
    });

    expect(control.id).toBe('name');
    expect(control.describedBy).toBe('name-description name-error');
    expect(control.ariaInvalid).toBe('true');
    expect(control.required).toBe(true);
    expect(control.disabled).toBe(true);
  });

  it('adopts readonly from the field as the native attribute or as aria-readonly', () => {
    const native = ControlHarness.inside({ id: 'code', readonly: true });
    expect(native.readonly).toBe(true);
    expect(native.ariaReadonly).toBeUndefined();

    const aria = ControlHarness.inside(
      { id: 'plan', readonly: true },
      {},
      {
        readonlyAttr: 'aria-readonly',
      },
    );

    expect(aria.readonly).toBe(false);
    expect(aria.ariaReadonly).toBe('true');
    const released = ControlHarness.inside({ id: 'code', readonly: true }, { readonly: false });
    expect(released.readonly).toBe(false);
  });

  it('lets explicit props override the field', () => {
    const control = ControlHarness.inside(
      { id: 'name', hasError: true, required: true },
      { id: 'custom', invalid: false, required: false },
    );

    expect(control.id).toBe('custom');
    expect(control.ariaInvalid).toBeUndefined();
    expect(control.required).toBe(false);
  });

  it('ignores a group field unless the control is the group root', () => {
    const group = { id: 'plan', labelable: false, hasError: true };
    const plain = ControlHarness.inside(group);
    expect(plain.id).not.toBe('plan');
    expect(plain.ariaInvalid).toBeUndefined();
    const root = ControlHarness.inside(group, {}, { group: true });
    expect(root.id).toBe('plan');
    expect(root.describedBy).toBe('plan-error');
    expect(root.ariaInvalid).toBe('true');
  });

  it('creates its own field from label, description and error when nothing wraps it', () => {
    const control = ControlHarness.inside(null, {
      label: 'Имя',
      description: 'Подсказка',
      error: 'Ошибка',
    });

    expect(control.own).toBe(true);
    expect(control.labelledBy).toBe(`${control.id}-label`);
    expect(control.describedBy).toBe(`${control.id}-description ${control.id}-error`);
    expect(control.ariaInvalid).toBe('true');
    expect(control.frameField).toBe(control.id);

    expect(
      ControlHarness.inside(null, { label: 'Имя' }, { inlineLabel: true }).labelledBy,
    ).toBeUndefined();

    expect(
      ControlHarness.inside(null, { description: 'Только подсказка' }).ariaInvalid,
    ).toBeUndefined();

    expect(ControlHarness.inside(null, {}).own).toBe(true);
    expect(ControlHarness.inside(null, {}, { detached: true }).own).toBe(false);
  });

  it('lets a surrounding field win over the texts of the control', () => {
    const control = ControlHarness.inside(
      { id: 'name', hasDescription: true },
      { label: 'Имя', error: 'Ошибка' },
    );

    expect(control.own).toBe(false);
    expect(control.id).toBe('name');
    expect(control.describedBy).toBe('name-description');
    expect(control.ariaInvalid).toBeUndefined();
    expect(control.frameField).toBe('name');
  });

  it('hands its draft commit to the surrounding form field until it unmounts', () => {
    const commits: string[] = [];
    const draft = DraftHarness.mount(() => commits.push('committed'));

    draft.flush();
    draft.unmount();
    draft.flush();
    expect(commits).toEqual(['committed']);
  });
});
