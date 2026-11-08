import { promiseTimeout } from '@vueuse/core';
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { XlsxReadKind } from '../../xlsx/read/read.types';
import {
  FileAskKind,
  FileBusy,
  FileKey,
  type FileAsk,
  type NuiSpreadsheetSaveAdapter,
  type SheetFile,
  type SheetFileOptions,
} from './file.types';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const XLSX_EXTENSION = '.xlsx';

const REVOKE_DELAY = 1000;

const withExtension = (name: string): string =>
  name.toLowerCase().endsWith(XLSX_EXTENSION) ? name : `${name}${XLSX_EXTENSION}`;

const revokeLater = async (url: string): Promise<void> => {
  await promiseTimeout(REVOKE_DELAY);
  URL.revokeObjectURL(url);
};

const download: NuiSpreadsheetSaveAdapter = (saved) => {
  const url = URL.createObjectURL(new Blob([saved.bytes], { type: XLSX_TYPE }));
  const link = document.createElement('a');

  link.href = url;
  link.download = saved.name;
  link.click();

  void revokeLater(url);
};

const isPlainChord = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;

export const useSheetFile = (options: SheetFileOptions): SheetFile => {
  const busy = ref<FileBusy>(FileBusy.Idle);
  const progress = ref(0);
  const edits = ref(0);
  const savedEdits = ref(0);
  const failure = ref<string>();
  const ask = shallowRef<FileAsk>();
  const asking = ref(false);

  let reading: AbortController | undefined;

  const name = computed(() => options.fileName() ?? options.messages.value.fileDefaultName);

  const edited = computed(() => edits.value !== savedEdits.value);

  const raise = (next: FileAsk): void => {
    ask.value = next;
    asking.value = true;
  };

  const write = async (lossy: boolean): Promise<boolean> => {
    const texts = options.messages.value;
    const editsAtStart = edits.value;

    busy.value = FileBusy.Saving;
    failure.value = undefined;

    try {
      const { writeWorkbook } = await import('../../xlsx/write/write-workbook');

      const result = await writeWorkbook(options.book(), options.calculator(), {
        source: options.source(),
        lossy,
      });

      if (!result.ok) {
        raise({ kind: FileAskKind.Losses, losses: result.report.losses });
        return false;
      }

      const saved = { name: withExtension(name.value), bytes: result.bytes, report: result.report };

      await (options.adapter() ?? download)(saved);
      savedEdits.value = editsAtStart;
      options.saved(saved);
      options.announce(texts.fileSaved({ name: saved.name }));
      return true;
    } catch {
      failure.value = texts.fileSaveFailed;
      return false;
    } finally {
      busy.value = FileBusy.Idle;
    }
  };

  const read = async (file: File): Promise<boolean> => {
    const texts = options.messages.value;
    const controller = new AbortController();

    reading = controller;
    busy.value = FileBusy.Reading;
    progress.value = 0;
    failure.value = undefined;

    try {
      const { readWorkbook } = await import('../../xlsx/read/read-workbook');

      const result = await readWorkbook(new Uint8Array(await file.arrayBuffer()), {
        locale: options.locale(),
        signal: controller.signal,
        onProgress: ({ done, total }) => {
          progress.value = total > 0 ? done / total : 0;
        },
      });

      if (controller.signal.aborted) {
        return false;
      }
      if (result.kind === XlsxReadKind.Rejected) {
        failure.value = texts.fileRejected({ reason: result.reason });
        return false;
      }

      options.opened({
        fileName: file.name,
        book: result.book,
        calculator: result.calculator,
        report: result.report,
        source: result.source,
      });

      options.announce(texts.fileOpened({ name: file.name }));
      return true;
    } catch {
      if (!controller.signal.aborted) {
        failure.value = texts.fileOpenFailed;
      }
      return false;
    } finally {
      reading = undefined;
      busy.value = FileBusy.Idle;
    }
  };

  const save = (): Promise<boolean> => {
    if (busy.value !== FileBusy.Idle) {
      return Promise.resolve(false);
    }
    options.commitDraft();
    return write(false);
  };

  const open = (file: File): Promise<boolean> => {
    if (busy.value !== FileBusy.Idle) {
      return Promise.resolve(false);
    }
    if (edited.value) {
      raise({ kind: FileAskKind.Discard, file });
      return Promise.resolve(false);
    }
    return read(file);
  };

  const cancel = (): void => {
    reading?.abort();
  };

  const dismiss = (): void => {
    asking.value = false;
  };

  const confirm = (): void => {
    const current = ask.value;

    asking.value = false;

    if (current === undefined) {
      return;
    }
    switch (current.kind) {
      case FileAskKind.Losses:
        void write(true);
        break;
      case FileAskKind.Discard:
        void read(current.file);
        break;
    }
  };

  const clearFailure = (): void => {
    failure.value = undefined;
  };

  const noteEdit = (): void => {
    edits.value += 1;
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (!options.hotkeys() || !isPlainChord(event)) {
      return;
    }
    if (event.code === FileKey.Save) {
      event.preventDefault();
      void save();
    } else if (event.code === FileKey.Open) {
      event.preventDefault();
      options.pick();
    }
  };

  watch(options.book, () => {
    edits.value = 0;
    savedEdits.value = 0;
  });

  onBeforeUnmount(cancel);

  return {
    name,
    busy,
    progress,
    edited,
    failure,
    ask,
    asking,
    noteEdit,
    save,
    open,
    cancel,
    confirm,
    dismiss,
    clearFailure,
    onKeydown,
  };
};
