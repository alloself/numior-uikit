import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import type { NuiConfigOptions, NuiTreeItem, NuiTreeItemSlot, NuiTreeProps } from '../../src';
import TreeScene from '../fixtures/TreeScene.vue';
import { FILES } from '../support/tree-items';
import { configPlugins } from '../support/config';
import { createSelection, type Selection, type SelectionValue } from '../support/selection';
import { ComponentDriver } from './component';

export interface TreeMountOptions {
  readonly props?: Partial<Omit<NuiTreeProps<unknown>, 'items'>>;
  readonly items?: readonly NuiTreeItem[];
  readonly modelValue?: SelectionValue;
  readonly expanded?: readonly string[];
  readonly dir?: 'ltr' | 'rtl';
  readonly itemSlot?: ((slot: NuiTreeItemSlot<unknown>) => string) | undefined;
  readonly config?: NuiConfigOptions;
}

type TreeSceneWrapper = VueWrapper<InstanceType<typeof TreeScene>>;

interface TreeWindowFrame {
  readonly lead: string;
  readonly rest: string;
  readonly clampStart: string;
  readonly clampEnd: string;
}

const textOf = (element: Element): string =>
  (element.querySelector('.nui-row__title')?.textContent ?? '').trim();

const findItem = (items: readonly NuiTreeItem[], label: string): NuiTreeItem | undefined => {
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
    expanded,
    dir,
    itemSlot,
    config,
  }: TreeMountOptions = {}) {
    const selection = createSelection(
      modelValue,
      props.selectable === 'multiple' || props.checkable === true,
    );

    const wrapper = mount(TreeScene, {
      props: {
        props,
        initialItems: structuredClone(items),
        selection,
        initiallyExpanded: expanded,
        dir,
        itemSlot,
      },
      attachTo: document.body,
      global: { plugins: configPlugins(config) },
    });

    return new TreeDriver(wrapper, selection);
  }

  private constructor(
    private readonly scene: TreeSceneWrapper,
    private readonly selection: Selection,
  ) {
    super(scene);
  }

  get loads(): string[] {
    return this.scene.vm.loads;
  }

  get events(): string[] {
    return this.scene.vm.events;
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

  get rowElements(): HTMLElement[] {
    return this.nodes.map((node) => node.element);
  }

  get windowFrame(): TreeWindowFrame {
    const canvas = this.tree.element.style;
    const list = this.tree.find<HTMLElement>('.nui-tree__list').element.style;

    return {
      lead: canvas.getPropertyValue('--_window-lead'),
      rest: canvas.getPropertyValue('--_window-rest'),
      clampStart: list.getPropertyValue('--_window-clamp-start'),
      clampEnd: list.getPropertyValue('--_window-clamp-end'),
    };
  }

  get activeElement(): HTMLElement | undefined {
    const id = this.tree.attributes('aria-activedescendant');
    const active = id === undefined ? undefined : this.wrapper.find<HTMLElement>(`[id="${id}"]`);
    return active?.exists() ? active.element : undefined;
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
    return this.scene.vm.expanded;
  }

  get statusText(): string {
    const status = this.wrapper.find('.nui-list__status');
    return status.exists() ? status.text() : '';
  }

  get emptyText(): string {
    const empty = this.wrapper.find('.nui-empty');
    return empty.exists() ? empty.text() : '';
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

  async receiveItems(items: readonly NuiTreeItem[]): Promise<void> {
    this.scene.vm.items = items;
    await nextTick();
  }

  async setExpanded(values: readonly string[]): Promise<void> {
    this.scene.vm.expanded = [...values];
    await nextTick();
  }

  async rename(label: string, next: string): Promise<void> {
    const found = findItem(this.scene.vm.items, label);

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
