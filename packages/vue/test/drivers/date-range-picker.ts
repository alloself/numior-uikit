import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import {
  NuiDateRangePicker,
  NuiField,
  type NuiDateRange,
  type NuiDateRangePickerProps,
  type NuiFieldProps,
} from '../../src';
import { configScope } from '../support/config-scope';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';
import { isDateRange } from '../support/guards';

export interface DateRangePickerMountOptions {
  readonly props?: NuiDateRangePickerProps;
  readonly modelValue?: NuiDateRange;
  readonly field?: NuiFieldProps;
}

export class DateRangePickerDriver extends ComponentDriver {
  protected readonly block = 'nui-date-picker';

  static mount({
    props = {},
    modelValue = { start: null, end: null },
    field,
  }: DateRangePickerMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const model = ref<NuiDateRange>(modelValue);

    const control = () =>
      h(NuiDateRangePicker, {
        today: '2026-09-24',
        ...props,
        modelValue: model.value,
        'onUpdate:modelValue': (value: unknown) => {
          if (isDateRange(value)) {
            model.value = value;
          }
        },
      });

    const inField = () => (field ? h(NuiField, field, control) : control());

    const Host = defineComponent({
      setup: () => () =>
        h('div', [
          h(configScope({ locale: 'ru-RU' }, inField)),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });

    return new DateRangePickerDriver(mount(Host, { attachTo: document.body }), stubs, model);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly model: Ref<NuiDateRange>,
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

  get openLabel(): string | undefined {
    return this.wrapper.find('.nui-date-picker__open').attributes('aria-label');
  }

  get inputs(): DOMWrapper<HTMLInputElement>[] {
    return this.wrapper.findAll<HTMLInputElement>('.nui-date-picker__input');
  }

  get texts(): string[] {
    return this.inputs.map((input) => input.element.value);
  }

  get value(): NuiDateRange {
    return this.model.value;
  }

  get isOpen(): boolean {
    return this.hasModifier('open');
  }

  get months(): number {
    return this.wrapper.findAll('.nui-calendar__month').length;
  }

  get presetLabels(): string[] {
    return this.wrapper.findAll('.nui-calendar__preset').map((preset) => preset.text());
  }

  get startFocused(): boolean {
    return document.activeElement === this.inputs[0]?.element;
  }

  get hiddenValues(): string[] {
    return this.wrapper
      .findAll<HTMLInputElement>('input[type="hidden"]')
      .map((input) => input.element.value);
  }

  async type(index: number, text: string): Promise<void> {
    const input = this.inputs[index];

    if (!input) {
      throw new Error(`No input ${index}`);
    }

    input.element.value = text;
    await input.trigger('input');
    await nextTick();
  }

  async clickOpen(): Promise<void> {
    await this.wrapper.find('.nui-date-picker__open').trigger('click');
    await nextTick();
  }

  async clickDay(date: string): Promise<void> {
    const day = this.wrapper.find(`time[datetime="${date}"]`).element.closest('button');

    day?.focus();
    day?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    day?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    await nextTick();
  }

  async clickPreset(label: string): Promise<void> {
    const preset = this.wrapper.findAll('.nui-calendar__preset').find((el) => el.text() === label);

    await preset?.trigger('click');
    await nextTick();
  }

  async clickClear(): Promise<void> {
    await this.wrapper.find('.nui-date-picker__clear').trigger('click');
    await nextTick();
  }
}
