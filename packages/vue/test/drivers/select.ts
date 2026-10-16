import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { defineComponent, h, nextTick } from 'vue';
import {
  NuiField,
  NuiSelect,
  type NuiConfigOptions,
  type NuiFieldProps,
  type NuiSelectProps,
} from '../../src';
import { configPlugins } from '../support/config';
import { FRUITS } from '../support/options';
import { TopLayerStubs } from '../support/top-layer';
import { createSelection, type Selection, type SelectionValue } from '../support/selection';
import { ComponentDriver } from './component';

export interface SelectMountOptions {
  readonly props?: Partial<NuiSelectProps<unknown>>;
  readonly modelValue?: SelectionValue;
  readonly field?: NuiFieldProps;
  readonly config?: NuiConfigOptions;
}

const labelOf = (element: Element): string =>
  (element.querySelector('.nui-row__title')?.textContent ?? '').trim();

export class SelectDriver extends ComponentDriver {
  protected readonly block = 'nui-select';

  static mount({ props = {}, modelValue, field, config }: SelectMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const selection = createSelection(modelValue, props.multiple === true);

    const select = () =>
      h(NuiSelect, {
        options: FRUITS,
        ...props,
        ...selection.props(),
      });

    const Host = defineComponent({
      setup: () => () =>
        h('div', [
          field ? h(NuiField, field, select) : select(),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });

    return new SelectDriver(
      mount(Host, { attachTo: document.body, global: { plugins: configPlugins(config) } }),
      stubs,
      selection,
    );
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly selection: Selection,
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
    return this.wrapper.find<HTMLElement>('.nui-select__listbox');
  }

  get tree(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-select__listbox[role="tree"]');
  }

  get treeFocused(): boolean {
    return this.tree.exists() && document.activeElement === this.tree.element;
  }

  get treeActiveLabel(): string | undefined {
    const id = this.tree.attributes('aria-activedescendant');
    const active = id === undefined ? undefined : this.wrapper.find(`[id="${id}"]`);
    return active?.exists() ? labelOf(active.element) : undefined;
  }

  private treeItem(label: string): DOMWrapper<HTMLElement> {
    const found = this.wrapper
      .findAll<HTMLElement>('[role="treeitem"]')
      .find((item) => labelOf(item.element) === label);

    if (!found) {
      throw new Error(`No tree item labelled ${label}`);
    }
    return found;
  }

  treeAttr(label: string, name: string): string | undefined {
    return this.treeItem(label).attributes(name);
  }

  async clickTreeToggle(label: string): Promise<void> {
    await this.treeItem(label).find('.nui-tree__toggle').trigger('click');
    await nextTick();
  }

  async clickTreeItem(label: string): Promise<void> {
    await this.treeItem(label).find('.nui-row__title').trigger('click');
    await nextTick();
  }

  async clickTreeCheckbox(label: string): Promise<void> {
    await this.treeItem(label).find('.nui-tree__checkbox').trigger('click');
    await nextTick();
  }

  get expanded(): boolean {
    return this.trigger.attributes('aria-expanded') === 'true';
  }

  get valueText(): string {
    return this.wrapper.find('.nui-select__value').text();
  }

  get value(): SelectionValue {
    return this.selection.value();
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
    return this.wrapper.findAll('.nui-list__group-label').map((label) => label.text());
  }

  get hiddenValues(): string[] {
    return this.wrapper
      .findAll<HTMLInputElement>('input[type="hidden"]')
      .map((input) => input.element.value);
  }

  get hiddenDisabled(): boolean[] {
    return this.wrapper
      .findAll<HTMLInputElement>('input[type="hidden"]')
      .map((input) => input.element.disabled);
  }

  get emptyText(): string {
    const empty = this.wrapper.find('.nui-list__empty');
    return empty.exists() ? empty.text() : '';
  }

  get clearButton(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-select__clear');
  }

  get clearLabel(): string | undefined {
    return this.clearButton.attributes('aria-label');
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
  }

  async clickOption(label: string): Promise<void> {
    await this.option(label).trigger('click');
    await nextTick();
  }

  async leaveListbox(): Promise<void> {
    await this.listbox.trigger('pointerleave');
    await nextTick();
  }

  get activeLabel(): string | undefined {
    const active = this.wrapper.find('.nui-list-item--active');

    return active.exists() ? labelOf(active.element) : undefined;
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
