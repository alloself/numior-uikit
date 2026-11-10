import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import type {
  NuiConfigOptions,
  NuiLayoutHeader,
  NuiSidebarCollapsible,
  NuiSidebarSide,
  NuiSidebarVariant,
} from '../../src';
import LayoutScene from '../fixtures/LayoutScene.vue';
import { configPlugins } from '../support/config';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface LayoutMountOptions {
  readonly collapsible?: NuiSidebarCollapsible;
  readonly side?: NuiSidebarSide;
  readonly open?: boolean;
  readonly mobile?: boolean;
  readonly shortcut?: boolean;
  readonly label?: string;
  readonly config?: NuiConfigOptions;
  readonly header?: NuiLayoutHeader;
  readonly end?: boolean;
  readonly sticky?: boolean;
  readonly collapsibleGroup?: boolean;
  readonly variant?: NuiSidebarVariant;
  readonly skipLink?: boolean;
  readonly skipLabel?: string;
}

type MediaListener = (event: { readonly matches: boolean }) => void;

interface FakeMediaList {
  matches: boolean;
  readonly listeners: Set<MediaListener>;
  addEventListener(type: string, listener: MediaListener): void;
  removeEventListener(type: string, listener: MediaListener): void;
}

const fakeMedia = (matches: boolean): FakeMediaList => {
  const listeners = new Set<MediaListener>();

  return {
    matches,
    listeners,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  };
};

export class LayoutDriver extends ComponentDriver {
  protected readonly block = 'nui-layout';

  static mount({
    collapsible = 'icon',
    side = 'start',
    open = true,
    mobile = false,
    shortcut = true,
    label,
    config,
    header = 'inset',
    end = false,
    sticky = false,
    collapsibleGroup = false,
    variant = 'panel',
    skipLink,
    skipLabel,
  }: LayoutMountOptions = {}): LayoutDriver {
    const stubs = new TopLayerStubs();
    const media = fakeMedia(mobile);
    vi.stubGlobal('matchMedia', () => media);

    const scene = mount(LayoutScene, {
      props: {
        open,
        collapsible,
        side,
        shortcut,
        label,
        header,
        end,
        sticky,
        collapsibleGroup,
        variant,
        skipLink,
        skipLabel,
      },
      attachTo: document.body,
      global: { plugins: configPlugins(config) },
    });

    return new LayoutDriver(scene, stubs, media);
  }

  private constructor(
    private readonly scene: VueWrapper<InstanceType<typeof LayoutScene>>,
    private readonly stubs: TopLayerStubs,
    private readonly media: FakeMediaList,
  ) {
    super(scene);
  }

  get open(): boolean {
    return this.scene.vm.open;
  }

  get mobileOpen(): boolean {
    return this.scene.vm.mobileOpen;
  }

  get subOpen(): boolean {
    return this.scene.vm.subOpen;
  }

  get active(): string {
    return this.scene.vm.active;
  }

  get skipLink(): DOMWrapper<HTMLAnchorElement> {
    return this.wrapper.find<HTMLAnchorElement>('.nui-skip-link');
  }

  get contentFocused(): boolean {
    return document.activeElement === this.wrapper.find('.nui-layout__content').element;
  }

  async followSkipLink(): Promise<void> {
    await this.skipLink.trigger('click');
  }

  get sidebar(): DOMWrapper<Element> {
    return this.wrapper.find('aside.nui-sidebar');
  }

