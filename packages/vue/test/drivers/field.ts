import { mount, type DOMWrapper } from '@vue/test-utils';
import { h, nextTick, type VNode } from 'vue';
import { NuiField, NuiInput, type NuiFieldProps } from '../../src';
import { ComponentDriver } from './component';

export interface FieldMountOptions {
  readonly props?: NuiFieldProps;
  readonly slots?: Record<string, () => unknown>;
  readonly control?: () => VNode;
}

export class FieldDriver extends ComponentDriver {
  protected readonly block = 'nui-field';

  static mount({ props = {}, slots = {}, control = () => h(NuiInput) }: FieldMountOptions = {}) {
    return new FieldDriver(mount(NuiField, { props, slots: { default: control, ...slots } }));
  }

  get tagName(): string {
    return this.wrapper.element.tagName;
  }

  get label(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-field__label');
  }

  get control(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('input');
  }

  get describedBy(): string | undefined {
    return this.control.attributes('aria-describedby');
  }

  get ariaInvalid(): string | undefined {
    return this.control.attributes('aria-invalid');
  }

  get description(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-field__description');
  }

  get error(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-field__error');
  }

  get reservedLine(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-field__reserve');
  }

  async setError(error: string | undefined): Promise<void> {
    await this.wrapper.setProps({ error });
    await nextTick();
  }

  get showsRequiredMark(): boolean {
    return this.wrapper.find('.nui-field__required').exists();
  }

  get nativelyDisabled(): boolean {
    return this.attribute('disabled') !== undefined;
  }
}
