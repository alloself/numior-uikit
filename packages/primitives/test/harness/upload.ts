import { mount, type VueWrapper } from '@vue/test-utils';
import { customRef, defineComponent, h, nextTick, ref, type Ref } from 'vue';
import {
  useFileDrop,
  useUploadQueue,
  type UploadContext,
  type UploadEntry,
  type UploadItem,
  type UploadQueue,
} from '../../src';

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

type Outcome<T> = { readonly ran: true; readonly value: T } | { readonly ran: false };

export const fileOf = (name: string, size = 3, type = 'text/plain'): File =>
  new File([new Uint8Array(size)], name, { type });

const controlledModel = (initial: UploadItem<string>[]): ControlledModel => {
  const state = { committed: initial, pending: initial };
  let notify = (): void => {};

  const items = customRef<UploadItem<string>[]>((track, trigger) => {
    notify = trigger;

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
      notify();
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
    const outcome: { current: Outcome<UploadQueue<string>> } = { current: { ran: false } };

    const Probe = defineComponent({
      setup() {
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

        outcome.current = { ran: true, value: queue };
        return () => h('i');
      },
    });

    const wrapper = mount(Probe);

    if (!outcome.current.ran) {
      throw new Error('useUploadQueue did not run');
    }

    return new UploadQueueHarness(wrapper, outcome.current.value, model, calls, settled);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    readonly queue: UploadQueue<string>,
    private readonly model: ControlledModel,
    readonly calls: AdapterCall[],
    readonly settled: string[],
  ) {}

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

    const outcome: { current: Outcome<ReturnType<typeof useFileDrop>> } = {
      current: { ran: false },
    };

    const Probe = defineComponent({
      setup() {
        const drop = useFileDrop({ disabled, onFiles: (files) => dropped.push(files) });
        outcome.current = { ran: true, value: drop };

        return () =>
          h('div', { class: 'zone', ...drop.attrs }, [h('span', { class: 'child' }, 'inner')]);
      },
    });

    const wrapper = mount(Probe, { attachTo: document.body });

    if (!outcome.current.ran) {
      throw new Error('useFileDrop did not run');
    }

    return new FileDropHarness(wrapper, outcome.current.value, dropped, disabled);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly drop: ReturnType<typeof useFileDrop>,
    readonly dropped: File[][],
    private readonly disabled: Ref<boolean>,
  ) {}

  get dragging(): boolean {
    return this.drop.dragging.value;
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
