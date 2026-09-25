import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { NuiDatePicker, NuiField, type NuiDatePickerProps, type NuiFieldProps } from '../../src';
import { configScope } from '../support/config-scope';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface DatePickerMountOptions {
  readonly props?: NuiDatePickerProps;
  readonly modelValue?: string | null;
  readonly field?: NuiFieldProps;
  readonly locale?: string;
}

const isModel = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

export class DatePickerDriver extends ComponentDriver {
  protected readonly block = 'nui-date-picker';

  static mount({
    props = {},
    modelValue = null,
    field,
    locale = 'ru-RU',
  }: DatePickerMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const model = ref<string | null>(modelValue);

    const control = () =>
      h(NuiDatePicker, {
        today: '2026-09-24',
        ...props,
        modelValue: model.value,
        'onUpdate:modelValue': (value: unknown) => {
          if (isModel(value)) {
            model.value = value;
          }
        },
      });

    const inField = () => (field ? h(NuiField, field, control) : control());

    const Host = defineComponent({
      setup: () => () =>
        h('div', [
          h(configScope({ locale }, inField)),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });

    return new DatePickerDriver(mount(Host, { attachTo: document.body }), stubs, model);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly model: Ref<string | null>,
  ) {
    super(wrapper);
  }

  override unmount(): void {
    super.unmount();
    this.stubs.restore();
  }

  override hasModifier(modifier: string): boolean {
    return this.wrapper.find('.nui-date-picker').classes().includes(`nui-date-picker--${modifier}`);
  }

  get input(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('.nui-date-picker__input');
  }

  get text(): string {
    return this.input.element.value;
  }

  get value(): string | null {
    return this.model.value;
  }

  get panel(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-date-picker__panel');
  }

  get openButton(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-date-picker__open');
  }

  get clearButton(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-date-picker__clear');
  }

  get expanded(): boolean {
    return this.openButton.attributes('aria-expanded') === 'true';
  }

  get isOpen(): boolean {
    return this.hasModifier('open');
  }

  get focusedDate(): string | undefined {
    const active = document.activeElement;

    return active instanceof HTMLElement && active.classList.contains('nui-calendar__day')
      ? (active.querySelector('time')?.getAttribute('datetime') ?? undefined)
      : undefined;
  }

  get inputFocused(): boolean {
    return document.activeElement === this.input.element;
  }

  get timeSegments(): string[] {
    return this.wrapper
      .findAll<HTMLInputElement>('.nui-time-field__segment')
      .map((segment) => segment.element.value);
  }

  async pressInTime(key: string): Promise<void> {
    const segment = this.wrapper.find('.nui-time-field__segment');

    segment.element.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );

    await nextTick();
  }

  get hiddenValue(): string | undefined {
    const hidden = this.wrapper.find<HTMLInputElement>('input[type="hidden"]');

    return hidden.exists() ? hidden.element.value : undefined;
  }

  async type(text: string): Promise<void> {
    this.input.element.value = text;
    await this.input.trigger('input');
    await nextTick();
  }

  async blur(): Promise<void> {
    await this.input.trigger('blur');
    await nextTick();
  }

  async focusInput(): Promise<void> {
    this.input.element.focus();
    await nextTick();
  }

  async pressInput(key: string): Promise<void> {
    await this.input.trigger('keydown', { key });
    await nextTick();
  }

  async pressInPanel(key: string): Promise<void> {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

    (document.activeElement ?? document.body).dispatchEvent(event);
    await nextTick();
  }

  async clickOpen(): Promise<void> {
    await this.openButton.trigger('click');
    await nextTick();
  }

  async clickClear(): Promise<void> {
    await this.clearButton.trigger('click');
    await nextTick();
  }

  async clickDay(date: string): Promise<void> {
    const day = this.wrapper.find(`time[datetime="${date}"]`).element.closest('button');

    day?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await nextTick();
  }

  async focusOutside(): Promise<void> {
    const outside = this.wrapper.find<HTMLButtonElement>('.outside').element;
    const previous = document.activeElement;

    outside.focus();
    previous?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    await nextTick();
  }

  async receive(value: string | null): Promise<void> {
    this.model.value = value;
    await nextTick();
  }
}
