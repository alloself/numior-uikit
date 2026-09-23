import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
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
            trigger: (slot: NuiPopoverTriggerSlot) => h('button', slot.attrs, 'Open'),
            default: () => 'Content',
          },
        ),
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
    return this.wrapper.find<HTMLButtonElement>('button');
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

  get sideModifier(): string | undefined {
    return this.content.classes().find((name) => name.startsWith('nui-popover--side-'));
  }

  get arrow(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-popover__arrow');
  }

  async receiveOpen(value: boolean): Promise<void> {
    this.model.value = value;
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
