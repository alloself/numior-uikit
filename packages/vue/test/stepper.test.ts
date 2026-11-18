import { describe, expect, it, vi } from 'vite-plus/test';
import { StepperDriver, StepperStepsDriver } from './drivers/stepper';

describe('NuiStepper', () => {
  it('lists the steps with the current one marked, completed ones before it and upcoming after', async () => {
    const stepper = StepperDriver.mount();
    await stepper.ready();

    expect(stepper.label).toBe('Steps');
    expect(stepper.listRole).toBe('list');
    expect(stepper.hasModifier('orientation-horizontal')).toBe(true);
    expect(stepper.names).toEqual(['Account, completed', 'Profile', 'Plan', 'Review']);
    expect(stepper.statuses).toEqual(['complete', 'upcoming', 'upcoming', 'upcoming']);
    expect(stepper.current).toBe('Profile');
    expect(stepper.tags).toEqual(['button', 'button', 'span', 'span']);
    expect(stepper.marks).toEqual(['check', '2', '3', '4']);
    expect(stepper.connectors).toBe(3);
    expect(stepper.summary).toBe('Step 2 of 4');
    expect(stepper.summaryLabel).toBe('Profile');
  });

  it('goes back through a completed step and ignores the current and future steps when linear', async () => {
    const stepper = StepperDriver.mount({ modelValue: 'plan' });

    await stepper.clickStep('Plan');
    expect(stepper.value).toBe('plan');

    await stepper.clickStep('Review');
    expect(stepper.value).toBe('plan');

    await stepper.clickStep('Account');
    expect(stepper.value).toBe('account');
    expect(stepper.current).toBe('Account');
    expect(stepper.tags).toEqual(['button', 'span', 'span', 'span']);
  });

  it('lets any enabled step be chosen when not linear and marks explicit errors', async () => {
    const stepper = StepperDriver.mount({
      modelValue: 'account',
      props: { linear: false, orientation: 'vertical' },
      steps: [
        { value: 'account', label: 'Account' },
        { value: 'profile', label: 'Profile', status: 'error' },
        { value: 'plan', label: 'Plan', status: 'complete' },
        { value: 'review', label: 'Review', disabled: true },
      ],
    });

    await stepper.ready();
    expect(stepper.hasModifier('orientation-vertical')).toBe(true);
    expect(stepper.tags).toEqual(['button', 'button', 'button', 'button']);
    expect(stepper.disabledNames).toEqual(['Review']);
    expect(stepper.names).toEqual(['Account', 'Profile, has errors', 'Plan, completed', 'Review']);
    expect(stepper.marks).toEqual(['1', 'x', 'check', '4']);

    await stepper.clickStep('Profile');
    expect(stepper.value).toBe('profile');

    await stepper.clickStep('Review');
    expect(stepper.value).toBe('profile');
  });

  it('speaks the configured language, formats step numbers and lets label props win', () => {
    const russian = StepperDriver.mount({ config: { locale: 'ru-RU' } });

    expect(russian.label).toBe('Шаги');
    expect(russian.names[0]).toBe('Account, выполнено');
    expect(russian.summary).toBe('Шаг 2 из 4');

    const arabic = StepperDriver.mount({ modelValue: 'account', config: { locale: 'ar-EG' } });

    expect(arabic.marks).toEqual(['١', '٢', '٣', '٤']);
    expect(arabic.summary).toBe('Step ١ of ٤');

    const labelled = StepperDriver.mount({
      props: { label: 'Регистрация', completeLabel: 'готово' },
      config: { locale: 'ru-RU' },
    });

    expect(labelled.label).toBe('Регистрация');
    expect(labelled.names[0]).toBe('Account, готово');
  });

  it('shows passed steps without letting any be chosen when readonly', async () => {
    const stepper = StepperDriver.mount({ modelValue: 'plan', props: { readonly: true } });
    await stepper.ready();

    expect(stepper.tag).toBe('div');
    expect(stepper.label).toBeUndefined();
    expect(stepper.hasModifier('readonly')).toBe(true);
    expect(stepper.hasModifier('orientation-vertical')).toBe(true);
    expect(stepper.tags).toEqual(['span', 'span', 'span', 'span']);
    expect(stepper.statuses).toEqual(['complete', 'complete', 'upcoming', 'upcoming']);
    expect(stepper.current).toBe('Plan');

    await stepper.clickStep('Account');

    expect(stepper.value).toBe('plan');
  });

  it('lists child steps with their titles and content in a numbered column', () => {
    const stepper = StepperStepsDriver.mount();

    expect(stepper.tag).toBe('div');
    expect(stepper.label).toBeUndefined();
    expect(stepper.hasModifier('readonly')).toBe(true);
    expect(stepper.hasModifier('orientation-vertical')).toBe(true);
    expect(stepper.items).toEqual(['nui-stepper-step', 'nui-stepper-step', 'nui-stepper-step']);
    expect(stepper.titles).toEqual(['Install the package', 'Add the plugin', 'Use the components']);
    expect(stepper.headingIds).toEqual(['add-the-plugin']);

    expect(stepper.contents).toEqual([
      'Run the install command.',
      'Register the plugin in the config.',
      '',
    ]);

    expect(stepper.buttons).toBe(0);
    expect(stepper.numerals).toEqual(['decimal', 'decimal', 'decimal']);
  });

  it('numbers child steps in the digits of the locale and keeps a requested row', () => {
    const arabic = StepperStepsDriver.mount({ config: { locale: 'ar-EG' } });

    expect(arabic.numerals).toEqual(['arabic-indic', 'arabic-indic', 'arabic-indic']);

    const row = StepperStepsDriver.mount({ props: { orientation: 'horizontal' } });

    expect(row.hasModifier('orientation-horizontal')).toBe(true);
  });

  it('refuses a child step outside a readonly stepper', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() => StepperStepsDriver.mount({ props: { readonly: false } })).toThrow(
      'NuiStepperStep must be rendered inside a readonly NuiStepper',
    );

    warn.mockRestore();
  });
});
