import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick, toRef, type Ref } from 'vue';
import type { NuiConfigOptions, NuiSplitterProps } from '../../src';
import SplitterScene from '../fixtures/SplitterScene.vue';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface SplitterMountOptions {
  readonly props?: NuiSplitterProps;
  readonly ratio?: number;
  readonly dir?: 'ltr' | 'rtl';
  readonly config?: NuiConfigOptions;
  readonly size?: { readonly width: number; readonly height: number };
}

type SplitterSceneWrapper = VueWrapper<InstanceType<typeof SplitterScene>>;

const rectOf = (size: { readonly width: number; readonly height: number }): DOMRect => ({
  x: 0,
  y: 0,
  width: size.width,
  height: size.height,
  top: 0,
  right: size.width,
  bottom: size.height,
  left: 0,
  toJSON: () => ({}),
});

export class SplitterDriver extends ComponentDriver {
  protected readonly block = 'nui-splitter';

  private constructor(
    private readonly scene: SplitterSceneWrapper,
    size: { readonly width: number; readonly height: number },
  ) {
    super(scene);

    Object.defineProperty(this.root.element, 'getBoundingClientRect', {
      value: () => rectOf(size),
    });
  }

  static mount({
    props,
    ratio,
    dir,
    config,
    size = { width: 400, height: 200 },
  }: SplitterMountOptions = {}) {
    return new SplitterDriver(
      mount(SplitterScene, {
        props: { props, initialRatio: ratio, dir },
        attachTo: document.body,
        global: { plugins: configPlugins(config) },
      }),
      size,
    );
  }

  get ratio(): Readonly<Ref<number>> {
    return toRef(() => this.scene.vm.ratio);
  }

  get root(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-splitter');
  }

  override hasModifier(modifier: string): boolean {
    return this.root.classes().includes(`nui-splitter--${modifier}`);
  }

  get divider(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-splitter__divider');
  }

  get valueNow(): number {
    return Number(this.divider.attributes('aria-valuenow'));
  }

  get ariaOrientation(): string | undefined {
    return this.divider.attributes('aria-orientation');
  }

  get label(): string | undefined {
    return this.divider.attributes('aria-label');
  }

  get controls(): string | undefined {
    return this.divider.attributes('aria-controls');
  }

  get startPaneId(): string | undefined {
    return this.wrapper.find('.nui-splitter__pane--start').attributes('id');
  }

  get cssRatio(): string {
    return this.root.element.style.getPropertyValue('--_ratio');
  }

  async press(key: string): Promise<void> {
    await this.divider.trigger('keydown', { key });
  }

  async drag(from: number, to: number, axis: 'x' | 'y' = 'x'): Promise<void> {
    const point = (value: number) =>
      axis === 'x' ? { clientX: value, clientY: 0 } : { clientX: 0, clientY: value };

    const element = this.divider.element;

    Object.defineProperty(element, 'setPointerCapture', {
      value: () => undefined,
      configurable: true,
    });

    Object.defineProperty(element, 'releasePointerCapture', {
      value: () => undefined,
      configurable: true,
    });

    element.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 1,
        ...point(from),
      }),
    );

    element.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, ...point(to) }),
    );

    element.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, ...point(to) }),
    );

    await nextTick();
  }

  async dragTo(to: number): Promise<void> {
    await this.drag(200, to);
  }
}
