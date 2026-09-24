import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { NuiTooltip, type NuiTooltipProps, type NuiTooltipTriggerSlot } from '../../src';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface TooltipMountOptions {
  readonly props?: NuiTooltipProps;
}

export class TooltipDriver extends ComponentDriver {
  protected readonly block = 'nui-tooltip';

  static mount({ props = {} }: TooltipMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const model = ref(false);

    const Host = defineComponent({
      setup: () => () =>
        h(
          NuiTooltip,
          {
            ...props,
            open: model.value,
            'onUpdate:open': (value: boolean) => {
              model.value = value;
            },
          },
          {
            trigger: (slot: NuiTooltipTriggerSlot) => h('button', slot.attrs, 'Save'),
            default: () => 'Saves the document',
          },
        ),
    });

    return new TooltipDriver(mount(Host, { attachTo: document.body }), stubs, model);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly model: Ref<boolean>,
  ) {
    super(wrapper);
  }

  get trigger(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('button');
  }

  get content(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-tooltip');
  }

  get modelOpen(): boolean {
    return this.model.value;
  }

  get popoverCalls(): { show: number; hide: number } {
    return this.stubs.popoverCalls;
  }

  async hover(): Promise<void> {
    await this.trigger.trigger('pointerenter', { pointerType: 'mouse' });
  }

  async tap(): Promise<void> {
    await this.trigger.trigger('pointerenter', { pointerType: 'touch' });
  }

  async leave(): Promise<void> {
    await this.trigger.trigger('pointerleave');
  }

  async hoverContent(): Promise<void> {
    await this.content.trigger('pointerenter');
  }

  async press(): Promise<void> {
    await this.trigger.trigger('pointerdown');
    await this.trigger.trigger('focus');
  }

  async focus(): Promise<void> {
    await this.trigger.trigger('focus');
  }

  async blur(): Promise<void> {
    await this.trigger.trigger('blur');
  }

  async pressEscape(): Promise<void> {
    await this.trigger.trigger('keydown', { key: 'Escape' });
  }

  async advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
