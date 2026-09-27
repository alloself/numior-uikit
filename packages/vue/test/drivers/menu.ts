import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import {
  NuiMenu,
  NuiMenuCheckboxItem,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiMenuSub,
  type NuiMenuEntry,
  type NuiMenuProps,
  type NuiMenuTriggerSlot,
} from '../../src';
import { dismissPopoverNatively, TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface MenuMountOptions {
  readonly props?: NuiMenuProps;
  readonly entries?: readonly NuiMenuEntry[];
  readonly parts?: boolean;
  readonly open?: boolean;
}

interface PartsState {
  readonly log: string[];
  readonly bold: Ref<boolean>;
  readonly align: Ref<string>;
}

const ITEM = '.nui-menu-item';
const LABEL = '.nui-menu-item__label';

const item = (label: string, state: PartsState, extra: Record<string, unknown> = {}) =>
  h(NuiMenuItem, { ...extra, onSelect: () => state.log.push(label) }, () => label);

const TRAILING = '.nui-menu-item__trailing-mark';

const markedItem = (label: string, state: PartsState, extra: Record<string, unknown> = {}) =>
  h(
    NuiMenuItem,
    { ...extra, onSelect: () => state.log.push(label) },
    { default: () => label, trailing: () => h('span', { class: TRAILING.slice(1) }, '✓') },
  );

const parts = (state: PartsState) => () => [
  item('Rename', state, { icon: 'check', shortcut: '⌘R' }),
  item('Locked', state, { disabled: true }),
  markedItem('Docs', state, { href: '/docs' }),
  h(
    NuiMenuCheckboxItem,
    {
      checked: state.bold.value,
      'onUpdate:checked': (value: boolean) => {
        state.bold.value = value;
      },
    },
    () => 'Bold',
  ),
  h(
    NuiMenuRadioGroup,
    {
      modelValue: state.align.value,
      'onUpdate:modelValue': (value: unknown) => {
        if (typeof value === 'string') {
          state.align.value = value;
        }
      },
    },
    () => [
      h(NuiMenuRadioItem, { value: 'left' }, () => 'Left'),
      h(NuiMenuRadioItem, { value: 'center' }, () => 'Center'),
    ],
  ),
  h(NuiMenuSeparator),
  h(NuiMenuLabel, null, () => 'More'),
  h(NuiMenuSub, { label: 'Share' }, () => [item('Email', state), item('Link', state)]),
  item('Delete', state, { tone: 'error' }),
];

const labelText = (element: Element): string =>
  (element.querySelector(LABEL)?.textContent ?? '').trim();

export class MenuDriver extends ComponentDriver {
  protected readonly block = 'nui-menu';

  static mount({
    props = {},
    entries,
    parts: withParts = false,
    open = false,
  }: MenuMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const model = ref(open);
    const state: PartsState = { log: [], bold: ref(false), align: ref('left') };

    const Host = defineComponent({
      setup: () => () =>
        h(
          NuiMenu,
          {
            ...props,
            items: entries,
            open: model.value,
            'onUpdate:open': (value: boolean) => {
              model.value = value;
            },
          },
          {
            trigger: (slot: NuiMenuTriggerSlot) =>
              h('button', { ...slot.attrs, type: 'button' }, 'Actions'),
            ...(withParts ? { default: parts(state) } : {}),
          },
        ),
    });

    return new MenuDriver(mount(Host, { attachTo: document.body }), stubs, model, state);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly model: Ref<boolean>,
    private readonly state: PartsState,
  ) {
    super(wrapper);
  }

  get trigger(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('button[aria-haspopup="menu"]');
  }

  get menu(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-menu');
  }

  get isOpen(): boolean {
    return this.model.value;
  }

  get labels(): string[] {
    const root = this.menu.element;
    return this.wrapper
      .findAll<HTMLElement>(ITEM)
      .filter((entry) => entry.element.closest('.nui-menu') === root)
      .map((entry) => labelText(entry.element));
  }

  get focusedLabel(): string | undefined {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      return undefined;
    }
    if (active.classList.contains('nui-menu')) {
      return 'menu';
    }
    const owner = active.closest(ITEM);
    return owner ? labelText(owner) : undefined;
  }

  get triggerFocused(): boolean {
    return document.activeElement === this.trigger.element;
  }

  get selections(): string[] {
    return this.state.log;
  }

  get bold(): boolean {
    return this.state.bold.value;
  }

  get align(): string {
    return this.state.align.value;
  }

  private item(label: string): DOMWrapper<HTMLElement> {
    const found = this.wrapper
      .findAll<HTMLElement>(ITEM)
      .find((entry) => labelText(entry.element) === label);

    if (!found) {
      throw new Error(`No menu item labelled ${label}`);
    }
    return found;
  }

  checked(label: string): string | undefined {
    return this.item(label).attributes('aria-checked');
  }

  trailingOf(label: string): string {
    const mark = this.item(label).find(TRAILING);

    return mark.exists() ? mark.text() : '';
  }

  hrefOf(label: string): string | undefined {
    return this.item(label).attributes('href');
  }

  subOpen(label: string): boolean {
    return this.item(label).attributes('aria-expanded') === 'true';
  }

  async open(): Promise<void> {
    this.model.value = true;
    await nextTick();
  }

  async close(): Promise<void> {
    this.model.value = false;
    await nextTick();
  }

  async pressTrigger(key: string): Promise<void> {
    await this.trigger.trigger('keydown', { key });
    await nextTick();
  }

  async press(key: string): Promise<boolean> {
    vi.advanceTimersByTime(1);
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    (document.activeElement ?? document.body).dispatchEvent(event);
    await nextTick();
    return event.defaultPrevented;
  }

  async hover(label: string): Promise<void> {
    await this.item(label).trigger('pointermove');
  }

  async leave(): Promise<void> {
    await this.menu.trigger('pointerleave');
  }

  async click(label: string): Promise<void> {
    await this.item(label).trigger('click');
    await nextTick();
  }

  async hoverSub(label: string): Promise<void> {
    await this.item(label).trigger('pointerenter');
  }

  async leaveSub(label: string): Promise<void> {
    await this.item(label).trigger('pointerleave');
  }

  async advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await nextTick();
  }

  async dismissNatively(): Promise<void> {
    dismissPopoverNatively(this.menu.element);
    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
