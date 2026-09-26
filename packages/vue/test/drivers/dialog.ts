import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick, type Component } from 'vue';
import {
  NuiDialog,
  NuiDrawer,
  type NuiConfigOptions,
  type NuiDialogProps,
  type NuiDrawerProps,
} from '../../src';
import { configPlugins } from '../support/config';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver, emittedStrings } from './component';

export interface SurfaceMountOptions<P> {
  readonly props?: P;
  readonly open?: boolean;
  readonly slots?: Record<string, () => unknown>;
  readonly config?: NuiConfigOptions;
}

const mountSurface = <P extends object>(
  component: Component,
  { props, open = true, slots = {}, config }: SurfaceMountOptions<P>,
): [VueWrapper, TopLayerStubs] => {
  const stubs = new TopLayerStubs();

  const wrapper = mount(component, {
    props: { ...props, open },
    slots: { default: 'Body', ...slots },
    attachTo: document.body,
    global: { plugins: configPlugins(config) },
  });

  return [wrapper, stubs];
};

const press = (element: HTMLElement, clientX: number): void => {
  element.dispatchEvent(new PointerEvent('pointerdown', { clientX, clientY: 0, bubbles: true }));
  element.dispatchEvent(new MouseEvent('click', { clientX, clientY: 0, bubbles: true }));
};

abstract class SurfaceDriver extends ComponentDriver {
  constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
  ) {
    super(wrapper);
  }

  get dialog(): DOMWrapper<HTMLDialogElement> {
    return this.wrapper.find<HTMLDialogElement>('dialog');
  }

  get isOpen(): boolean {
    return this.dialog.element.hasAttribute('open');
  }

  get labelledBy(): string | undefined {
    return this.dialog.attributes('aria-labelledby');
  }

  get describedBy(): string | undefined {
    return this.dialog.attributes('aria-describedby');
  }

  get titleText(): string {
    return this.wrapper.find('.nui-dialog__title').text();
  }

  get descriptionText(): string {
    return this.wrapper.find('.nui-dialog__description').text();
  }

  get closeButton(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-dialog__close');
  }

  get closeLabel(): string | undefined {
    return this.closeButton.attributes('aria-label');
  }

  get footer(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-dialog__footer');
  }

  get emittedOpen(): boolean[] {
    return (this.wrapper.emitted('update:open') ?? []).flatMap(([value]) =>
      typeof value === 'boolean' ? [value] : [],
    );
  }

  get emittedClose(): string[] {
    return emittedStrings(this.wrapper, 'close');
  }

  get showModalCalls(): number {
    return this.stubs.showModalCalls.count;
  }

  get closedWith(): string[] {
    return this.stubs.closedWith;
  }

  async clickClose(): Promise<void> {
    await this.closeButton.trigger('click');
  }

  pressEscape(): boolean {
    const event = new Event('cancel', { cancelable: true });
    this.dialog.element.dispatchEvent(event);
    if (!event.defaultPrevented) {
      this.dialog.element.close();
    }
    return event.defaultPrevented;
  }

  clickBackdrop(): void {
    press(this.dialog.element, 40);
  }

  clickInside(): void {
    press(this.dialog.element, 0);
  }

  async receiveOpen(value: boolean): Promise<void> {
    await this.wrapper.setProps({ open: value });
  }

  async reopen(): Promise<void> {
    await this.receiveOpen(false);
    await this.receiveOpen(true);
    await nextTick();
  }

  async settle(): Promise<void> {
    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}

export class DialogDriver extends SurfaceDriver {
  protected readonly block = 'nui-dialog';

  static mount(options: SurfaceMountOptions<NuiDialogProps> = {}) {
    return new DialogDriver(...mountSurface(NuiDialog, options));
  }
}

export class DrawerDriver extends SurfaceDriver {
  protected readonly block = 'nui-drawer';

  static mount(options: SurfaceMountOptions<NuiDrawerProps> = {}) {
    return new DrawerDriver(...mountSurface(NuiDrawer, options));
  }
}
