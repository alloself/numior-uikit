import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { NuiToggleGroupProps, NuiToggleItem } from '../../src';
import ToggleGroupScene from '../fixtures/ToggleGroupScene.vue';
import { createSelection, type Selection, type SelectionValue } from '../support/selection';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface ToggleGroupMountOptions {
  readonly props?: Omit<NuiToggleGroupProps<unknown>, 'items'>;
  readonly items?: readonly NuiToggleItem<unknown>[];
  readonly modelValue?: SelectionValue;
  readonly dir?: 'ltr' | 'rtl';
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
    private readonly stubs: TopLayerStubs,
  ) {
    super(wrapper);
  }

  static mount({ props = {}, items = THEME_ITEMS, modelValue, dir }: ToggleGroupMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const selection = createSelection(modelValue, props.multiple === true);

    return new ToggleGroupDriver(
      mount(ToggleGroupScene, {
        props: { props, items, selection, dir },
        attachTo: document.body,
      }),
      selection,
      stubs,
    );
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
    return this.items.reduce<string[]>((found, item) => {
      if (item.classes('nui-toggle-group__item--selected')) {
        found.push(item.text() || (item.attributes('aria-label') ?? ''));
      }
      return found;
    }, []);
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

  get descriptions(): Array<string | undefined> {
    return this.items.map((item) => item.attributes('aria-describedby'));
  }

  get names(): Array<string | undefined> {
    return this.items.map((item) => item.attributes('aria-label'));
  }

  tooltipSide(label: string): string {
    const tooltip = this.item(label).element.nextElementSibling;

    if (!(tooltip instanceof HTMLElement)) {
      throw new Error(`No tooltip beside ${label}`);
    }
    const { style } = tooltip;

    return `${style.getPropertyValue('--_side-x')} ${style.getPropertyValue('--_side-y')}`;
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

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
