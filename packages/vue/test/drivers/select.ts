import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { NuiField, NuiSelect, type NuiFieldProps, type NuiSelectProps } from '../../src';
import { FRUITS } from '../support/options';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

type SelectValue = string | string[] | undefined;

export interface SelectMountOptions {
  readonly props?: Partial<NuiSelectProps<unknown>>;
  readonly modelValue?: SelectValue;
  readonly field?: NuiFieldProps;
}

const isSelectValue = (value: unknown): value is SelectValue =>
  value === undefined ||
  typeof value === 'string' ||
  (Array.isArray(value) && value.every((entry) => typeof entry === 'string'));

const labelOf = (element: Element): string =>
  (element.querySelector('.nui-listbox__label')?.textContent ?? '').trim();

export class SelectDriver extends ComponentDriver {
  protected readonly block = 'nui-select';

  static mount({ props = {}, modelValue, field }: SelectMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const model = ref<SelectValue>(modelValue);
    const select = () =>
      h(NuiSelect, {
        options: FRUITS,
        ...props,
        ...(model.value === undefined ? {} : { modelValue: model.value }),
        'onUpdate:modelValue': (value: unknown) => {
          if (isSelectValue(value)) {
            model.value = value;
          }
        },
      });
    const Host = defineComponent({
      setup: () => () =>
        h('div', [
          field ? h(NuiField, field, select) : select(),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });
    return new SelectDriver(mount(Host, { attachTo: document.body }), stubs, model);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly model: Ref<SelectValue>,
  ) {
    super(wrapper);
  }

  override hasModifier(modifier: string): boolean {
    return this.wrapper.find('.nui-select').classes().includes(`nui-select--${modifier}`);
  }

  get trigger(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('[role="combobox"]');
  }

  get listbox(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('[role="listbox"]');
  }

  get expanded(): boolean {
    return this.trigger.attributes('aria-expanded') === 'true';
  }

  get valueText(): string {
    return this.wrapper.find('.nui-select__value').text();
  }

  get value(): SelectValue {
    return this.model.value;
  }

  get labelledBy(): string | undefined {
    return this.trigger.attributes('aria-labelledby');
  }

  get fieldLabelId(): string | undefined {
    return this.wrapper.find('label').attributes('id');
  }

  get focusedOption(): string | undefined {
    const active = document.activeElement;
    return active instanceof HTMLElement && active.getAttribute('role') === 'option'
      ? labelOf(active)
      : undefined;
  }

  get triggerFocused(): boolean {
    return document.activeElement === this.trigger.element;
  }

  get selectedLabels(): string[] {
    return this.wrapper
      .findAll('[role="option"][aria-selected="true"]')
      .map((option) => labelOf(option.element));
  }

  get groupLabels(): string[] {
    return this.wrapper.findAll('.nui-listbox__group-label').map((label) => label.text());
  }

  get hiddenValues(): string[] {
    return this.wrapper
      .findAll<HTMLInputElement>('input[type="hidden"]')
      .map((input) => input.element.value);
  }

  get emptyText(): string {
    const empty = this.wrapper.find('.nui-listbox__empty');
    return empty.exists() ? empty.text() : '';
  }

  get clearButton(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-select__clear');
  }

  private option(label: string): DOMWrapper<HTMLElement> {
    const found = this.wrapper
      .findAll<HTMLElement>('[role="option"]')
      .find((option) => labelOf(option.element) === label);
    if (!found) {
      throw new Error(`No option labelled ${label}`);
    }
    return found;
  }

  async pressTrigger(key: string): Promise<void> {
    await this.trigger.trigger('keydown', { key });
    await nextTick();
  }

  async press(key: string): Promise<void> {
    vi.advanceTimersByTime(1);
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    (document.activeElement ?? document.body).dispatchEvent(event);
    await nextTick();
    await nextTick();
  }

  async clickOption(label: string): Promise<void> {
    await this.option(label).trigger('click');
    await nextTick();
  }

  async hoverOption(label: string): Promise<void> {
    await this.option(label).trigger('pointermove');
  }

  async clickClear(): Promise<void> {
    await this.clearButton.trigger('click');
  }

  async focusOutside(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('.outside').element.focus();
    await nextTick();
  }

  async advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
