import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { NuiTree, type NuiTreeItem, type NuiTreeItemSlot, type NuiTreeProps } from '../../src';
import { FILES } from '../support/tree-items';
import { createSelection, type Selection, type SelectionValue } from '../support/selection';
import { ComponentDriver } from './component';
import { isString, listOf } from '../../../primitives/test/support/guards';

const isStringList = listOf(isString);

export interface TreeMountOptions {
  readonly props?: Partial<Omit<NuiTreeProps<unknown>, 'items'>>;
  readonly items?: readonly NuiTreeItem<string>[];
  readonly modelValue?: SelectionValue;
  readonly expanded?: readonly string[];
  readonly checked?: readonly string[];
  readonly dir?: 'ltr' | 'rtl';
  readonly itemSlot?: ((slot: NuiTreeItemSlot<unknown>) => string) | undefined;
}

const labelOfItem = (item: unknown): string =>
  typeof item === 'object' && item !== null && 'label' in item && typeof item.label === 'string'
    ? item.label
    : '';

const textOf = (element: Element): string =>
  (element.querySelector('.nui-row__title')?.textContent ?? '').trim();

const findItem = (
  items: readonly NuiTreeItem<string>[],
  label: string,
): NuiTreeItem<string> | undefined => {
  for (const item of items) {
    const match = item.label === label ? item : findItem(item.children ?? [], label);

    if (match) {
      return match;
    }
  }
  return undefined;
};

const defineSize = (element: HTMLElement, name: string, value: number): void => {
  Object.defineProperty(element, name, { value, configurable: true, writable: true });
};

export class TreeDriver extends ComponentDriver {
  protected readonly block = 'nui-tree';

  static mount({
    props = {},
    items = FILES,
    modelValue,
    expanded = [],
    checked = [],
    dir,
    itemSlot,
  }: TreeMountOptions = {}) {
    const selection = createSelection(modelValue, props.selectable === 'multiple');
    const expandedRef = ref<string[]>([...expanded]);
    const checkedRef = ref<string[]>([...checked]);
    const itemsRef = ref<readonly NuiTreeItem<string>[]>(structuredClone(items));
    const loads: string[] = [];
    const events: string[] = [];

    const Host = defineComponent({
      setup: () => () =>
        h('div', { dir }, [
          h(
            NuiTree,
            {
              ...props,
              items: itemsRef.value,
              ...selection.props(),
              expanded: expandedRef.value,
              checked: checkedRef.value,
              'onUpdate:expanded': (value: unknown) => {
                if (isStringList(value)) {
                  expandedRef.value = value;
                }
              },
              'onUpdate:checked': (value: unknown) => {
                if (isStringList(value)) {
                  checkedRef.value = value;
                }
              },
              onLoad: (item: unknown) => loads.push(labelOfItem(item)),
              onExpand: (item: unknown) => events.push(`expand:${labelOfItem(item)}`),
              onCollapse: (item: unknown) => events.push(`collapse:${labelOfItem(item)}`),
              onSelect: (item: unknown) => events.push(`select:${labelOfItem(item)}`),
            },
            itemSlot ? { item: itemSlot } : undefined,
          ),
        ]),
    });

    return new TreeDriver(
      mount(Host, { attachTo: document.body }),
      selection,
      expandedRef,
      checkedRef,
      itemsRef,
      loads,
      events,
    );
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly selection: Selection,
    private readonly expandedRef: Ref<string[]>,
    private readonly checkedRef: Ref<string[]>,
    private readonly itemsRef: Ref<readonly NuiTreeItem<string>[]>,
    readonly loads: string[],
    readonly events: string[],
  ) {
    super(wrapper);
  }

  override hasModifier(modifier: string): boolean {
    return this.tree.classes().includes(`nui-tree--${modifier}`);
  }

  listModifier(modifier: string): boolean {
    return this.tree.classes().includes(`nui-list--${modifier}`);
  }

  get itemsTag(): string {
    return this.tree.find('.nui-tree__list').element.tagName.toLowerCase();
  }

  get tree(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-tree');
  }

  private get nodes(): DOMWrapper<HTMLElement>[] {
    return this.wrapper.findAll<HTMLElement>('[role="treeitem"]:not(.nui-tree__item--leaving)');
  }

  get labels(): string[] {
    return this.nodes.map((node) => textOf(node.element));
  }

