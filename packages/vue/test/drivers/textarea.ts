import { mount } from '@vue/test-utils';
import { NuiTextarea, type NuiTextareaModifiers, type NuiTextareaProps } from '../../src';
import { ComponentDriver, emittedStrings } from './component';

export interface TextareaMountOptions {
  readonly props?: NuiTextareaProps;
  readonly modelValue?: string;
  readonly modifiers?: Partial<Record<NuiTextareaModifiers, true>>;
  readonly attrs?: Record<string, unknown>;
}

export class TextareaDriver extends ComponentDriver {
  protected readonly block = 'nui-textarea';

  static mount({ props = {}, modelValue, modifiers, attrs = {} }: TextareaMountOptions = {}) {
    return new TextareaDriver(
      mount(NuiTextarea, {
        props: {
          ...props,
          ...(modelValue === undefined ? {} : { modelValue }),
          ...(modifiers ? { modelModifiers: modifiers } : {}),
        },
        attrs,
      }),
    );
  }

  get element(): HTMLTextAreaElement {
    return this.wrapper.find<HTMLTextAreaElement>('textarea').element;
  }

  get value(): string {
    return this.element.value;
  }

  get emittedValues(): string[] {
    return emittedStrings(this.wrapper, 'update:modelValue');
  }

  async type(text: string): Promise<void> {
    this.element.value = text;
    await this.wrapper.find('textarea').trigger('input');
  }

  async commit(): Promise<void> {
    await this.wrapper.find('textarea').trigger('change');
  }
}
