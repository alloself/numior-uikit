import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import type { NuiConfigOptions } from '@numior/primitives';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { NuiAvatarUpload, type NuiAvatarUploadProps, type NuiUploadItem } from '../../src';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';
import { stubObjectUrls, transferEvent, type AdapterCall, type UrlLog } from './upload';

type AvatarProps = Omit<NuiAvatarUploadProps<string>, 'upload'>;

export interface AvatarUploadMountOptions {
  readonly props?: AvatarProps;
  readonly modelValue?: NuiUploadItem<string> | null;
  readonly config?: NuiConfigOptions;
}

export class AvatarUploadDriver extends ComponentDriver {
  protected readonly block = 'nui-avatar-upload';

  static mount({ props = {}, modelValue = null, config }: AvatarUploadMountOptions = {}) {
    const model = ref<NuiUploadItem<string> | null>(modelValue);
    const calls: AdapterCall[] = [];
    const events: string[] = [];
    const urls: UrlLog = { created: [], revoked: [] };
    const restoreUrls = stubObjectUrls(urls);

    const Host = defineComponent({
      setup: () => () =>
        h(NuiAvatarUpload<string>, {
          ...props,
          modelValue: model.value,
          'onUpdate:modelValue': (value: NuiUploadItem<string> | null) => {
            model.value = value;
          },
          upload: (file, context) =>
            new Promise<string>((resolve, reject) => {
              calls.push({ file, context, resolve, reject });
            }),
          onReject: (error) => events.push(`reject:${error.reason}`),
          onDone: (item) => events.push(`done:${item.name}`),
          onError: (item) => events.push(`error:${item.name}`),
          onRemove: (item) => events.push(`remove:${item.name}`),
        }),
    });

    const wrapper = mount(Host, {
      attachTo: document.body,
      global: { plugins: configPlugins(config) },
    });

    return new AvatarUploadDriver(wrapper, model, calls, events, urls, restoreUrls);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly model: Ref<NuiUploadItem<string> | null>,
    readonly calls: AdapterCall[],
    readonly events: string[],
    readonly urls: UrlLog,
    private readonly restoreUrls: () => void,
  ) {
    super(wrapper);
  }

  get item(): NuiUploadItem<string> | null {
    return this.model.value;
  }

  get input(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('.nui-avatar-upload__input');
  }

  get trigger(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('.nui-avatar-upload__trigger');
  }

  get triggerName(): string | undefined {
    return this.trigger.attributes('aria-label');
  }

  get imageSrc(): string | undefined {
    const image = this.wrapper.find('.nui-avatar__image');
    return image.exists() ? image.attributes('src') : undefined;
  }

  get initials(): string | undefined {
    const initials = this.wrapper.find('.nui-avatar__initials');
    return initials.exists() ? initials.text() : undefined;
  }

  get status(): string {
    return this.wrapper.find('.nui-avatar-upload__status').text();
  }

  get progressValue(): string | undefined {
    const progress = this.wrapper.find('progress');
    return progress.exists() ? progress.attributes('value') : undefined;
  }

  get actionLabels(): string[] {
    return this.wrapper
      .findAll('.nui-avatar-upload__actions button')
      .map((button) => button.attributes('aria-label') ?? '');
  }

  async choose(file: File): Promise<void> {
    Object.defineProperty(this.input.element, 'files', { value: [file], configurable: true });
    await this.input.trigger('change');
  }

  async drop(file: File): Promise<void> {
    this.trigger.element.dispatchEvent(transferEvent('drop', [file]));
    await nextTick();
  }

  async dragEnter(): Promise<void> {
    this.trigger.element.dispatchEvent(transferEvent('dragenter', []));
    await nextTick();
  }

  async report(fraction: number): Promise<void> {
    this.calls.at(-1)?.context.onProgress(fraction);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    await nextTick();
  }

  async resolveLast(result: string): Promise<void> {
    this.calls.at(-1)?.resolve(result);
    await flushPromises();
  }

  async rejectLast(): Promise<void> {
    this.calls.at(-1)?.reject(new Error('boom'));
    await flushPromises();
  }

  async clickAction(label: string): Promise<void> {
    await this.wrapper.find(`.nui-avatar-upload__actions [aria-label="${label}"]`).trigger('click');
  }

  override unmount(): void {
    this.wrapper.unmount();
    this.restoreUrls();
  }
}
