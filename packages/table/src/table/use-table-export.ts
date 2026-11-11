import { ref, type ComputedRef, type Ref } from 'vue';
import { yieldToHost } from '../engine';
import { csvLine } from './table-clipboard';
import type { NuiTableMessages } from './table.messages';
import type { NuiTableCsvOptions } from './table.types';

export interface TableExportOptions<T> {
  readonly rows: (signal: AbortSignal | undefined) => Promise<readonly T[]>;
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
    rows: readonly T[],
    start: number,
    keys: readonly string[],
    separator: string,
    formulas: boolean,
  ): string[] =>
    rows.slice(start, start + CHUNK_ROWS).map((row) =>
      csvLine(
        keys.map((key) => options.textOf(row, key)),
        separator,
        { formulas },
      ),
    );

  const exportCsv = async (settings: NuiTableCsvOptions = {}): Promise<string> => {
    const separator = settings.separator ?? ',';
    const formulas = settings.formulas ?? false;
    const keys = options.keys();

    const header =
      settings.headers === false
        ? []
        : [csvLine(keys.map(options.labelOf), separator, { formulas })];

    const lines: string[] = [];

    busy.value = true;

    try {
      const rows = await options.rows(settings.signal);

      for (let start = 0; start < rows.length; start += CHUNK_ROWS) {
        settings.signal?.throwIfAborted();
        for (const entry of chunkOf(rows, start, keys, separator, formulas)) {
          lines.push(entry);
        }

        if (start + CHUNK_ROWS >= rows.length) {
          continue;
        }

        await yieldToHost();
      }
    } finally {
      busy.value = false;
    }
    options.announce(options.messages.value.exported({ count: lines.length }));
    return [...header, ...lines].join(LINE_BREAK);
  };

  return { busy, exportCsv };
};
