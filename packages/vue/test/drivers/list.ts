import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Component, type Ref } from 'vue';
import {
  NuiList,
  NuiListItem,
  type NuiListEntry,
  type NuiListItemProps,
  type NuiListItemSlot,
  type NuiListProps,
  type NuiListSource,
  type NuiConfigOptions,
} from '../../src';
import { configPlugins } from '../support/config';
import { RouterStub } from '../support/router-stub';
import { createSelection, type Selection, type SelectionValue } from '../support/selection';
import { ComponentDriver } from './component';

export interface ListPart extends NuiListItemProps {
  readonly leading?: string | undefined;
  readonly trailing?: string | undefined;
  readonly nested?: string | undefined;
  readonly clickable?: boolean | undefined;
}

export interface ListMountOptions {
  readonly props?: Partial<NuiListProps<unknown>>;
  readonly modelValue?: SelectionValue;
  readonly parts?: readonly ListPart[];
  readonly itemSlot?: ((slot: NuiListItemSlot<NuiListEntry<unknown>>) => string) | undefined;
  readonly viaRouter?: boolean;
  readonly routerComponent?: Component;
  readonly config?: NuiConfigOptions;
}

const titleOf = (element: Element): string =>
  (element.querySelector('.nui-row__title')?.textContent ?? '').trim();

const partSlots = (part: ListPart) => ({
  ...(part.leading === undefined ? {} : { leading: () => part.leading }),
  ...(part.trailing === undefined ? {} : { trailing: () => part.trailing }),
  ...(part.nested === undefined
    ? {}
    : { nested: () => h('ul', { class: 'nested' }, [h('li', part.nested)]) }),
});

const partProps = (part: ListPart, clicks: Ref<number>, viaRouter: boolean) => {
  const { leading, trailing, nested, clickable, ...props } = part;
  void leading;
  void trailing;
  void nested;
  return {
    ...props,
    ...(viaRouter ? { as: RouterStub } : {}),
    ...(clickable
      ? {
          onClick: () => {
            clicks.value += 1;
          },
        }
      : {}),
  };
};

export class ListDriver extends ComponentDriver {
  protected readonly block = 'nui-list';

  static mount({
    props = {},
    modelValue,
    parts = [],
    itemSlot,
    viaRouter = false,
    routerComponent,
    config,
  }: ListMountOptions = {}) {
    const selection = createSelection(modelValue, props.selectable === 'multiple');
    const clicks = ref(0);
    const items = ref<NuiListSource<NuiListEntry<unknown>> | undefined>(props.items);

    const slots = {
      default: () =>
        parts.map((part) => h(NuiListItem, partProps(part, clicks, viaRouter), partSlots(part))),
      ...(itemSlot ? { item: itemSlot } : {}),
    };

    const Host = defineComponent({
      setup: () => () =>
        h('div', [
          h(
            NuiList,
            {
              ...props,
              ...(viaRouter ? { linkAs: RouterStub } : {}),
              ...(items.value === undefined ? {} : { items: items.value }),
              ...selection.props(),
            },
            slots,
          ),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });

    return new ListDriver(
      mount(Host, {
        attachTo: document.body,
        global: {
          plugins: configPlugins(config),
          components: routerComponent ? { RouterLink: routerComponent } : {},
        },
      }),
      selection,
      clicks,
      items,
    );
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly selection: Selection,
    private readonly clickCount: Ref<number>,
    private readonly itemsRef: Ref<NuiListSource<NuiListEntry<unknown>> | undefined>,
  ) {
    super(wrapper);
  }

  override hasModifier(modifier: string): boolean {
    return this.root.classes().includes(`nui-list--${modifier}`);
  }

  get root(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-list');
  }

  get tag(): string {
    return this.root.find('.nui-list__items').element.tagName.toLowerCase();
  }

  get role(): string | undefined {
    return this.listAttr('role');
  }

  listAttr(name: string): string | undefined {
    return this.root.attributes(name);
  }

  private get items(): DOMWrapper<HTMLElement>[] {
    return this.wrapper.findAll<HTMLElement>('.nui-list-item');
  }

  get titles(): string[] {
    return this.items.map((item) => titleOf(item.element));
  }

  get selectedTitles(): string[] {
    return this.items
      .filter((item) => item.attributes('aria-selected') === 'true')
      .map((item) => titleOf(item.element));
  }

  get tabIndexes(): number[] {
    return this.items.map((item) => item.element.tabIndex);
  }

  get focusedTitle(): string | undefined {
    const active = document.activeElement;
    return active instanceof HTMLElement && active.classList.contains('nui-list-item')
      ? titleOf(active)
      : undefined;
  }

  get value(): SelectionValue {
    return this.selection.value();
  }

  get clicks(): number {
    return this.clickCount.value;
  }

  get groupLabels(): string[] {
    return this.wrapper.findAll('.nui-list__group-label').map((label) => label.text());
  }

  groupAttr(label: string, name: string): string | undefined {
    return this.wrapper
      .findAll('.nui-list__group')
      .find((group) => group.find('.nui-list__group-label').text() === label)
      ?.attributes(name);
  }

  get optionIds(): string[] {
    return this.wrapper.findAll('[role="option"]').map((option) => option.attributes('id') ?? '');
  }

  get emptyText(): string {
    const empty = this.wrapper.find('.nui-empty');
    return empty.exists() ? empty.text() : '';
  }

  get loadingText(): string {
    return this.wrapper.find('.nui-list__status').text();
  }

  get checkCount(): number {
    return this.wrapper.findAll('.nui-row__check .nui-icon').length;
  }

  item(title: string): DOMWrapper<HTMLElement> {
    const found = this.items.find((item) => titleOf(item.element) === title);
    if (!found) {
      throw new Error(`No list item titled ${title}`);
    }
    return found;
  }

  innerTag(title: string): string {
    return this.item(title).find('.nui-list-item__inner').element.tagName.toLowerCase();
  }

  inner(title: string): DOMWrapper<Element> {
    return this.item(title).find('.nui-list-item__inner');
  }

  modifierOf(title: string, modifier: string): boolean {
    return this.item(title).classes().includes(`nui-list-item--${modifier}`);
  }

  badgeOf(title: string): string {
    const badge = this.item(title).find('.nui-badge');
    return badge.exists() ? badge.text() : '';
  }

  nestedOf(title: string): string {
    const nested = this.item(title).find('.nested');
    return nested.exists() ? nested.text() : '';
  }

  descriptionOf(title: string): string {
    const description = this.item(title).find('.nui-row__description');
    return description.exists() ? description.text() : '';
  }

  async click(title: string): Promise<void> {
    await this.item(title).trigger('click');
    await nextTick();
  }

  async clickInner(title: string): Promise<void> {
    await this.inner(title).trigger('click');
  }

  async focusItem(title: string): Promise<void> {
    this.item(title).element.focus();
    await nextTick();
  }

  async press(key: string): Promise<void> {
    vi.advanceTimersByTime(1);
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    (document.activeElement ?? document.body).dispatchEvent(event);
    await nextTick();
  }

  async focusOutside(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('.outside').element.focus();
    await nextTick();
  }

  async receiveItems(items: NuiListSource<NuiListEntry<string>>): Promise<void> {
    this.itemsRef.value = items;
    await nextTick();
  }
}
