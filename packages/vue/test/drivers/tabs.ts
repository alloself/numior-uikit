import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, type Component } from 'vue';
import type { NuiTabDescriptor, NuiTabLinkDescriptor, NuiTabsProps } from '../../src';
import TabsScene from '../fixtures/TabsScene.vue';
import { ResizeObservers } from '../support/resize-observers';
import { ComponentDriver } from './component';

export interface TabsMountOptions {
  readonly props?: NuiTabsProps;
  readonly modelValue?: string | undefined;
  readonly fromData?: boolean;
  readonly switcher?: boolean;
  readonly dir?: 'ltr' | 'rtl';
  readonly lazyPanels?: readonly string[];
  readonly closable?: readonly string[];
  readonly unfocusablePanels?: readonly string[];
  readonly observed?: boolean;
  readonly links?: readonly NuiTabLinkDescriptor[];
  readonly routerComponent?: Component;
}

interface TabBox {
  readonly start: number;
  readonly size: number;
}

export interface TrackScroll {
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly scrollLeft: number;
  readonly rtl?: boolean;
}

export interface TabEdges {
  readonly start: boolean;
  readonly end: boolean;
}

type TabEdge = keyof TabEdges;

type TabsSceneWrapper = VueWrapper<InstanceType<typeof TabsScene>>;

const DESCRIPTORS: readonly NuiTabDescriptor[] = [
  { value: 'general', label: 'General', icon: 'check' },
  { value: 'billing', label: 'Billing', disabled: true },
  { value: 'team', label: 'Team' },
  { value: 'danger', label: 'Danger' },
];

export class TabsDriver extends ComponentDriver {
  protected readonly block = 'nui-tabs';

  static mount({
    props,
    modelValue,
    fromData,
    switcher,
    dir,
    lazyPanels,
    closable,
    unfocusablePanels,
    observed = false,
    links,
    routerComponent,
  }: TabsMountOptions = {}) {
    const observers = observed ? new ResizeObservers() : undefined;

    const wrapper = mount(TabsScene, {
      props: {
        props,
        descriptors: DESCRIPTORS,
        initialValue: modelValue,
        fromData,
        switcher,
        dir,
        lazyPanels,
        closable,
        unfocusablePanels,
        links,
      },
      global: { components: routerComponent ? { RouterLink: routerComponent } : {} },
      attachTo: document.body,
    });

    return new TabsDriver(wrapper, observers);
  }

  private constructor(
    private readonly scene: TabsSceneWrapper,
    private readonly observers: ResizeObservers | undefined,
  ) {
    super(scene);
  }

  get closed(): readonly string[] {
    return this.scene.vm.closed;
  }

  get root(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-tabs');
  }

  get list(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('[role="tablist"]');
  }

  get track(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-tab-list__track');
  }

  get edges(): TabEdges {
    return { start: this.edgeShown('start'), end: this.edgeShown('end') };
  }

  get fades(): TabEdges {
    const classes = this.track.classes();

    return {
      start: classes.includes('nui-tab-list__track--clipped-start'),
      end: classes.includes('nui-tab-list__track--clipped-end'),
    };
  }

  get scrolled(): number {
    return this.track.element.scrollLeft;
  }

