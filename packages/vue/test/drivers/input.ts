import { mount, type DOMWrapper } from '@vue/test-utils';
import { defineComponent, h, useTemplateRef } from 'vue';
import { NuiInput, type NuiInputModifiers, type NuiInputProps } from '../../src';
import { ComponentDriver, emittedStrings } from './component';

export interface InputMountOptions {
  readonly props?: NuiInputProps;
  readonly modelValue?: string;
  readonly modifiers?: Partial<Record<NuiInputModifiers, true>>;
  readonly attrs?: Record<string, unknown>;
  readonly slots?: Record<string, () => unknown>;
  readonly attachToBody?: boolean;
}

export class InputDriver extends ComponentDriver {
  protected readonly block = 'nui-input';

  static mount({
    props = {},
    modelValue,
    modifiers,
    attrs = {},
    slots = {},
    attachToBody = false,
  }: InputMountOptions = {}) {
    return new InputDriver(
      mount(NuiInput, {
        props: {
          ...props,
          ...(modelValue === undefined ? {} : { modelValue }),
          ...(modifiers ? { modelModifiers: modifiers } : {}),
        },
        attrs,
        slots,
        ...(attachToBody ? { attachTo: document.body } : {}),
      }),
    );
  }

  get control(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('input');
  }

  get value(): string {
    return this.control.element.value;
  }

  get emittedValues(): string[] {
    return emittedStrings(this.wrapper, 'update:modelValue');
  }

  get focused(): boolean {
    return document.activeElement === this.control.element;
  }

  get prefix(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-input__prefix');
  }

  get suffix(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-input__suffix');
  }

  async type(text: string): Promise<void> {
    this.control.element.value = text;
    await this.control.trigger('input');
  }

  async commit(): Promise<void> {
    await this.control.trigger('change');
  }

  focusNatively(): void {
    this.control.element.focus();
  }

  async receiveModelValue(value: string): Promise<void> {
    await this.wrapper.setProps({ modelValue: value });
  }
}

export const mountInputWithFocusHandle = () => {
  const Host = defineComponent({
    setup() {
      const input = useTemplateRef<InstanceType<typeof NuiInput>>('input');
      return { focusInput: () => input.value?.focus() };
    },
    render() {
      return h(NuiInput, { ref: 'input' });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  return {
    focus: () => wrapper.vm.focusInput(),
    control: wrapper.find<HTMLInputElement>('input'),
    unmount: () => wrapper.unmount(),
  };
};
