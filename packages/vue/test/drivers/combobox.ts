import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { NuiCombobox, NuiField, type NuiComboboxProps, type NuiFieldProps } from '../../src';
import { FRUITS } from '../support/options';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

type ComboboxValue = string | string[] | undefined;

export interface ComboboxMountOptions {
  readonly props?: Partial<NuiComboboxProps<unknown>>;
  readonly modelValue?: ComboboxValue;
  readonly field?: NuiFieldProps;
  readonly custom?: boolean;
}

const isComboboxValue = (value: unknown): value is ComboboxValue =>
  value === undefined ||
  typeof value === 'string' ||
  (Array.isArray(value) && value.every((entry) => typeof entry === 'string'));

const labelOf = (element: Element): string =>
  (element.querySelector('.nui-row__title')?.textContent ?? '').trim();

export class ComboboxDriver extends ComponentDriver {
  protected readonly block = 'nui-combobox';

  static mount({ props = {}, modelValue, field, custom = false }: ComboboxMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const model = ref<ComboboxValue>(modelValue);
    const extra = ref<Partial<NuiComboboxProps<unknown>>>({});
    const searches: string[] = [];

    const combobox = () =>
      h(NuiCombobox, {
        options: FRUITS,
        ...props,
        ...extra.value,
        ...(custom ? { customValue: (text: string) => text } : {}),
        ...(model.value === undefined ? {} : { modelValue: model.value }),
        'onUpdate:modelValue': (value: unknown) => {
          if (isComboboxValue(value)) {
            model.value = value;
          }
        },
        onSearch: (query: string) => {
          searches.push(query);
        },
      });

    const Host = defineComponent({
      setup: () => () =>
        h('div', [
          field ? h(NuiField, field, combobox) : combobox(),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });

    return new ComboboxDriver(
      mount(Host, { attachTo: document.body }),
      stubs,
      model,
      extra,
      searches,
    );
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly model: Ref<ComboboxValue>,
    private readonly extra: Ref<Partial<NuiComboboxProps<unknown>>>,
    readonly searches: string[],
  ) {
    super(wrapper);
  }

  override hasModifier(modifier: string): boolean {
    return this.wrapper.find('.nui-combobox').classes().includes(`nui-combobox--${modifier}`);
  }

  get input(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('input[role="combobox"]');
  }

  get listbox(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-combobox__listbox');
  }

  get expanded(): boolean {
    return this.input.attributes('aria-expanded') === 'true';
  }

  get text(): string {
    return this.input.element.value;
  }

  get value(): ComboboxValue {
    return this.model.value;
  }

  get activeLabel(): string | undefined {
    const id = this.input.attributes('aria-activedescendant');
    const active = id === undefined ? null : document.getElementById(id);
    return active ? labelOf(active) : undefined;
  }

  get optionLabels(): string[] {
    return this.wrapper.findAll('[role="option"]').map((option) => labelOf(option.element));
  }

  get statusText(): string {
    const status = this.wrapper.find('.nui-list__status, .nui-list__empty');
    return status.exists() ? status.text() : '';
  }

  get chips(): string[] {
    return this.wrapper.findAll('.nui-chip__label').map((chip) => chip.text());
  }

  get hiddenValues(): string[] {
    return this.wrapper
      .findAll<HTMLInputElement>('input[type="hidden"]')
      .map((input) => input.element.value);
  }

  get inputFocused(): boolean {
    return document.activeElement === this.input.element;
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

  async type(text: string): Promise<void> {
    this.input.element.focus();
    this.input.element.value = text;
    await this.input.trigger('input');
    await nextTick();
  }

  async press(key: string): Promise<boolean> {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    this.input.element.dispatchEvent(event);
    await nextTick();
    await nextTick();
    return event.defaultPrevented;
  }

  async clickOption(label: string): Promise<void> {
    await this.option(label).trigger('click');
    await nextTick();
  }

  async hoverOption(label: string): Promise<void> {
    await this.option(label).trigger('pointermove');
  }

  async clickField(): Promise<void> {
    await this.wrapper.find('.nui-combobox__field').trigger('click');
    await nextTick();
  }

  async clickToggle(): Promise<void> {
    await this.wrapper.find('.nui-combobox__toggle').trigger('click');
    await nextTick();
  }

  async clickClear(): Promise<void> {
    await this.wrapper.find('.nui-combobox__clear').trigger('click');
    await nextTick();
  }

  async removeChip(label: string): Promise<void> {
    const chip = this.wrapper
      .findAll('.nui-chip')
      .find((entry) => entry.find('.nui-chip__label').text() === label);

    if (!chip) {
      throw new Error(`No chip labelled ${label}`);
    }
    await chip.find('.nui-chip__remove').trigger('click');
    await nextTick();
  }

  async focusOutside(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('.outside').element.focus();
    await nextTick();
  }

  async receive(patch: Partial<NuiComboboxProps<unknown>>): Promise<void> {
    this.extra.value = { ...this.extra.value, ...patch };
    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
