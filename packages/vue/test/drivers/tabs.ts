import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { NuiTabDescriptor, NuiTabsProps } from '../../src';
import TabsScene from '../fixtures/TabsScene.vue';
import { ResizeObservers } from '../support/resize-observers';
import { ComponentDriver } from './component';

export interface TabsMountOptions {
  readonly props?: NuiTabsProps;
  readonly modelValue?: string | undefined;
  readonly fromData?: boolean;
  readonly dir?: 'ltr' | 'rtl';
  readonly lazyPanels?: readonly string[];
  readonly closable?: readonly string[];
  readonly unfocusablePanels?: readonly string[];
  readonly observed?: boolean;
}

interface TabBox {
  readonly start: number;
  readonly size: number;
}

const DESCRIPTORS: readonly NuiTabDescriptor[] = [
  { value: 'general', label: 'General', icon: 'check' },
  { value: 'billing', label: 'Billing', disabled: true },
  { value: 'team', label: 'Team' },
  { value: 'danger', label: 'Danger' },
];

type TabsSceneWrapper = VueWrapper<InstanceType<typeof TabsScene>>;

export class TabsDriver extends ComponentDriver {
  protected readonly block = 'nui-tabs';

  static mount({
    props,
    modelValue,
    fromData,
    dir,
    lazyPanels,
    closable,
    unfocusablePanels,
    observed = false,
  }: TabsMountOptions = {}) {
    const observers = observed ? new ResizeObservers() : undefined;

    const wrapper = mount(TabsScene, {
      props: {
        props,
        descriptors: DESCRIPTORS,
        initialValue: modelValue,
        fromData,
        dir,
        lazyPanels,
        closable,
        unfocusablePanels,
      },
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

  get tabs(): DOMWrapper<HTMLButtonElement>[] {
    return this.wrapper.findAll<HTMLButtonElement>('[role="tab"]');
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
    const style = this.list.element.style;
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

  async resizeTab(label: string, { start, size }: TabBox): Promise<void> {
    const { element } = this.tab(label);

    Object.defineProperty(element, 'offsetLeft', { configurable: true, value: start });
    Object.defineProperty(element, 'offsetWidth', { configurable: true, value: size });
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
