import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import type { NuiMenuEntry, NuiMenuFocus, NuiMenuProps } from '../../src';
import MenuScene from '../fixtures/MenuScene.vue';
import { dismissPopoverNatively, TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface MenuMountOptions {
  readonly props?: NuiMenuProps;
  readonly entries?: readonly NuiMenuEntry[];
  readonly parts?: boolean;
  readonly open?: boolean;
  readonly anchored?: boolean;
}

type MenuSceneWrapper = VueWrapper<InstanceType<typeof MenuScene>>;

const ITEM = '.nui-menu-item';
const LABEL = '.nui-menu-item__label';
const TRAILING = '.nui-menu-item__trailing-mark';

const labelText = (element: Element): string =>
  (element.querySelector(LABEL)?.textContent ?? '').trim();

export class MenuDriver extends ComponentDriver {
  protected readonly block = 'nui-menu';

  static mount({ props, entries, parts, open, anchored }: MenuMountOptions = {}) {
    const stubs = new TopLayerStubs();

    const wrapper = mount(MenuScene, {
      props: { props, entries, parts, initiallyOpen: open, anchored },
      attachTo: document.body,
    });

    return new MenuDriver(wrapper, stubs);
  }

  private constructor(
    private readonly scene: MenuSceneWrapper,
    private readonly stubs: TopLayerStubs,
  ) {
    super(scene);
  }

  get anchorFocused(): boolean {
    const anchor = this.scene.vm.anchor;

    return anchor !== null && document.activeElement === anchor;
  }

  async focusAnchor(): Promise<void> {
    this.scene.vm.anchor?.focus();
    await nextTick();
  }

  async show(focus?: NuiMenuFocus): Promise<void> {
    this.scene.vm.show(focus);
    await nextTick();
  }

  async showWith(entries: readonly NuiMenuEntry[], focus: NuiMenuFocus): Promise<void> {
    this.scene.vm.items = entries;
    this.scene.vm.show(focus);
    await nextTick();
  }

  get trigger(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('button[aria-haspopup="menu"]');
  }

  get menu(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-menu');
  }

  get isOpen(): boolean {
    return this.scene.vm.open;
  }

  get labels(): string[] {
    const root = this.menu.element;
    return this.wrapper.findAll<HTMLElement>(ITEM).reduce<string[]>((found, entry) => {
      if (entry.element.closest('.nui-menu') === root) {
        found.push(labelText(entry.element));
      }
      return found;
    }, []);
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
    return this.scene.vm.log;
  }

  get bold(): boolean {
    return this.scene.vm.bold;
  }

  get align(): string {
    return this.scene.vm.align;
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
    this.scene.vm.open = true;
    await nextTick();
  }

  async close(): Promise<void> {
    this.scene.vm.open = false;
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