  private edge(side: TabEdge): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>(`.nui-tab-list__edge--${side}`);
  }

  private edgeShown(side: TabEdge): boolean {
    return this.edge(side).classes().includes('nui-tab-list__edge--shown');
  }

  get tabs(): DOMWrapper<HTMLButtonElement>[] {
    return this.wrapper.findAll<HTMLButtonElement>('[role="tab"]');
  }

  get nav(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('nav.nui-tabs');
  }

  get links(): DOMWrapper<HTMLAnchorElement>[] {
    return this.wrapper.findAll<HTMLAnchorElement>('a.nui-tab');
  }

  get linkLabels(): string[] {
    return this.links.map((link) => link.find('.nui-tab__label').text());
  }

  get hrefs(): (string | undefined)[] {
    return this.links.map((link) => link.attributes('href'));
  }

  get currentLinks(): string[] {
    return this.links.reduce<string[]>((found, link) => {
      if (link.attributes('aria-current') === 'page') {
        found.push(link.find('.nui-tab__label').text());
      }
      return found;
    }, []);
  }

  get roles(): string[] {
    return this.wrapper.findAll('[role]').map((element) => element.attributes('role') ?? '');
  }

  link(label: string): DOMWrapper<HTMLAnchorElement> {
    const found = this.links.find((link) => link.find('.nui-tab__label').text() === label);

    if (!found) {
      throw new Error(`No link labelled ${label}`);
    }
    return found;
  }

  async clickLink(label: string, init: MouseEventInit = {}): Promise<boolean> {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });

    this.link(label).element.dispatchEvent(event);
    await nextTick();

    return event.defaultPrevented;
  }

  get labels(): string[] {
    return this.tabs.map((tab) => tab.find('.nui-tab__label').text());
  }

  get selected(): string | undefined {
    return this.scene.vm.model;
  }

  get tabIndexes(): number[] {
    return this.tabs.map((tab) => tab.element.tabIndex);
  }

  get focusedTab(): string | undefined {
    const active = document.activeElement;
    return active instanceof HTMLButtonElement && active.getAttribute('role') === 'tab'
      ? (active.querySelector('.nui-tab__label')?.textContent ?? undefined)
      : undefined;
  }

  get indicatorVars(): { start: string; size: string } {
    const style = this.track.element.style;
    return {
      start: style.getPropertyValue('--_indicator-start'),
      size: style.getPropertyValue('--_indicator-size'),
    };
  }

  get closableLabels(): string[] {
    return this.tabs.reduce<string[]>((found, tab) => {
      if (tab.element.parentElement?.querySelector('.nui-tab__close') instanceof HTMLElement) {
        found.push(tab.find('.nui-tab__label').text());
      }
      return found;
    }, []);
  }

  hasRootModifier(modifier: string): boolean {
    return this.root.classes().includes(`nui-tabs--${modifier}`);
  }

  crossHiddenFromAssistiveTechnology(label: string): boolean {
    return this.cross(label).attributes('aria-hidden') === 'true';
  }

  tab(label: string): DOMWrapper<HTMLButtonElement> {
    const found = this.tabs.find((tab) => tab.find('.nui-tab__label').text() === label);
    if (!found) {
      throw new Error(`No tab labelled ${label}`);
    }
    return found;
  }

  get panelCount(): number {
    return this.wrapper.findAll('[role="tabpanel"]').length;
  }

  panel(value: string): DOMWrapper<HTMLElement> {
    const found = this.wrapper
      .findAll<HTMLElement>('[role="tabpanel"]')
      .find((panel) => panel.attributes('id')?.endsWith(`-panel-${value}`));

    if (!found) {
      throw new Error(`No panel for ${value}`);
    }
    return found;
  }

  panelTabIndex(value: string): string | undefined {
    return this.panel(value).attributes('tabindex');
  }

  panelVisible(value: string): boolean {
    return this.panel(value).element.style.display !== 'none';
  }

  panelText(value: string): string {
    return this.panel(value).text();
  }

  async ready(): Promise<void> {
    await nextTick();
  }

  async focusTab(label: string): Promise<void> {
    this.tab(label).element.focus();
    await nextTick();
  }

  async clickTab(label: string): Promise<void> {
    await this.tab(label).trigger('click');
  }

  pressTabButton(label: string, button: number): boolean {
    const event = new MouseEvent('mousedown', { button, bubbles: true, cancelable: true });

    this.tab(label).element.dispatchEvent(event);
    return event.defaultPrevented;
  }

  async clickCross(label: string): Promise<void> {
    await this.cross(label).trigger('click');
  }

  async middleClickTab(label: string): Promise<void> {
    await this.tab(label).trigger('auxclick', { button: 1 });
  }

  async scrollTrack({
    scrollWidth,
    clientWidth,
    scrollLeft,
    rtl = false,
  }: TrackScroll): Promise<void> {
    const { element } = this.track;
    const low = rtl ? clientWidth - scrollWidth : 0;

    Object.defineProperties(element, {
      scrollWidth: { configurable: true, value: scrollWidth },
      clientWidth: { configurable: true, value: clientWidth },
      scrollBy: {
        configurable: true,
        value: ({ left = 0 }: ScrollToOptions) => {
          element.scrollLeft = Math.min(
            low + scrollWidth - clientWidth,
            Math.max(low, element.scrollLeft + left),
          );

          element.dispatchEvent(new Event('scroll'));
        },
      },
    });

    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(0, 0, clientWidth, 0),
    });

    element.scrollLeft = scrollLeft;
    await this.track.trigger('scroll');
  }

  async wheel(deltaY: number, init: WheelEventInit = {}): Promise<boolean> {
    const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true, ...init });

    this.track.element.dispatchEvent(event);
    await nextTick();
    return event.defaultPrevented;
  }

  async clickEdge(side: TabEdge): Promise<void> {
    await this.edge(side).find('button').trigger('click');
  }

  placeTab(label: string, { start, size }: TabBox): void {
    Object.defineProperty(this.tab(label).element, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(start, 0, size, 0),
    });
  }

  async resizeTab(label: string, { start, size }: TabBox): Promise<void> {
    const { element } = this.tab(label);

    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(start, 0, size, 0),
    });

    this.observers?.resize(element);
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

  async receive(value: string): Promise<void> {
    this.scene.vm.model = value;
    await nextTick();
  }

  override unmount(): void {
    super.unmount();
    this.observers?.restore();
  }

  private cross(label: string): DOMWrapper<HTMLElement> {
    const cross =
      this.tab(label).element.parentElement?.querySelector<HTMLElement>('.nui-tab__close');

    if (cross === null || cross === undefined) {
      throw new Error(`No close button on the tab ${label}`);
    }
    return new DOMWrapper(cross);
  }
}
