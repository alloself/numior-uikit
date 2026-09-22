import { mount, type DOMWrapper } from '@vue/test-utils';
import { NuiSwitch, type NuiSwitchProps } from '../../src';
import { ComponentDriver } from './component';

export interface SwitchMountOptions {
  readonly props?: NuiSwitchProps;
  readonly modelValue?: boolean;
  readonly attrs?: Record<string, unknown>;
  readonly label?: string;
}

export class SwitchDriver extends ComponentDriver {
  protected readonly block = 'nui-switch';

  static mount({ props = {}, modelValue, attrs = {}, label }: SwitchMountOptions = {}) {
    return new SwitchDriver(
      mount(NuiSwitch, {
        props: { ...props, ...(modelValue === undefined ? {} : { modelValue }) },
        attrs,
        slots: label ? { default: label } : {},
      }),
    );
  }

  get control(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('input');
  }

  get role(): string | undefined {
    return this.control.attributes('role');
  }

  get checked(): boolean {
    return this.control.element.checked;
  }

  get emittedModels(): boolean[] {
    return (this.wrapper.emitted('update:modelValue') ?? []).flatMap(([value]) =>
      typeof value === 'boolean' ? [value] : [],
    );
  }

  async toggle(): Promise<void> {
    this.control.element.checked = !this.control.element.checked;
    await this.control.trigger('change');
  }

  async receiveModelValue(value: boolean): Promise<void> {
    await this.wrapper.setProps({ modelValue: value });
  }
}
