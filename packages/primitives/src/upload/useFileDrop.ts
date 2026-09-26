import { computed, shallowRef, toValue, type MaybeRefOrGetter, type Ref } from 'vue';

export interface FileDropOptions {
  readonly disabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly onFiles: (files: File[]) => void;
}

export interface FileDropAttrs {
  readonly onDragenter: (event: Event) => void;
  readonly onDragover: (event: Event) => void;
  readonly onDragleave: (event: Event) => void;
  readonly onDrop: (event: Event) => void;
}

export interface FileDrop {
  readonly dragging: Readonly<Ref<boolean>>;
  readonly attrs: FileDropAttrs;
}

interface FileTransfer {
  readonly files: ArrayLike<File>;
  readonly types: ArrayLike<string>;
  dropEffect: string;
}

const isFileTransfer = (value: unknown): value is FileTransfer =>
  typeof value === 'object' && value !== null && 'files' in value && 'types' in value;

const transferOf = (event: Event): FileTransfer | null =>
  'dataTransfer' in event && isFileTransfer(event.dataTransfer) ? event.dataTransfer : null;

const carriesFiles = (transfer: FileTransfer | null): transfer is FileTransfer =>
  transfer !== null && Array.from(transfer.types).includes('Files');

export const useFileDrop = (options: FileDropOptions): FileDrop => {
  const depth = shallowRef(0);
  const dragging = computed(() => depth.value > 0);
  const active = (): boolean => !(toValue(options.disabled) ?? false);

  const settle = (): void => {
    depth.value = 0;
  };

  const onDragenter = (event: Event): void => {
    if (!active() || !carriesFiles(transferOf(event))) {
      return;
    }

    event.preventDefault();
    depth.value += 1;
  };

  const onDragover = (event: Event): void => {
    const transfer = transferOf(event);

    if (!active() || !carriesFiles(transfer)) {
      return;
    }

    event.preventDefault();
    transfer.dropEffect = 'copy';
  };

  const onDragleave = (): void => {
    if (depth.value === 0) {
      return;
    }

    depth.value -= 1;
  };

  const onDrop = (event: Event): void => {
    if (!active()) {
      return;
    }

    event.preventDefault();
    settle();
    const files = Array.from(transferOf(event)?.files ?? []);

    if (files.length > 0) {
      options.onFiles(files);
    }
  };

  return { dragging, attrs: { onDragenter, onDragover, onDragleave, onDrop } };
};
