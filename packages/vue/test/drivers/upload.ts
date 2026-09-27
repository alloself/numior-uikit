import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, h, nextTick, ref, useTemplateRef, type Ref, type ShallowRef } from 'vue';
import {
  NuiField,
  NuiUpload,
  type NuiFieldProps,
  type NuiUploadAdapter,
  type NuiUploadItem,
  type NuiUploadProps,
  type NuiConfigOptions,
} from '../../src';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';
import {
  anyOf,
  isNumber,
  isString,
  listOf,
  oneOf,
  optional,
  shapeOf,
} from '../../../primitives/test/support/guards';

const UPLOAD_FILE = { id: isString, name: isString, size: isNumber, type: isString };

const isUploadError = shapeOf({
  reason: oneOf('type', 'size', 'count', 'custom', 'upload'),
  message: optional(isString),
});

const isItem = anyOf(
  shapeOf({ ...UPLOAD_FILE, status: oneOf('queued') }),
  shapeOf({ ...UPLOAD_FILE, status: oneOf('uploading'), progress: isNumber }),
  shapeOf({ ...UPLOAD_FILE, status: oneOf('done'), result: optional(isString) }),
  shapeOf({ ...UPLOAD_FILE, status: oneOf('error'), error: isUploadError }),
);

const isItems = listOf(isItem);

type UploadProps = Omit<NuiUploadProps<string>, 'upload'>;
type UploadContext = Parameters<NuiUploadAdapter<string>>[1];

export interface UploadMountOptions {
  readonly props?: UploadProps;
  readonly modelValue?: NuiUploadItem<string>[];
  readonly field?: NuiFieldProps;
  readonly config?: NuiConfigOptions;
}

interface AdapterCall {
  readonly file: File;
  readonly context: UploadContext;
  resolve(result: string): void;
  reject(error: unknown): void;
}

interface UploadExposed {
  open(): void;
  start(): void;
  retry(id: string): void;
  remove(id: string): void;
}

interface UrlLog {
  readonly created: string[];
  readonly revoked: string[];
}

export const fileOf = (name: string, size = 3, type = 'text/plain'): File =>
  new File([new Uint8Array(size)], name, { type });

const stubObjectUrls = (log: UrlLog): (() => void) => {
  const create = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const revoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: () => {
      const url = `blob:mock-${log.created.length + 1}`;
      log.created.push(url);
      return url;
    },
  });

  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: (url: string) => {
      log.revoked.push(url);
    },
  });

  return () => {
    for (const [name, descriptor] of [
      ['createObjectURL', create],
      ['revokeObjectURL', revoke],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(URL, name, descriptor);
      } else {
        Reflect.deleteProperty(URL, name);
      }
    }
  };
};

const transferEvent = (type: string, files: File[]): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });

  Object.defineProperty(event, 'dataTransfer', {
    value: { files, types: ['Files'], dropEffect: 'none' },
  });

  return event;
};

export class UploadDriver extends ComponentDriver {
  protected readonly block = 'nui-upload';

  static mount({
    props = {},
    modelValue = [],
    field,
    config,
  }: UploadMountOptions = {}): UploadDriver {
    const model = ref<NuiUploadItem<string>[]>(modelValue);
    const calls: AdapterCall[] = [];
    const events: string[] = [];
    const urls: UrlLog = { created: [], revoked: [] };
    const restoreUrls = stubObjectUrls(urls);
    const exposed: { current: ShallowRef<UploadExposed | null> | null } = { current: null };

    const control = () =>
      h(NuiUpload<string>, {
        ...props,
        ref: 'upload',
        modelValue: model.value,
        'onUpdate:modelValue': (value: unknown) => {
          if (isItems(value)) {
            model.value = value;
          }
        },
        upload: (file, context) =>
          new Promise<string>((resolve, reject) => {
            calls.push({ file, context, resolve, reject });
          }),
        onReject: (rejections) =>
          events.push(`reject:${rejections.map((entry) => entry.file.name).join(',')}`),
        onDone: (item) => events.push(`done:${item.name}`),
        onError: (item) => events.push(`error:${item.name}`),
        onRemove: (item) => events.push(`remove:${item.name}`),
      });

    const Host = defineComponent({
      setup() {
        exposed.current = useTemplateRef<UploadExposed>('upload');
        return () => (field ? h(NuiField, field, control) : control());
      },
    });

    const wrapper = mount(Host, {
      attachTo: document.body,
      global: { plugins: configPlugins(config) },
    });

    const driver = new UploadDriver(wrapper, model, calls, events, urls, exposed, restoreUrls);

    Object.defineProperty(driver.input.element, 'click', {
      value: driver.clicks,
      configurable: true,
    });

    return driver;
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly model: Ref<NuiUploadItem<string>[]>,
    readonly calls: AdapterCall[],
    readonly events: string[],
    readonly urls: UrlLog,
    private readonly exposed: { current: ShallowRef<UploadExposed | null> | null },
    private readonly restoreUrls: () => void,
  ) {
    super(wrapper);
  }

