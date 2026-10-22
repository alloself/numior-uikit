import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { NuiRadioGroup, type NuiFieldProps, type NuiRadioGroupProps } from '../../src';
import RadioGroupScene from '../fixtures/RadioGroupScene.vue';
import { ComponentDriver } from './component';

export interface RadioGroupMountOptions {
  readonly props?: NuiRadioGroupProps<string>;
  readonly modelValue?: string;
  readonly values?: string[];
  readonly field?: NuiFieldProps;
  readonly disabledValues?: string[];
}

export class RadioGroupDriver extends ComponentDriver {
  protected readonly block = 'nui-radio-group';

  private constructor(
    wrapper: VueWrapper,
    private readonly emitter: VueWrapper,
  ) {
    super(wrapper);
  }

  static mount(options: RadioGroupMountOptions = {}) {
    const wrapper = mount(RadioGroupScene, { props: options });

    return new RadioGroupDriver(wrapper, wrapper.findComponent(NuiRadioGroup));
  }

  get group(): DOMWrapper<Element> {
    return this.wrapper.find('[role="radiogroup"]');
  }

  get radios(): DOMWrapper<HTMLInputElement>[] {
    return this.wrapper.findAll<HTMLInputElement>('input[type="radio"]');
  }

  get names(): Array<string | undefined> {
    return this.radios.map((radio) => radio.attributes('name'));
  }

  get checkedValue(): string | undefined {
    return this.radios.find((radio) => radio.element.checked)?.element.value;
  }

  get disabledValues(): string[] {
    return this.radios.reduce<string[]>((found, radio) => {
      if (radio.element.disabled) {
        found.push(radio.element.value);
      }
      return found;
    }, []);
  }

  get legendText(): string {
    return this.wrapper.find('legend').text();
  }

  radio(value: string): DOMWrapper<HTMLInputElement> {
    const radio = this.radios.find((candidate) => candidate.element.value === value);
    if (!radio) {
      throw new Error(`No radio with value ${value}`);
    }
    return radio;
  }

  async select(value: string): Promise<void> {
    const radio = this.radio(value);
    radio.element.checked = true;
    await radio.trigger('change');
  }

  async click(value: string): Promise<void> {
    await this.radio(value).trigger('click');
  }

  get emittedValues(): string[] {
    return (this.emitter.emitted('update:modelValue') ?? []).flatMap(([value]) =>
      typeof value === 'string' ? [value] : [],
    );
  }
}
