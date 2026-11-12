import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { NuiDateRange, NuiDateRangePickerProps, NuiFieldProps } from '../../src';
import DateRangePickerScene from '../fixtures/DateRangePickerScene.vue';
import { configPlugins } from '../support/config';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';
import { typeInto } from '../support/text-input';

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

    const scene = mount(DateRangePickerScene, {
      props: { picker: { today: '2026-09-24', ...props }, field, modelValue },
      attachTo: document.body,
      global: { plugins: configPlugins({ locale: 'ru-RU' }) },
    });

    return new DateRangePickerDriver(scene, stubs);
  }

  private constructor(
    private readonly scene: VueWrapper<InstanceType<typeof DateRangePickerScene>>,
    private readonly stubs: TopLayerStubs,
  ) {
    super(scene);
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
    return this.scene.vm.model;
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

  get endFocused(): boolean {
    return document.activeElement === this.inputs[1]?.element;
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

  async leave(index: number): Promise<void> {
    await this.inputs[index]?.trigger('blur');
    await nextTick();
  }

  async clickInput(index: number): Promise<void> {
    const input = this.inputs[index];

    if (!input) {
      throw new Error(`No input ${index}`);
    }

    input.element.focus();
    await input.trigger('click');
    await nextTick();
  }

  async typeKeys(index: number, keys: string): Promise<void> {
    const input = this.inputs[index];

    if (!input) {
      throw new Error(`No input ${index}`);
    }

    typeInto(input.element, keys);
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
