import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { NuiComboboxProps, NuiConfigOptions, NuiFieldProps } from '../../src';
import { anyOf, isString, listOf, nullable } from '../../../primitives/test/support/guards';
import ComboboxScene from '../fixtures/ComboboxScene.vue';
import { configPlugins } from '../support/config';
import { FRUITS } from '../support/options';
import { TopLayerStubs } from '../support/top-layer';
import type { SelectionValue } from '../support/selection';
import { ComponentDriver } from './component';

export interface ComboboxMountOptions {
  readonly props?: Partial<NuiComboboxProps<unknown>>;
  readonly modelValue?: SelectionValue;
  readonly field?: NuiFieldProps;
  readonly custom?: boolean;
  readonly config?: NuiConfigOptions;
}

type ComboboxProps = Partial<NuiComboboxProps<unknown>>;

const isStrings = listOf(isString);

const isSelection = anyOf(nullable(isString), isStrings);

const asText = (text: string): string => text;

const withCustom = (
  props: NuiComboboxProps<unknown>,
  custom: boolean,
): NuiComboboxProps<unknown> => (custom ? { ...props, customValue: asText } : props);

const labelOf = (element: Element): string =>
  (element.querySelector('.nui-row__title')?.textContent ?? '').trim();

export class ComboboxDriver extends ComponentDriver {
  protected readonly block = 'nui-combobox';

  static mount({
    props = {},
    modelValue,
    field,
    custom = false,
    config,
  }: ComboboxMountOptions = {}) {
    const stubs = new TopLayerStubs();

    const scene = mount(ComboboxScene, {
      props: {
        combobox: withCustom({ options: FRUITS, ...props }, custom),
        field,
        modelValue: typeof modelValue === 'string' ? modelValue : null,
        values: isStrings(modelValue) ? modelValue : [],
      },
      attachTo: document.body,
      global: { plugins: configPlugins(config) },
    });

    return new ComboboxDriver(scene, stubs, props.multiple === true, custom);
  }

  private constructor(
    private readonly scene: VueWrapper<InstanceType<typeof ComboboxScene>>,
    private readonly stubs: TopLayerStubs,
    private readonly multiple: boolean,
    private readonly custom: boolean,
  ) {
    super(scene);
  }

  get searches(): readonly string[] {
    return this.scene.vm.searches;
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

  get value(): SelectionValue {
    const value = this.multiple ? this.scene.vm.values : this.scene.vm.model;

    if (!isSelection(value)) {
      throw new Error('the selection holds a value that is not a string');
    }
    return value;
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

  get toggleIcon(): boolean {
    return this.wrapper.find('.nui-combobox__toggle .nui-combobox__chevron.nui-icon').exists();
  }

  get toggleLabel(): string | undefined {
    return this.wrapper.find('.nui-combobox__toggle').attributes('aria-label');
  }

  get clearLabel(): string | undefined {
    return this.wrapper.find('.nui-combobox__clear').attributes('aria-label');
  }

  get chipRemoveLabels(): Array<string | undefined> {
    return this.wrapper
      .findAll('.nui-chip__remove')
      .map((button) => button.attributes('aria-label'));
  }

  get chips(): string[] {
    return this.wrapper.findAll('.nui-chip__label').map((chip) => chip.text());
  }

  get chipRemoveTabStops(): Array<string | undefined> {
    return this.wrapper.findAll('.nui-chip__remove').map((button) => button.attributes('tabindex'));
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

  async press(key: string, init: KeyboardEventInit = {}): Promise<boolean> {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    this.input.element.dispatchEvent(event);
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

  async receive(patch: ComboboxProps): Promise<void> {
    await this.scene.setProps({
      combobox: withCustom({ ...this.scene.props('combobox'), ...patch }, this.custom),
    });
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
