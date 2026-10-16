import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { NuiPopover, type NuiPopoverProps, type NuiPopoverTriggerSlot } from '../../src';
import { dismissPopoverNatively, TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface PopoverMountOptions {
  readonly props?: NuiPopoverProps;
  readonly open?: boolean;
}

export class PopoverDriver extends ComponentDriver {
  protected readonly block = 'nui-popover';

  static mount({ props = {}, open = false }: PopoverMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const model = ref(open);

    const Host = defineComponent({
      setup: () => () =>
        h('div', [
          h(
            NuiPopover,
            {
              ...props,
              open: model.value,
              'onUpdate:open': (value: boolean) => {
                model.value = value;
              },
            },
            {
              trigger: (slot: NuiPopoverTriggerSlot) =>
                h('button', { ...slot.attrs, class: 'opener' }, 'Open'),
              default: () => h('a', { href: '#profile' }, 'Content'),
            },
          ),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });

    return new PopoverDriver(mount(Host, { attachTo: document.body }), stubs, model);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly model: Ref<boolean>,
  ) {
    super(wrapper);
  }

  get trigger(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('.opener');
  }

  get content(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-popover');
  }

  get modelOpen(): boolean {
    return this.model.value;
  }

  get popoverCalls(): { show: number; hide: number } {
    return this.stubs.popoverCalls;
  }

  get sideVector(): string {
    const style = this.content.element.style;

    return `${style.getPropertyValue('--_side-x')} ${style.getPropertyValue('--_side-y')}`;
  }

  get arrow(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-popover__arrow');
  }

  async receiveOpen(value: boolean): Promise<void> {
    this.model.value = value;
    await nextTick();
  }

  get triggerFocused(): boolean {
    return document.activeElement === this.trigger.element;
  }

  async hover(): Promise<void> {
    await this.trigger.trigger('pointerenter', { pointerType: 'mouse' });
  }

  async leave(): Promise<void> {
    await this.trigger.trigger('pointerleave', { pointerType: 'mouse' });
  }

  async hoverContent(): Promise<void> {
    await this.content.trigger('pointerenter', { pointerType: 'mouse' });
  }

  async leaveContent(): Promise<void> {
    await this.content.trigger('pointerleave', { pointerType: 'mouse' });
  }

  async tap(): Promise<void> {
    await this.trigger.trigger('pointerdown', { pointerType: 'touch' });
  }

  async click(): Promise<void> {
    await this.trigger.trigger('pointerdown', { pointerType: 'mouse' });
    this.trigger.element.focus();
    await nextTick();
  }

  async focusTrigger(): Promise<void> {
    this.trigger.element.focus();
    await nextTick();
  }

  async focusContent(): Promise<void> {
    this.content.find<HTMLAnchorElement>('a').element.focus();
    await nextTick();
  }

  async focusOutside(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('.outside').element.focus();
    await nextTick();
  }

  async pressEscape(): Promise<void> {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
  }

  async advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await nextTick();
  }

  dismissNatively(): void {
    dismissPopoverNatively(this.content.element);
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
