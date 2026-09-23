import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import {
  NuiTab,
  NuiTabList,
  NuiTabPanel,
  NuiTabs,
  type NuiTabDescriptor,
  type NuiTabsPanelSlot,
  type NuiTabsProps,
} from '../../src';
import { ComponentDriver } from './component';

export interface TabsMountOptions {
  readonly props?: NuiTabsProps;
  readonly modelValue?: string | undefined;
  readonly fromData?: boolean;
  readonly dir?: 'ltr' | 'rtl';
  readonly lazyPanels?: readonly string[];
}

const DESCRIPTORS: readonly NuiTabDescriptor[] = [
  { value: 'general', label: 'General', icon: 'check' },
  { value: 'billing', label: 'Billing', disabled: true },
  { value: 'team', label: 'Team' },
  { value: 'danger', label: 'Danger' },
];

const parts = (lazyPanels: readonly string[]) => () => [
  h(NuiTabList, { label: 'Settings' }, () =>
    DESCRIPTORS.map((tab) =>
      h(
        NuiTab,
        { key: tab.value, value: tab.value, icon: tab.icon, disabled: tab.disabled },
        () => tab.label,
      ),
    ),
  ),
  ...DESCRIPTORS.map((tab) =>
    h(
      NuiTabPanel,
      { key: tab.value, value: tab.value, lazy: lazyPanels.includes(tab.value) ? true : undefined },
      () => `${tab.label} panel`,
    ),
  ),
];

const fromData = () => ({
  panel: (slot: NuiTabsPanelSlot) => `${slot.tab.label} panel`,
});

export class TabsDriver extends ComponentDriver {
  protected readonly block = 'nui-tabs';

  static mount({
    props = {},
    modelValue,
    fromData: data = false,
    dir = 'ltr',
    lazyPanels = [],
  }: TabsMountOptions = {}) {
    const model = ref(modelValue);
    const tabsProps = () => ({
      ...props,
      ...(data ? { tabs: DESCRIPTORS, label: 'Settings' } : {}),
      ...(model.value === undefined ? {} : { modelValue: model.value }),
      'onUpdate:modelValue': (value: string | undefined) => {
        model.value = value;
      },
    });
    const Host = defineComponent({
      setup: () => () =>
        h('div', { dir }, [
          data
            ? h(NuiTabs, tabsProps(), fromData())
            : h(NuiTabs, tabsProps(), { default: parts(lazyPanels) }),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });
    return new TabsDriver(mount(Host, { attachTo: document.body }), model);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly model: Ref<string | undefined>,
  ) {
    super(wrapper);
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
    return this.model.value;
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

  hasRootModifier(modifier: string): boolean {
    return this.root.classes().includes(`nui-tabs--${modifier}`);
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
    this.model.value = value;
    await nextTick();
  }
}
