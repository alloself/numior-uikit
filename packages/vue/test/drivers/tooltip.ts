import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import type { NuiTooltipProps } from '../../src';
import TooltipTargetsScene from '../fixtures/TooltipTargetsScene.vue';
import TooltipScene from '../fixtures/TooltipScene.vue';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface TooltipMountOptions {
  readonly props?: NuiTooltipProps;
  readonly anchored?: boolean;
}

type TooltipSceneWrapper = VueWrapper<InstanceType<typeof TooltipScene>>;

type TargetsSceneWrapper = VueWrapper<InstanceType<typeof TooltipTargetsScene>>;

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

  get label(): string {
    return this.content.find('.nui-tooltip__text').text();
  }

  get keys(): string[] {
    return this.content.findAll('.nui-kbd__key').map((key) => key.text());
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

export class TooltipTargetsDriver extends ComponentDriver {
  protected readonly block = 'nui-tooltip';

  static mount(): TooltipTargetsDriver {
    return new TooltipTargetsDriver(
      mount(TooltipTargetsScene, { attachTo: document.body }),
      new TopLayerStubs(),
    );
  }

  private constructor(
    private readonly scene: TargetsSceneWrapper,
    private readonly stubs: TopLayerStubs,
  ) {
    super(scene);
  }

  private target(label: string): HTMLElement {
    const found = this.wrapper
      .findAll<HTMLElement>('.act')
      .find((button) => button.attributes('aria-label') === label);

    if (found === undefined) {
      throw new Error(`No target reads ${label}`);
    }
    return found.element;
  }

  private get outside(): HTMLElement {
    return this.wrapper.find<HTMLElement>('.outside').element;
  }

  async ready(): Promise<void> {
    await nextTick();
  }

  get open(): boolean {
    return this.scene.vm.open;
  }

  get text(): string {
    const label = this.wrapper.find('.nui-tooltip__text');

    return (label.exists() ? label : this.wrapper.find('.nui-tooltip')).text();
  }

  get keys(): string[] {
    return this.wrapper.findAll('.nui-tooltip .nui-kbd__key').map((key) => key.text());
  }

  describedBy(label: string): string | null {
    return this.target(label).getAttribute('aria-describedby');
  }

  async hover(label: string, from: string | null = null, part = false): Promise<void> {
    const element = this.target(label);
    const entered = part ? (element.querySelector('.glyph') ?? element) : element;
    const previous = from === null ? this.outside : this.target(from);

    previous.dispatchEvent(
      new PointerEvent('pointerout', {
        bubbles: true,
        pointerType: 'mouse',
        relatedTarget: entered,
      }),
    );

    entered.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
        relatedTarget: previous,
      }),
    );

    await nextTick();
  }

  async hoverGap(from: string): Promise<void> {
    const gap = this.wrapper.find<HTMLElement>('.gap').element;

    this.target(from).dispatchEvent(
      new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: gap }),
    );

    gap.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
    await nextTick();
  }

  async focus(label: string, from: string | null = null): Promise<void> {
    const element = this.target(label);
    const previous = from === null ? this.outside : this.target(from);

    previous.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: element }));
    element.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: previous }));
    await nextTick();
  }

  async blur(label: string): Promise<void> {
    this.target(label).dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: this.outside }),
    );

    await nextTick();
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
