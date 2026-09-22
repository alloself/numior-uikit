import { mount, type DOMWrapper } from '@vue/test-utils';
import { NuiCheckbox, type NuiCheckboxProps } from '../../src';
import { ComponentDriver } from './component';
import { waitForGlyph } from './icon';

export type CheckboxModel = boolean | string[];

export interface CheckboxMountOptions {
  readonly props?: NuiCheckboxProps<string>;
  readonly modelValue?: CheckboxModel;
  readonly attrs?: Record<string, unknown>;
  readonly label?: string;
}

const MARK_GLYPH = '.nui-checkbox__mark .nui-icon__glyph';

const isModel = (value: unknown): value is CheckboxModel =>
  typeof value === 'boolean' || Array.isArray(value);

export class CheckboxDriver extends ComponentDriver {
  protected readonly block = 'nui-checkbox';

  static mount({ props = {}, modelValue, attrs = {}, label }: CheckboxMountOptions = {}) {
    return new CheckboxDriver(
      mount(NuiCheckbox, {
        props: { ...props, ...(modelValue === undefined ? {} : { modelValue }) },
        attrs,
        slots: label ? { default: label } : {},
      }),
    );
  }

  ready(): Promise<void> {
    return waitForGlyph(this.wrapper, MARK_GLYPH);
  }

  get control(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('input');
  }

  get checked(): boolean {
    return this.control.element.checked;
  }

  get indeterminate(): boolean {
    return this.control.element.indeterminate;
  }

  get emittedModels(): CheckboxModel[] {
    return (this.wrapper.emitted('update:modelValue') ?? []).flatMap(([value]) =>
      isModel(value) ? [value] : [],
    );
  }

  get markGlyphClasses(): string[] {
    return this.wrapper.find(MARK_GLYPH).classes();
  }

  get labelText(): string {
    return this.wrapper.find('.nui-checkbox__label').text();
  }

  async toggle(): Promise<void> {
    this.control.element.checked = !this.control.element.checked;
    await this.control.trigger('change');
  }

  async receive(props: NuiCheckboxProps<string> & { modelValue?: CheckboxModel }) {
    await this.wrapper.setProps(props);
    await this.ready();
  }
}
