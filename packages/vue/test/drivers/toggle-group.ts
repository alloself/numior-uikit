import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { NuiToggleGroup, type NuiToggleGroupProps, type NuiToggleItem } from '../../src';
import { createSelection, type Selection, type SelectionValue } from '../support/selection';
import { ComponentDriver } from './component';

export interface ToggleGroupMountOptions {
  readonly props?: Omit<NuiToggleGroupProps<unknown>, 'items'>;
  readonly items?: readonly NuiToggleItem<unknown>[];
  readonly modelValue?: SelectionValue;
}

const THEME_ITEMS: readonly NuiToggleItem[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor', disabled: true },
  { value: 'auto', label: 'Auto' },
];

export class ToggleGroupDriver extends ComponentDriver {
  protected readonly block = 'nui-toggle-group';

  private constructor(
    wrapper: VueWrapper,
    private readonly selection: Selection,
  ) {
    super(wrapper);
  }

  static mount({ props = {}, items = THEME_ITEMS, modelValue }: ToggleGroupMountOptions = {}) {
    const selection = createSelection(modelValue, props.multiple === true);

    const Host = defineComponent({
      setup: () => () =>
        h('div', [
          h(NuiToggleGroup, { ...props, items, ...selection.props() }),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });

    return new ToggleGroupDriver(mount(Host, { attachTo: document.body }), selection);
  }

  get selected(): SelectionValue {
    return this.selection.value();
  }

  get root(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-toggle-group');
  }

  override hasModifier(modifier: string): boolean {
    return this.root.classes().includes(`nui-toggle-group--${modifier}`);
  }

  override attribute(name: string): string | undefined {
    return this.root.attributes(name);
  }

  get items(): DOMWrapper<HTMLButtonElement>[] {
    return this.wrapper.findAll<HTMLButtonElement>('.nui-toggle-group__item');
  }

  get labels(): string[] {
    return this.items.map((item) => item.text() || (item.attributes('aria-label') ?? ''));
  }

  get selectedLabels(): string[] {
    return this.items
      .filter((item) => item.classes('nui-toggle-group__item--selected'))
      .map((item) => item.text() || (item.attributes('aria-label') ?? ''));
  }

  get checkedStates(): Array<string | undefined> {
    return this.items.map((item) => item.attributes('aria-checked'));
  }

  get pressedStates(): Array<string | undefined> {
    return this.items.map((item) => item.attributes('aria-pressed'));
  }

  get roles(): Array<string | undefined> {
    return this.items.map((item) => item.attributes('role'));
  }

  get tabIndexes(): number[] {
    return this.items.map((item) => item.element.tabIndex);
  }

  get focusedLabel(): string | undefined {
    const focused = this.items.find((item) => item.element === document.activeElement);

    return focused?.text();
  }

  get hasLabels(): boolean {
    return this.wrapper.find('.nui-toggle-group__label').exists();
  }

  item(label: string): DOMWrapper<HTMLButtonElement> {
    const found = this.items.find(
      (item) => item.text() === label || item.attributes('aria-label') === label,
    );

    if (!found) {
      throw new Error(`No item labelled ${label}`);
    }
    return found;
  }

  async ready(): Promise<void> {
    await nextTick();
  }

  async click(label: string): Promise<void> {
    await this.item(label).trigger('click');
  }

  async focus(label: string): Promise<void> {
    this.item(label).element.focus();
    await nextTick();
  }

  async press(key: string): Promise<void> {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

    (document.activeElement ?? document.body).dispatchEvent(event);
    await nextTick();
  }

  async focusOutside(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('.outside').element.focus();
    await nextTick();
  }
}
