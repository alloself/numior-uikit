import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref, type Ref } from 'vue';
import type { NuiFieldProps, NuiNumberFieldProps } from '../../src';
import NumberFieldScene from '../fixtures/NumberFieldScene.vue';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface NumberFieldMountOptions {
  readonly props?: NuiNumberFieldProps;
  readonly modelValue?: number | null;
  readonly field?: NuiFieldProps;
  readonly locale?: string;
  readonly prefix?: string;
}

type NumberFieldSceneWrapper = VueWrapper<InstanceType<typeof NumberFieldScene>>;

export class NumberFieldDriver extends ComponentDriver {
  protected readonly block = 'nui-number-field';

  static mount({ props, modelValue, field, locale, prefix }: NumberFieldMountOptions = {}) {
    const current = ref(locale);

    return new NumberFieldDriver(
      mount(NumberFieldScene, {
        props: { props, initialValue: modelValue, field, prefix },
        attachTo: document.body,
        global: { plugins: configPlugins({ locale: () => current.value }) },
      }),
      current,
    );
  }

  private constructor(
    private readonly scene: NumberFieldSceneWrapper,
    private readonly locale: Ref<string | undefined>,
  ) {
    super(scene);
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
    return this.scene.vm.model;
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

  get hiddenDisabled(): boolean {
    return this.wrapper.find<HTMLInputElement>('input[type="hidden"]').element.disabled;
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
    this.scene.vm.model = value;
    await nextTick();
  }

  async receiveProps(props: NuiNumberFieldProps): Promise<void> {
    await this.scene.setProps({ props });
  }

  async setLocale(locale: string): Promise<void> {
    this.locale.value = locale;
    await nextTick();
  }
}
