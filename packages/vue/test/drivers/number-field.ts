import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { NuiField, NuiNumberField, type NuiFieldProps, type NuiNumberFieldProps } from '../../src';
import { configScope } from '../support/config-scope';
import { ComponentDriver } from './component';

export interface NumberFieldMountOptions {
  readonly props?: NuiNumberFieldProps;
  readonly modelValue?: number | null;
  readonly field?: NuiFieldProps;
  readonly locale?: string;
  readonly slots?: Record<string, () => unknown>;
}

const isModel = (value: unknown): value is number | null =>
  value === null || typeof value === 'number';

export class NumberFieldDriver extends ComponentDriver {
  protected readonly block = 'nui-number-field';

  static mount({
    props = {},
    modelValue = null,
    field,
    locale,
    slots = {},
  }: NumberFieldMountOptions = {}) {
    const model = ref<number | null>(modelValue);
    const history: Array<number | null> = [];
    const localeRef = ref(locale);
    const control = () =>
      h(
        NuiNumberField,
        {
          ...props,
          modelValue: model.value,
          'onUpdate:modelValue': (value: unknown) => {
            if (isModel(value)) {
              model.value = value;
              history.push(value);
            }
          },
        },
        slots,
      );
    const inField = () => (field ? h(NuiField, field, control) : control());
    const Host = defineComponent({
      setup: () => () =>
        h('div', [
          h(configScope({ locale: () => localeRef.value }, inField)),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });
    return new NumberFieldDriver(
      mount(Host, { attachTo: document.body }),
      model,
      history,
      localeRef,
    );
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly model: Ref<number | null>,
    readonly history: Array<number | null>,
    private readonly localeRef: Ref<string | undefined>,
  ) {
    super(wrapper);
  }

  override hasModifier(modifier: string): boolean {
    return this.wrapper
      .find('.nui-number-field')
      .classes()
      .includes(`nui-number-field--${modifier}`);
  }

  get control(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('.nui-number-field__control');
  }

  get text(): string {
    return this.control.element.value;
  }

  get value(): number | null {
    return this.model.value;
  }

  get ariaNow(): string | undefined {
    return this.control.attributes('aria-valuenow');
  }

  get ariaText(): string | undefined {
    return this.control.attributes('aria-valuetext');
  }

  get ariaBounds(): [string | undefined, string | undefined] {
    return [this.control.attributes('aria-valuemin'), this.control.attributes('aria-valuemax')];
  }

  get inputMode(): string | undefined {
    return this.control.attributes('inputmode');
  }

  get steppers(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-number-field__steppers');
  }

  get incrementButton(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('.nui-number-field__stepper--up');
  }

  get decrementButton(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('.nui-number-field__stepper--down');
  }

  get hiddenValue(): string | undefined {
    const hidden = this.wrapper.find<HTMLInputElement>('input[type="hidden"]');
    return hidden.exists() ? hidden.element.value : undefined;
  }

  get fieldLabelFor(): string | undefined {
    return this.wrapper.find('label').attributes('for');
  }

  get describedBy(): string | undefined {
    return this.control.attributes('aria-describedby');
  }

  get prefixText(): string {
    return this.wrapper.find('.nui-number-field__prefix').text();
  }

  async type(text: string): Promise<void> {
    this.control.element.value = text;
    await this.control.trigger('input');
  }

  async insert(data: string): Promise<boolean> {
    const event = new InputEvent('beforeinput', {
      data,
      inputType: 'insertText',
      cancelable: true,
      bubbles: true,
    });
    this.control.element.dispatchEvent(event);
    await nextTick();
    return event.defaultPrevented;
  }

  async blur(): Promise<void> {
    await this.control.trigger('blur');
  }

  async press(key: string, init: { shiftKey?: boolean } = {}): Promise<void> {
    await this.control.trigger('keydown', { key, ...init });
    await nextTick();
  }

  async clickIncrement(): Promise<void> {
    await this.incrementButton.trigger('click');
  }

  async clickDecrement(): Promise<void> {
    await this.decrementButton.trigger('click');
  }

  async receiveModelValue(value: number | null): Promise<void> {
    this.model.value = value;
    await nextTick();
  }

  async setLocale(locale: string): Promise<void> {
    this.localeRef.value = locale;
    await nextTick();
  }
}
