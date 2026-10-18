import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import type { NuiTooltipProps } from '../../src';
import TooltipScene from '../fixtures/TooltipScene.vue';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface TooltipMountOptions {
  readonly props?: NuiTooltipProps;
  readonly anchored?: boolean;
}

type TooltipSceneWrapper = VueWrapper<InstanceType<typeof TooltipScene>>;

export class TooltipDriver extends ComponentDriver {
  protected readonly block = 'nui-tooltip';

  static mount({ props, anchored = false }: TooltipMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const anchor = anchored ? document.body.appendChild(document.createElement('button')) : null;

    return new TooltipDriver(
      mount(TooltipScene, { props: { props, anchor }, attachTo: document.body }),
      stubs,
      anchor,
    );
  }

  private constructor(
    private readonly scene: TooltipSceneWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly anchor: HTMLButtonElement | null,
  ) {
    super(scene);
  }

  get trigger(): DOMWrapper<HTMLButtonElement> {
    return this.anchor
      ? new DOMWrapper(this.anchor)
      : this.wrapper.find<HTMLButtonElement>('button');
  }

  get content(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-tooltip');
  }

  get modelOpen(): boolean {
    return this.scene.vm.open;
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

  async focusOutside(): Promise<void> {
    this.wrapper.find<HTMLInputElement>('.outside').element.focus();
    await nextTick();
  }

  async pressEscapeOutside(): Promise<void> {
    await this.wrapper.find<HTMLInputElement>('.outside').trigger('keydown', { key: 'Escape' });
  }

  async advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
    this.anchor?.remove();
  }
}
