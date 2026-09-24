import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import {
  NuiList,
  NuiListItem,
  type NuiListEntry,
  type NuiListItemProps,
  type NuiListItemSlot,
  type NuiListProps,
  type NuiListSource,
} from '../../src';
import { RouterStub } from '../support/router-stub';
import { ComponentDriver } from './component';

type ListValue = string | string[] | undefined;

export interface ListPart extends NuiListItemProps {
  readonly leading?: string | undefined;
  readonly trailing?: string | undefined;
  readonly clickable?: boolean | undefined;
}

export interface ListMountOptions {
  readonly props?: Partial<NuiListProps<unknown>>;
  readonly modelValue?: ListValue;
  readonly parts?: readonly ListPart[];
  readonly itemSlot?: ((slot: NuiListItemSlot<NuiListEntry<unknown>>) => string) | undefined;
  readonly viaRouter?: boolean;
}

const isListValue = (value: unknown): value is ListValue =>
  value === undefined ||
  typeof value === 'string' ||
  (Array.isArray(value) && value.every((entry) => typeof entry === 'string'));

const titleOf = (element: Element): string =>
  (element.querySelector('.nui-row__title')?.textContent ?? '').trim();

const partSlots = (part: ListPart) => ({
  ...(part.leading === undefined ? {} : { leading: () => part.leading }),
  ...(part.trailing === undefined ? {} : { trailing: () => part.trailing }),
});

const partProps = (part: ListPart, clicks: Ref<number>, viaRouter: boolean) => {
  const { leading, trailing, clickable, ...props } = part;
  void leading;
  void trailing;
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
  }: ListMountOptions = {}) {
    const model = ref<ListValue>(modelValue);
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
              ...(model.value === undefined ? {} : { modelValue: model.value }),
              'onUpdate:modelValue': (value: unknown) => {
                if (isListValue(value)) {
                  model.value = value;
                }
              },
            },
            slots,
          ),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });
    return new ListDriver(mount(Host, { attachTo: document.body }), model, clicks, items);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly model: Ref<ListValue>,
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

  get value(): ListValue {
    return this.model.value;
  }

  get clicks(): number {
    return this.clickCount.value;
  }

  get emptyText(): string {
    const empty = this.wrapper.find('.nui-empty');
    return empty.exists() ? empty.text() : '';
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
    await nextTick();
  }

  async focusOutside(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('.outside').element.focus();
    await nextTick();
  }

  async receiveItems(items: NuiListSource<NuiListEntry<string>>): Promise<void> {
    this.itemsRef.value = items;
    await nextTick();
    await nextTick();
  }
}
