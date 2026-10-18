import { mount, type VueWrapper } from '@vue/test-utils';
import { customRef, nextTick, ref, watch, type Ref } from 'vue';
import {
  useUploadQueue,
  type UploadContext,
  type UploadEntry,
  type UploadItem,
  type UploadQueue,
} from '../../src';
import FileDropZone from '../fixtures/FileDropZone.vue';
import { captureSetup } from './capture';

interface AdapterCall {
  readonly file: File;
  readonly context: UploadContext;
  resolve(result: string): void;
  reject(error: unknown): void;
}

export interface UploadQueueHarnessOptions {
  readonly concurrency?: number;
  readonly auto?: boolean;
  readonly controlled?: boolean;
  readonly initial?: UploadItem<string>[];
}

interface ControlledModel {
  readonly items: Ref<UploadItem<string>[]>;
  commit(): void;
}

type FileDropWrapper = VueWrapper<InstanceType<typeof FileDropZone>>;

export const fileOf = (name: string, size = 3, type = 'text/plain'): File =>
  new File([new Uint8Array(size)], name, { type });

const noop = (): void => {};

const nextFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

  await nextTick();
};

const controlledModel = (initial: UploadItem<string>[]): ControlledModel => {
  const state = { committed: initial, pending: initial, notify: noop };

  const items = customRef<UploadItem<string>[]>((track, trigger) => {
    state.notify = trigger;

    return {
      get: () => {
        track();
        return state.committed;
      },
      set: (value) => {
        state.pending = value;
      },
    };
  });

  return {
    items,
    commit: () => {
      state.committed = state.pending;
      state.notify();
    },
  };
};

const plainModel = (initial: UploadItem<string>[]): ControlledModel => {
  const items = ref<UploadItem<string>[]>(initial);
  return { items, commit: () => {} };
};

export class UploadQueueHarness {
  static mount(options: UploadQueueHarnessOptions = {}): UploadQueueHarness {
    const model = (options.controlled ? controlledModel : plainModel)(options.initial ?? []);
    const calls: AdapterCall[] = [];
    const settled: string[] = [];
    const writes = { count: 0 };

    const capture = captureSetup(() => {
      const queue = useUploadQueue<string>({
        items: model.items,
        concurrency: options.concurrency,
        auto: options.auto,
        upload: (file, context) =>
          new Promise<string>((resolve, reject) => {
            calls.push({ file, context, resolve, reject });
          }),
        onDone: (item) => settled.push(`done:${item.name}`),
        onError: (item) => settled.push(`error:${item.name}`),
      });

      watch(
        model.items,
        () => {
          writes.count += 1;
        },
        { flush: 'sync' },
      );

      return queue;
    });

    return new UploadQueueHarness(capture.wrapper, capture.value, model, calls, settled, writes);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    readonly queue: UploadQueue<string>,
    private readonly model: ControlledModel,
    readonly calls: AdapterCall[],
    readonly settled: string[],
    private readonly writes: { count: number },
  ) {}

  get modelWrites(): number {
    return this.writes.count;
  }

  async progressBurst(call: number, fractions: readonly number[]): Promise<void> {
    for (const fraction of fractions) {
      this.calls[call]?.context.onProgress(fraction);
    }
    await nextFrame();
  }

  get items(): UploadItem<string>[] {
    return this.model.items.value;
  }

  get statuses(): string[] {
    return this.items.map((item) => item.status);
  }

  get busy(): boolean {
    return this.queue.busy.value;
  }

  item(name: string): UploadItem<string> {
    const found = this.items.find((entry) => entry.name === name);

    if (!found) {
      throw new Error(`No item ${name}`);
    }

    return found;
  }

  add(...names: string[]): UploadItem<string>[] {
    return this.queue.add(names.map((name) => ({ file: fileOf(name) })));
  }

  addEntries(...entries: UploadEntry[]): UploadItem<string>[] {
    return this.queue.add(entries);
  }

  replace(items: UploadItem<string>[]): void {
    this.model.items.value = items;
    this.model.commit();
  }

  commit(): void {
    this.model.commit();
  }

  async flush(): Promise<void> {
    await nextTick();
  }

  async progress(call: number, fraction: number): Promise<void> {
    this.calls[call]?.context.onProgress(fraction);
    await nextFrame();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

interface FileTransferStub {
  readonly files: File[];
  readonly types: string[];
  dropEffect: string;
}

const dragEvent = (type: string, transfer: FileTransferStub): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: transfer });
  return event;
};

const transferOf = (files: File[], withFiles: boolean): FileTransferStub => ({
  files,
  types: withFiles ? ['Files'] : ['text/plain'],
  dropEffect: 'none',
});

export class FileDropHarness {
  static mount(options: { disabled?: boolean } = {}): FileDropHarness {
    const dropped: File[][] = [];
    const disabled = ref(options.disabled ?? false);

    const wrapper = mount(FileDropZone, {
      props: { disabled: () => disabled.value, onFiles: (files: File[]) => dropped.push(files) },
      attachTo: document.body,
    });

    return new FileDropHarness(wrapper, dropped, disabled);
  }

  private constructor(
    private readonly wrapper: FileDropWrapper,
    readonly dropped: File[][],
    private readonly disabled: Ref<boolean>,
  ) {}

  get dragging(): boolean {
    return this.wrapper.vm.drop.dragging.value;
  }

  private dispatch(target: string, type: string, transfer: FileTransferStub): boolean {
    const event = dragEvent(type, transfer);
    this.wrapper.find(target).element.dispatchEvent(event);
    return event.defaultPrevented;
  }

  enter(target = '.zone', withFiles = true): boolean {
    return this.dispatch(target, 'dragenter', transferOf([], withFiles));
  }

  over(withFiles = true): { prevented: boolean; effect: string } {
    const transfer = transferOf([], withFiles);
    const prevented = this.dispatch('.zone', 'dragover', transfer);
    return { prevented, effect: transfer.dropEffect };
  }

  leave(target = '.zone'): void {
    this.dispatch(target, 'dragleave', transferOf([], true));
  }

  dropFiles(...files: File[]): boolean {
    return this.dispatch('.zone', 'drop', transferOf(files, true));
  }

  setDisabled(value: boolean): void {
    this.disabled.value = value;
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
