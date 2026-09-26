import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import {
  NuiAppBar,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarFooter,
  NuiSidebarGroup,
  NuiSidebarHeader,
  NuiSidebarItem,
  NuiSidebarSub,
  NuiSidebarTrigger,
  type NuiConfigOptions,
  type NuiSidebarCollapsible,
  type NuiSidebarSide,
} from '../../src';
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
}

interface FakeMediaList {
  matches: boolean;
  readonly listeners: Set<() => void>;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

const fakeMedia = (matches: boolean): FakeMediaList => {
  const listeners = new Set<() => void>();

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
    open: initialOpen = true,
    mobile = false,
    shortcut = true,
    label,
    config,
  }: LayoutMountOptions = {}): LayoutDriver {
    const stubs = new TopLayerStubs();
    const media = fakeMedia(mobile);
    vi.stubGlobal('matchMedia', () => media);
    const open = ref(initialOpen);
    const mobileOpen = ref(false);
    const subOpen = ref(false);
    const active = ref('inbox');

    const item = (text: string, key: string, extra: Record<string, unknown> = {}) =>
      h(NuiSidebarItem, {
        label: text,
        icon: 'inbox',
        current: active.value === key,
        onClick: () => {
          active.value = key;
        },
        ...extra,
      });

    const sidebar = () =>
      h(NuiSidebar, { collapsible, side, label }, () => [
        h(NuiSidebarHeader, () => h('strong', 'Brand')),
        h(NuiSidebarContent, () => [
          h(NuiSidebarGroup, { label: 'Overview' }, () => [
            item('Inbox', 'inbox', { badge: 3 }),
            item('Calendar', 'calendar'),
            item('Docs', 'docs', { href: '#docs' }),
          ]),
          h(NuiSidebarGroup, { label: 'Data' }, () =>
            h(
              NuiSidebarSub,
              {
                label: 'Reports',
                icon: 'folder',
                id: 'reports',
                open: subOpen.value,
                'onUpdate:open': (value: boolean) => {
                  subOpen.value = value;
                },
              },
              () => [item('Sales', 'sales'), item('Team', 'team')],
            ),
          ),
        ]),
        h(NuiSidebarFooter, () =>
          h(NuiSidebarGroup, () => item('Profile', 'profile', { tooltip: 'Open profile' })),
        ),
      ]);

    const Host = defineComponent({
      setup: () => () =>
        h(
          NuiLayout,
          {
            id: 'app',
            shortcut,
            contentAs: 'div',
            open: open.value,
            'onUpdate:open': (value: boolean) => {
              open.value = value;
            },
            mobileOpen: mobileOpen.value,
            'onUpdate:mobileOpen': (value: boolean) => {
              mobileOpen.value = value;
            },
          },
          {
            sidebar,
            header: () =>
              h(NuiAppBar, null, {
                start: () => h(NuiSidebarTrigger),
                default: () => active.value,
              }),
            default: () => [h('input', { class: 'editor', type: 'text' }), h('p', 'Content')],
          },
        ),
    });

    const wrapper = mount(Host, {
      attachTo: document.body,
      global: { plugins: configPlugins(config) },
    });

    return new LayoutDriver(wrapper, stubs, media, open, mobileOpen, subOpen, active);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly media: FakeMediaList,
    private readonly openModel: Ref<boolean>,
    private readonly mobileOpenModel: Ref<boolean>,
    private readonly subOpenModel: Ref<boolean>,
    private readonly activeModel: Ref<string>,
  ) {
    super(wrapper);
  }

  get open(): boolean {
    return this.openModel.value;
  }

  get mobileOpen(): boolean {
    return this.mobileOpenModel.value;
  }

  get subOpen(): boolean {
    return this.subOpenModel.value;
  }

  get active(): string {
    return this.activeModel.value;
  }

  get sidebar(): DOMWrapper<Element> {
    return this.wrapper.find('aside.nui-sidebar');
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

  async clickItem(label: string): Promise<void> {
    await this.action(label).trigger('click');
  }

  async clickSub(): Promise<void> {
    await this.subToggle.trigger('click');
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
      listener();
    }

    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    vi.unstubAllGlobals();
    super.unmount();
  }
}
