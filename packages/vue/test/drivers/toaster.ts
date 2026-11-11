import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import {
  createNuiConfig,
  type NuiConfigOptions,
  type NuiToasterProps,
  type ToastMessageOptions,
  type ToastOptions,
  type ToastService,
  type ToastStoreOptions,
  type ToastTone,
} from '../../src';
import ToasterScene from '../fixtures/ToasterScene.vue';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface ToasterMountOptions {
  readonly props?: NuiToasterProps;
  readonly storeOptions?: ToastStoreOptions;
  readonly withPlugin?: boolean;
  readonly modalOpen?: boolean;
  readonly customToast?: boolean;
  readonly config?: NuiConfigOptions;
}

export interface StackItemView {
  readonly index: number;
  readonly behind: boolean;
  readonly leaving: boolean;
}

type ToasterSceneWrapper = VueWrapper<InstanceType<typeof ToasterScene>>;

const REST: PointerEventInit = { clientX: 40, clientY: 40, pointerType: 'mouse' };

const AWAY: PointerEventInit = { clientX: 400, clientY: 300, pointerType: 'mouse' };

const readItem = (item: DOMWrapper<HTMLElement>): StackItemView => ({
  index: Number(item.element.style.getPropertyValue('--_index')),
  behind: item.classes().includes('nui-toaster__item--behind'),
  leaving: item.classes().includes('nui-toaster__item--leaving'),
});

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

  get closeLabel(): string | undefined {
    return this.root.find('.nui-toast__close').attributes('aria-label');
  }

  get closeIsIconOnly(): boolean {
    return this.root.find('.nui-toast__close').classes().includes('nui-button--icon-only');
  }

  async focus(): Promise<void> {
    this.root.element.focus();
    await this.root.trigger('focusin');
  }

  async pressEscape(): Promise<void> {
    await this.root.trigger('keydown', { key: 'Escape' });
  }

  get hasAction(): boolean {
    return this.root.find('.nui-toast__action').exists();
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
    props,
    storeOptions,
    withPlugin = true,
    modalOpen = false,
    customToast,
    config,
  }: ToasterMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const dialog = modalOpen ? document.createElement('dialog') : null;
    if (dialog) {
      dialog.setAttribute('open', '');
      document.body.append(dialog);
    }

    const wrapper = mount(ToasterScene, {
      props: { props, customToast },
      attachTo: document.body,
      global: { plugins: withPlugin ? [createNuiConfig({ ...config, toasts: storeOptions })] : [] },
    });

    return new ToasterDriver(wrapper, stubs, dialog);
  }

  private constructor(
    private readonly scene: ToasterSceneWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly dialog: HTMLDialogElement | null,
  ) {
    super(scene);
  }

  private get service(): ToastService {
    return this.scene.vm.toast;
  }

  get region(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-toaster');
  }

  get label(): string | undefined {
    return this.region.attributes('aria-label');
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

  get items(): StackItemView[] {
    return this.wrapper.findAll<HTMLElement>('.nui-toaster__item').map(readItem);
  }

  get popoverCalls(): { show: number; hide: number } {
    return this.stubs.popoverCalls;
  }

  get outsideFocused(): boolean {
    return document.activeElement === this.wrapper.find('.outside').element;
  }

  get customToasts(): string[] {
    return this.wrapper.findAll('.custom-toast').map((toast) => toast.text());
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

  async focusOutside(): Promise<void> {
    this.wrapper.find<HTMLElement>('.outside').element.focus();
    await nextTick();
  }

  async clear(): Promise<void> {
    this.service.clear();
    await nextTick();
  }

  async hoverStack(): Promise<void> {
    await this.region.trigger('pointerenter');
  }

  async leaveStack(): Promise<void> {
    await this.region.trigger('pointerleave');
  }

  get stackOpen(): boolean {
    return this.region.classes().includes('nui-toaster--hovered');
  }

  async restOnStack(): Promise<void> {
    this.region.element.dispatchEvent(new PointerEvent('pointerenter', REST));
    await nextTick();
  }

  async loseWhatIsUnderThePointer(): Promise<void> {
    this.region.element.dispatchEvent(new PointerEvent('pointerleave', REST));
    await nextTick();
  }

  async movePointerAway(): Promise<void> {
    this.wrapper
      .find('.outside')
      .element.dispatchEvent(new PointerEvent('pointermove', { ...AWAY, bubbles: true }));

    await nextTick();
  }

  async dismissCustom(index: number): Promise<void> {
    const button = this.wrapper.findAll('.custom-dismiss')[index];
    if (!button) {
      throw new Error(`No custom toast at index ${index}`);
    }
    await button.trigger('click');
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