  readonly clicks = vi.fn<() => void>();

  get root(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-upload');
  }

  override hasModifier(modifier: string): boolean {
    return this.root.classes().includes(`${this.block}--${modifier}`);
  }

  get input(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('.nui-upload__input');
  }

  get zone(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-upload__zone');
  }

  get browse(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-upload__browse');
  }

  get items(): NuiUploadItem<string>[] {
    return this.model.value;
  }

  get statuses(): string[] {
    return this.items.map((item) => item.status);
  }

  get names(): string[] {
    return this.wrapper.findAll('.nui-upload-item .nui-row__title').map((title) => title.text());
  }

  get liveText(): string {
    return this.wrapper.find('.nui-upload__live').text();
  }

  get openCount(): number {
    return this.clicks.mock.calls.length;
  }

  item(name: string): NuiUploadItem<string> {
    const found = this.items.find((entry) => entry.name === name);

    if (!found) {
      throw new Error(`No item ${name}`);
    }

    return found;
  }

  row(name: string): DOMWrapper<Element> {
    const found = this.wrapper
      .findAll('.nui-upload-item')
      .find((row) => row.find('.nui-row__title').text() === name);

    if (!found) {
      throw new Error(`No row ${name}`);
    }

    return found;
  }

  description(name: string): string {
    return this.row(name).find('.nui-row__description').text();
  }

  progressValue(name: string): string | undefined {
    const progress = this.row(name).find('progress');
    return progress.exists() ? progress.attributes('value') : undefined;
  }

  thumb(name: string): string | undefined {
    const image = this.row(name).find('img');
    return image.exists() ? image.attributes('src') : undefined;
  }

  rowStatusModifier(name: string): string | undefined {
    return this.row(name)
      .classes()
      .find((entry) => entry.startsWith('nui-upload-item--status-'));
  }

  private actionButtons(name: string): string[] {
    return this.row(name)
      .findAll('button')
      .map((button) => button.attributes('aria-label') ?? '');
  }

  actions(name: string): string[] {
    return this.actionButtons(name);
  }

  async addFiles(...files: File[]): Promise<void> {
    Object.defineProperty(this.input.element, 'files', { value: files, configurable: true });
    await this.input.trigger('change');
  }

  async dropFiles(...files: File[]): Promise<void> {
    this.zone.element.dispatchEvent(transferEvent('drop', files));
    await nextTick();
  }

  async dragEnter(): Promise<void> {
    this.zone.element.dispatchEvent(transferEvent('dragenter', []));
    await nextTick();
  }

  async dragLeave(): Promise<void> {
    this.zone.element.dispatchEvent(transferEvent('dragleave', []));
    await nextTick();
  }

  async clickZone(): Promise<void> {
    await this.zone.trigger('click');
  }

  async clickBrowse(): Promise<void> {
    await this.browse.trigger('click');
  }

  private async clickAction(name: string, label: string): Promise<void> {
    const button = this.row(name)
      .findAll('button')
      .find((candidate) => candidate.attributes('aria-label') === label);

    if (!button) {
      throw new Error(`No action ${label} on ${name}`);
    }

    await button.trigger('click');
  }

  clickCancel(name: string): Promise<void> {
    return this.clickAction(name, 'Cancel upload');
  }

  clickRetry(name: string): Promise<void> {
    return this.clickAction(name, 'Retry');
  }

  clickRemove(name: string): Promise<void> {
    return this.clickAction(name, 'Remove');
  }

  async progress(index: number, fraction: number): Promise<void> {
    this.calls[index]?.context.onProgress(fraction);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    await nextTick();
  }

  async resolve(index: number, result: string): Promise<void> {
    this.calls[index]?.resolve(result);
    await nextTick();
  }

  async fail(index: number, error: unknown): Promise<void> {
    this.calls[index]?.reject(error);
    await nextTick();
  }

  aborted(index: number): boolean {
    return this.calls[index]?.context.signal.aborted ?? false;
  }

  async start(): Promise<void> {
    this.exposed.current?.value?.start();
    await nextTick();
  }

  open(): void {
    this.exposed.current?.value?.open();
  }

  override unmount(): void {
    super.unmount();
    this.restoreUrls();
  }
}
