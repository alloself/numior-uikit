import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import type { NuiConfigOptions, NuiStepperProps, NuiStepperStep } from '../../src';
import StepperScene from '../fixtures/StepperScene.vue';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface StepperMountOptions {
  readonly steps?: readonly NuiStepperStep[];
  readonly modelValue?: string;
  readonly props?: Partial<Omit<NuiStepperProps, 'steps'>>;
  readonly config?: NuiConfigOptions;
}

type StepperSceneWrapper = VueWrapper<InstanceType<typeof StepperScene>>;

const STEPS: readonly NuiStepperStep[] = [
  { value: 'account', label: 'Account' },
  { value: 'profile', label: 'Profile', description: 'Name and photo' },
  { value: 'plan', label: 'Plan' },
  { value: 'review', label: 'Review' },
];

const MARKS = ['check', 'x'] as const;

const markOf = (indicator: DOMWrapper<Element>): string => {
  const glyph = indicator.find('.nui-icon__glyph');
  const classes = glyph.exists() ? glyph.classes() : [];

  return MARKS.find((mark) => classes.includes(`lucide-${mark}`)) ?? indicator.text();
};

export class StepperDriver extends ComponentDriver {
  protected readonly block = 'nui-stepper';

  static mount({
    steps = STEPS,
    modelValue = 'profile',
    props,
    config,
  }: StepperMountOptions = {}): StepperDriver {
    return new StepperDriver(
      mount(StepperScene, {
        props: { steps, initialValue: modelValue, props },
        global: { plugins: configPlugins(config) },
      }),
    );
  }

  private constructor(private readonly scene: StepperSceneWrapper) {
    super(scene);
  }

  get value(): string {
    return this.scene.vm.model;
  }

  get label(): string | undefined {
    return this.wrapper.find('nav').attributes('aria-label');
  }

  get listRole(): string | undefined {
    return this.wrapper.find('ol').attributes('role');
  }

  private get steps(): DOMWrapper<Element>[] {
    return this.wrapper.findAll('.nui-stepper__step');
  }

  get names(): string[] {
    return this.steps.map((step) => step.find('.nui-row__title').text());
  }

  get tags(): string[] {
    return this.steps.map((step) => step.element.tagName.toLowerCase());
  }

  get disabledNames(): string[] {
    return this.steps.reduce<string[]>((found, step) => {
      if (step.attributes('disabled') !== undefined) {
        found.push(step.find('.nui-row__title').text());
      }
      return found;
    }, []);
  }

  get statuses(): string[] {
    return this.wrapper.findAll('.nui-stepper__item').map(
      (item) =>
        item
          .classes()
          .find((name) => /--(complete|upcoming|error)$/.test(name))
          ?.replace('nui-stepper__item--', '') ?? '',
    );
  }

  get current(): string | undefined {
    const step = this.steps.find((candidate) => candidate.attributes('aria-current') === 'step');
    return step?.find('.nui-row__title').text();
  }

  get marks(): string[] {
    return this.wrapper.findAll('.nui-stepper__indicator').map(markOf);
  }

  get summary(): string {
    return this.wrapper.find('.nui-stepper__summary-count').text();
  }

  get summaryLabel(): string {
    return this.wrapper.find('.nui-stepper__summary-label').text();
  }

  get connectors(): number {
    return this.wrapper.findAll('.nui-stepper__connector').length;
  }

  async ready(): Promise<void> {
    await vi.waitFor(() => {
      const loading = this.wrapper
        .findAll('.nui-stepper__mark')
        .some((mark) => !mark.find('.nui-icon__glyph').exists());

      if (loading) {
        throw new Error('Step marks are still loading');
      }
    });
  }

  async clickStep(name: string): Promise<void> {
    const step = this.steps.find((candidate) =>
      candidate.find('.nui-row__title').text().startsWith(name),
    );

    if (!step) {
      throw new Error(`No step ${name}`);
    }

    await step.trigger('click');
    await nextTick();
  }
}
