import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import {
  createNuiConfig,
  NuiToast,
  NuiToaster,
  useToast,
  type NuiToasterProps,
  type NuiToasterSlot,
  type ToastMessageOptions,
  type ToastOptions,
  type ToastService,
  type ToastStoreOptions,
  type ToastTone,
} from '../../src';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface ToasterMountOptions {
  readonly props?: NuiToasterProps;
  readonly storeOptions?: ToastStoreOptions;
  readonly withPlugin?: boolean;
  readonly modalOpen?: boolean;
  readonly customLayout?: boolean;
}

const customLayout = (slot: NuiToasterSlot) =>
  h(
    'ul',
    { class: 'custom-layout' },
    slot.toasts.map((toast) => h('li', { key: toast.id }, [h(NuiToast, { toast })])),
  );

class ToastView {
  constructor(readonly root: DOMWrapper<HTMLElement>) {}

  get title(): string {
    return this.root.find('.nui-toast__title').text();
  }

  get description(): string {
    return this.root.find('.nui-toast__description').text();
  }

  get role(): string | undefined {
    return this.root.attributes('role');
  }

  get leaving(): boolean {
    return this.root.classes().includes('nui-toast--leaving');
  }

  get hasIcon(): boolean {
    return this.root.find('.nui-toast__icon').exists();
  }

  hasTone(tone: ToastTone): boolean {
    return this.root.classes().includes(`nui-toast--tone-${tone}`);
  }

  get focused(): boolean {
    return document.activeElement === this.root.element;
  }

  async hover(): Promise<void> {
    await this.root.trigger('pointerenter');
  }

  async leave(): Promise<void> {
    await this.root.trigger('pointerleave');
  }

  async focus(): Promise<void> {
    this.root.element.focus();
    await this.root.trigger('focusin');
  }

  async pressEscape(): Promise<void> {
    await this.root.trigger('keydown', { key: 'Escape' });
  }

  async clickAction(): Promise<void> {
    await this.root.find('.nui-toast__action').trigger('click');
  }

  async clickClose(): Promise<void> {
    await this.root.find('.nui-toast__close').trigger('click');
  }
}

export class ToasterDriver extends ComponentDriver {
  protected readonly block = 'nui-toaster';

  static mount({
    props = {},
    storeOptions,
    withPlugin = true,
    modalOpen = false,
    customLayout: custom = false,
  }: ToasterMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const dialog = modalOpen ? document.createElement('dialog') : null;
    if (dialog) {
      dialog.setAttribute('open', '');
      document.body.append(dialog);
    }
    const services: ToastService[] = [];
    const Host = defineComponent({
      setup() {
        services.push(useToast());
        return () => h(NuiToaster, props, custom ? { default: customLayout } : undefined);
      },
    });
    const wrapper = mount(Host, {
      attachTo: document.body,
      global: { plugins: withPlugin ? [createNuiConfig({ toasts: storeOptions })] : [] },
    });
    const [service] = services;
    if (!service) {
      throw new Error('useToast did not run');
    }
    return new ToasterDriver(wrapper, stubs, service, dialog);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly service: ToastService,
    private readonly dialog: HTMLDialogElement | null,
  ) {
    super(wrapper);
  }

  get region(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-toaster');
  }

  get toasts(): ToastView[] {
    return this.wrapper.findAll<HTMLElement>('.nui-toast').map((root) => new ToastView(root));
  }

  toast(index: number): ToastView {
    const view = this.toasts[index];
    if (!view) {
      throw new Error(`No toast at index ${index}`);
    }
    return view;
  }

  get popoverCalls(): { show: number; hide: number } {
    return this.stubs.popoverCalls;
  }

  get customLayout(): DOMWrapper<Element> {
    return this.wrapper.find('.custom-layout');
  }

  show(options: ToastOptions): string {
    return this.service.show(options);
  }

  success(title: string, options?: ToastMessageOptions): string {
    return this.service.success(title, options);
  }

  error(title: string, options?: ToastMessageOptions): string {
    return this.service.error(title, options);
  }

  async advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await nextTick();
  }

  async setTabHidden(hidden: boolean): Promise<void> {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick();
  }

  override unmount(): void {
    Reflect.deleteProperty(document, 'hidden');
    this.dialog?.remove();
    this.stubs.restore();
    super.unmount();
  }
}