  get renderedCount(): number {
    return this.nodes.length;
  }

  get activeLabel(): string | undefined {
    const id = this.tree.attributes('aria-activedescendant');
    const active = id === undefined ? undefined : this.wrapper.find(`[id="${id}"]`);
    return active?.exists() ? textOf(active.element) : undefined;
  }

  get value(): SelectionValue {
    return this.selection.value();
  }

  get expandedValues(): string[] {
    return this.expandedRef.value;
  }

  get checkedValues(): string[] {
    return this.checkedRef.value;
  }

  private node(label: string): DOMWrapper<HTMLElement> {
    const found = this.nodes.find((node) => textOf(node.element) === label);
    if (!found) {
      throw new Error(`No tree node labelled ${label}`);
    }
    return found;
  }

  attr(label: string, name: string): string | undefined {
    return this.node(label).attributes(name);
  }

  nodeTag(label: string): string {
    return this.node(label).element.tagName.toLowerCase();
  }

  modifierOf(label: string, modifier: string): boolean {
    return this.node(label).classes().includes(`nui-list-item--${modifier}`);
  }

  trailingOf(label: string): string {
    return this.node(label).find('.nui-row__trailing').text();
  }

  nodeId(label: string): string | undefined {
    return this.node(label).attributes('id');
  }

  hasPart(label: string, part: string): boolean {
    return this.node(label).find(`.nui-tree__${part}`).exists();
  }

  hasDescription(label: string): boolean {
    return this.node(label).find('.nui-row__description').exists();
  }

  isRevealing(label: string): boolean {
    return this.node(label).classes().includes('nui-tree__item--revealing');
  }

  async iconOf(label: string): Promise<string | undefined> {
    await flushPromises();
    const node = this.node(label);
    const expanded = node.classes().includes('nui-tree__item--expanded');

    const pair = node.find(
      expanded ? '.nui-tree__glyph--open svg' : '.nui-tree__glyph--closed svg',
    );

    const glyph = pair.exists() ? pair : node.find('.nui-tree__icon svg');
    return glyph.exists()
      ? glyph
          .classes()
          .find((name) => name.startsWith('lucide-') && !name.endsWith('-icon'))
          ?.replace('lucide-', '')
      : undefined;
  }

  async focus(): Promise<void> {
    this.tree.element.focus();
    await nextTick();
  }

  async blur(): Promise<void> {
    this.tree.element.blur();
    await nextTick();
  }

  async press(key: string): Promise<void> {
    vi.advanceTimersByTime(1);
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    (document.activeElement ?? document.body).dispatchEvent(event);
    await nextTick();
  }

  async clickToggle(label: string): Promise<void> {
    await this.node(label).find('.nui-tree__toggle').trigger('click');
    await nextTick();
  }

  async clickCheckbox(label: string): Promise<void> {
    await this.node(label).find('.nui-tree__checkbox').trigger('click');
    await nextTick();
  }

  async click(label: string): Promise<void> {
    await this.node(label).find('.nui-row__title').trigger('click');
    await nextTick();
  }

  async pointerDown(label: string): Promise<void> {
    this.node(label)
      .find('.nui-row__title')
      .element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    this.tree.element.focus();
    await nextTick();
  }

  get activeLabels(): string[] {
    return this.nodes
      .filter((node) => node.classes().includes('nui-list-item--active'))
      .map((node) => textOf(node.element));
  }

  async dblclick(label: string): Promise<void> {
    await this.node(label).find('.nui-row__title').trigger('dblclick');
    await nextTick();
  }

  async receiveItems(items: readonly NuiTreeItem<string>[]): Promise<void> {
    this.itemsRef.value = items;
    await nextTick();
  }

  async rename(label: string, next: string): Promise<void> {
    const found = findItem(this.itemsRef.value, label);

    if (!found) {
      throw new Error(`No tree item labelled ${label}`);
    }
    Object.assign(found, { label: next });
    await nextTick();
  }

  async setHeight(height: number): Promise<void> {
    defineSize(this.tree.element, 'clientHeight', height);
    this.tree.element.dispatchEvent(new Event('scroll'));
    await nextTick();
  }

  async scrollTo(top: number): Promise<void> {
    defineSize(this.tree.element, 'scrollTop', top);
    this.tree.element.dispatchEvent(new Event('scroll'));
    await nextTick();
  }

  async advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await nextTick();
  }
}
