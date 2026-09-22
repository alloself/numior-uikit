import { mount, type DOMWrapper } from '@vue/test-utils';
import { h } from 'vue';
import {
  NuiField,
  NuiRadio,
  NuiRadioGroup,
  type NuiFieldProps,
  type NuiRadioGroupProps,
} from '../../src';
import { ComponentDriver } from './component';

export interface RadioGroupMountOptions {
  readonly props?: NuiRadioGroupProps;
  readonly modelValue?: string;
  readonly values?: string[];
  readonly field?: NuiFieldProps;
  readonly disabledValues?: string[];
}

export class RadioGroupDriver extends ComponentDriver {
  protected readonly block = 'nui-radio-group';

  static mount({
    props = {},
    modelValue,
    values = ['a', 'b', 'c'],
    field,
    disabledValues = [],
  }: RadioGroupMountOptions = {}) {
    const radios = () =>
      values.map((value) =>
        h(
          NuiRadio,
          { value, key: value, ...(disabledValues.includes(value) ? { disabled: true } : {}) },
          () => value,
        ),
      );
    const group = () =>
      h(NuiRadioGroup, { ...props, ...(modelValue === undefined ? {} : { modelValue }) }, radios);
    const wrapper = field
      ? mount(NuiField, { props: field, slots: { default: group } })
      : mount(NuiRadioGroup, {
          props: { ...props, ...(modelValue === undefined ? {} : { modelValue }) },
          slots: { default: radios },
        });
    return new RadioGroupDriver(wrapper);
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
    return this.radios
      .filter((radio) => radio.element.disabled)
      .map((radio) => radio.element.value);
  }

  get legendText(): string {
    return this.wrapper.find('legend').text();
  }

  radio(value: string): DOMWrapper<HTMLInputElement> {
    const radio = this.radios.find((candidate) => candidate.element.value === value);
    if (!radio) throw new Error(`No radio with value ${value}`);
    return radio;
  }

  async select(value: string): Promise<void> {
    const radio = this.radio(value);
    radio.element.checked = true;
    await radio.trigger('change');
  }

  get emittedValues(): string[] {
    const emitter = this.wrapper.findComponent(NuiRadioGroup);
    return (emitter.emitted('update:modelValue') ?? []).flatMap(([value]) =>
      typeof value === 'string' ? [value] : [],
    );
  }
}