  get headerBeforeRow(): boolean {
    const bar = this.wrapper.find('.nui-app-bar').element;
    const row = this.wrapper.find('.nui-layout__row').element;

    return (bar.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  }

  get endColumn(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-layout__end');
  }

  get groupToggle(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-sidebar-group__toggle');
  }

  get groupList(): DOMWrapper<Element> {
    return this.wrapper.find('#overview-list');
  }

  get drawer(): DOMWrapper<Element> {
    return this.wrapper.find('dialog');
  }

  get trigger(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-sidebar-trigger');
  }

  get sidebarLabel(): string | undefined {
    return this.sidebar.attributes('aria-label');
  }

  get triggerLabel(): string | undefined {
    return this.trigger.attributes('aria-label');
  }

  get drawerCloseLabel(): string | undefined {
    return this.drawer.find('.nui-dialog__close').attributes('aria-label');
  }

  get heading(): string {
    return this.wrapper.find('.nui-app-bar__body').text();
  }

  sidebarModifier(modifier: string): boolean {
    return this.sidebar.classes().includes(`nui-sidebar--${modifier}`);
  }

  get showModalCalls(): number {
    return this.stubs.showModalCalls.count;
  }

  action(label: string): DOMWrapper<HTMLElement> {
    const found = this.wrapper
      .findAll<HTMLElement>('.nui-list-item__action')
      .find((action) => action.find('.nui-row__title').text() === label);

    if (!found) {
      throw new Error(`No sidebar action ${label}`);
    }

    return found;
  }

  get subItems(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-sidebar-sub__list');
  }

  get subToggle(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-sidebar-sub > .nui-list-item__action');
  }

  get flyout(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-sidebar-sub__flyout');
  }

  get flyoutShown(): boolean {
    const flyout = this.flyout.element;

    return flyout instanceof HTMLElement && this.stubs.shown.has(flyout);
  }

  get focusedLabel(): string | undefined {
    const focused = document.activeElement;

    if (!(focused instanceof HTMLElement)) {
      return undefined;
    }
    const title = focused.querySelector('.nui-row__title');
    return title?.textContent?.trim();
  }

  get subFocused(): boolean {
    return document.activeElement === this.subToggle.element;
  }

  get tooltipShows(): number {
    return this.stubs.popoverCalls.show;
  }

  async focusItem(label: string): Promise<void> {
    this.action(label).element.focus();
    await nextTick();
  }

  async clickTrigger(): Promise<void> {
    await this.trigger.trigger('click');
  }

  async clickGroupToggle(): Promise<void> {
    await this.groupToggle.trigger('click');
  }

  async activate(key: string): Promise<void> {
    this.scene.vm.active = key;
    await nextTick();
  }

  async ready(): Promise<void> {
    await nextTick();
  }

  async clickItem(label: string): Promise<void> {
    await this.action(label).trigger('click');
  }

  async clickSub(): Promise<void> {
    await this.subToggle.trigger('click');
  }

  async hoverSub(): Promise<void> {
    await this.subToggle.trigger('pointerenter', { pointerType: 'mouse' });
  }

  async leaveSub(): Promise<void> {
    await this.subToggle.trigger('pointerleave');
  }

  async pressOutside(): Promise<void> {
    await this.wrapper.find('.editor').trigger('pointerdown');
  }

  async pressInFlyout(): Promise<void> {
    await this.flyout.trigger('pointerdown');
  }

  async pressOnSub(key: string): Promise<void> {
    await this.subToggle.trigger('keydown', { key });
  }

  async pressFocused(key: string): Promise<void> {
    const focused = document.activeElement;

    if (focused instanceof HTMLElement) {
      focused.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    }
    await nextTick();
  }

  async advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await nextTick();
  }

  async pressShortcut(modifier: 'ctrl' | 'meta' = 'ctrl', target: EventTarget = window) {
    const event = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: modifier === 'ctrl',
      metaKey: modifier === 'meta',
      bubbles: true,
      cancelable: true,
    });

    target.dispatchEvent(event);
    await nextTick();
    return event.defaultPrevented;
  }

  async pressShortcutInEditor(): Promise<boolean> {
    return this.pressShortcut('ctrl', this.wrapper.find('.editor').element);
  }

  async setMobile(matches: boolean): Promise<void> {
    this.media.matches = matches;

    for (const listener of this.media.listeners) {
      listener({ matches });
    }

    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    vi.unstubAllGlobals();
    super.unmount();
  }
}
