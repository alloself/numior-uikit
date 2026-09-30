import { ref, type ComputedRef, type Ref } from 'vue';
import { yieldToHost } from '../engine';
import { csvLine } from './table-clipboard';
import type { NuiTableMessages } from './table.messages';
import type { NuiTableCsvOptions } from './table.types';

export interface TableExportOptions<T> {
  readonly indices: () => Uint32Array;
  readonly rowAt: (index: number) => T | undefined;
  readonly keys: () => readonly string[];
  readonly labelOf: (key: string) => string;
  readonly textOf: (row: T, key: string) => string;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
}

export interface TableExport {
  readonly busy: Readonly<Ref<boolean>>;
  exportCsv(options?: NuiTableCsvOptions): Promise<string>;
}

const CHUNK_ROWS = 5000;
const LINE_BREAK = '\r\n';

export const useTableExport = <T>(options: TableExportOptions<T>): TableExport => {
  const busy = ref(false);

  const chunkOf = (
    indices: Uint32Array,
    start: number,
    keys: readonly string[],
    separator: string,
  ): string[] =>
    [...indices.subarray(start, start + CHUNK_ROWS)].flatMap((index) => {
      const row = options.rowAt(index);

      return row === undefined
        ? []
        : [
            csvLine(
              keys.map((key) => options.textOf(row, key)),
              separator,
            ),
          ];
    });

  const exportCsv = async (settings: NuiTableCsvOptions = {}): Promise<string> => {
    const separator = settings.separator ?? ',';
    const keys = options.keys();
    const indices = options.indices();

    const header =
      settings.headers === false ? [] : [csvLine(keys.map(options.labelOf), separator)];

    const lines: string[] = [];

    busy.value = indices.length > CHUNK_ROWS;

    try {
      for (let start = 0; start < indices.length; start += CHUNK_ROWS) {
        settings.signal?.throwIfAborted();
        lines.push(...chunkOf(indices, start, keys, separator));

        if (start + CHUNK_ROWS < indices.length) {
          await yieldToHost();
        }
      }
    } finally {
      busy.value = false;
    }
    options.announce(options.messages.value.exported({ count: lines.length }));
    return [...header, ...lines].join(LINE_BREAK);
  };

  return { busy, exportCsv };
};
