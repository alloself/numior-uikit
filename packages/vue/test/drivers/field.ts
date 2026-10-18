import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import type { NuiFieldProps, NuiInputProps } from '../../src';
import FieldScene from '../fixtures/FieldScene.vue';
import { ComponentDriver } from './component';

export interface FieldSlotTexts {
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly error?: string | undefined;
}

export interface FieldMountOptions {
  readonly props?: NuiFieldProps;
  readonly slots?: FieldSlotTexts;
  readonly control?: NuiInputProps;
}

export class FieldDriver extends ComponentDriver {
  protected readonly block = 'nui-field';

  static mount({ props = {}, slots = {}, control = {} }: FieldMountOptions = {}) {
    return new FieldDriver(mount(FieldScene, { props: { field: props, control, slots } }));
  }

  private constructor(private readonly scene: VueWrapper<InstanceType<typeof FieldScene>>) {
    super(scene);
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
    await this.scene.setProps({ field: { ...this.scene.props('field'), error } });
  }

  get showsRequiredMark(): boolean {
    return this.wrapper.find('.nui-field__required').exists();
  }

  get nativelyDisabled(): boolean {
    return this.attribute('disabled') !== undefined;
  }
}
