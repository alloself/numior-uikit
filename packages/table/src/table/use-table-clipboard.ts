import { ref, type ComputedRef, type Ref } from 'vue';
import { useClipboard } from '@numior/primitives';
import { yieldToHost } from '../engine';
import { copyShapeOf, spanItems, spanLength, type RangeSpan } from './table-ranges';
import { htmlOf, tsvOf } from './table-clipboard';
import type { NuiTableMessages } from './table.messages';
import type { NuiTableRanges } from './table.types';

export interface TableCopyCell<T> {
  readonly row: T;
  readonly key: string;
}

export interface TableClipboardOptions<T> {
  readonly ranges: () => NuiTableRanges;
  readonly cell: () => TableCopyCell<T> | undefined;
  readonly rowAt: (position: number) => T | undefined;
  readonly keyAt: (col: number) => string | undefined;
  readonly labelOf: (key: string) => string;
  readonly textOf: (row: T, key: string) => string;
  readonly limit: () => number;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
}

export interface TableClipboard {
  readonly busy: Readonly<Ref<boolean>>;
  copyable(): boolean;
  copy(headers: boolean): Promise<boolean>;
  onKeydown(event: KeyboardEvent): boolean;
}

interface CopyJob<T> {
  readonly keys: readonly string[];
  readonly spans: readonly RangeSpan[];
  readonly max: number;
  readonly lines: string[][];
  readonly rowAt: (position: number) => T | undefined;
  span: number;
  position: number;
}

type CopyPlan<T> =
  | { readonly kind: 'cell'; readonly cell: TableCopyCell<T> }
  | {
      readonly kind: 'block';
      readonly keys: readonly string[];
      readonly spans: readonly RangeSpan[];
    }
  | { readonly kind: 'disjoint' };

const SYNC_CELLS = 50_000;
const CHUNK_CELLS = 20_000;

const isCopyKey = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) &&
  !event.shiftKey &&
  !event.altKey &&
  (event.code === 'KeyC' || event.key.toLowerCase() === 'c');

const isCellTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches('.nui-table__cell');

const selectsText = (target: EventTarget | null): boolean => {
  const selection = typeof window === 'undefined' ? null : window.getSelection();

  return (
    selection !== null &&
    !selection.isCollapsed &&
    target instanceof Node &&
    selection.containsNode(target, true)
  );
};

const advance = <T>(
  job: CopyJob<T>,
  textOf: (row: T, key: string) => string,
  steps: number,
): boolean => {
  for (let step = 0; step < steps; step += 1) {
    const span = job.spans[job.span];

    if (span === undefined || job.lines.length >= job.max) {
      return true;
    }
    const row = job.rowAt(job.position);

    if (row !== undefined) {
      job.lines.push(job.keys.map((key) => textOf(row, key)));
    }
    if (job.position >= span.end) {
      job.span += 1;
      job.position = job.spans[job.span]?.start ?? 0;
    } else {
      job.position += 1;
    }
  }
  return job.spans[job.span] === undefined || job.lines.length >= job.max;
};

export const useTableClipboard = <T>(options: TableClipboardOptions<T>): TableClipboard => {
  const busy = ref(false);
  const clipboard = useClipboard();

  const planOf = (): CopyPlan<T> | undefined => {
    const ranges = options.ranges();

    if (ranges.length === 0) {
      const cell = options.cell();
      return cell === undefined ? undefined : { kind: 'cell', cell };
    }
    const shape = copyShapeOf(ranges);

    if (shape.kind === 'disjoint') {
      return shape;
    }

    const keys = spanItems(shape.cols).flatMap((col) => {
      const key = options.keyAt(col);
      return key === undefined ? [] : [key];
    });

    return { kind: 'block', keys, spans: shape.rows };
  };

  const write = async (
    header: readonly string[] | undefined,
    lines: readonly (readonly string[])[],
    done: string,
  ): Promise<boolean> => {
    const text = tsvOf(header === undefined ? lines : [header, ...lines]);
    const copied = await clipboard.copyRich({ text, html: htmlOf(header, lines) });

    options.announce(copied ? done : options.messages.value.copyFailed);
    return copied;
  };

  const headerOf = (keys: readonly string[], headers: boolean): readonly string[] | undefined =>
    headers ? keys.map(options.labelOf) : undefined;

  const doneOf = (job: CopyJob<T>): string => {
    const texts = options.messages.value;
    const total = spanLength(job.spans);

    return job.spans[job.span] === undefined
      ? texts.copied({ count: job.lines.length })
      : texts.copiedPart({ count: job.lines.length, total });
  };

  const copyBlock = async (
    plan: Extract<CopyPlan<T>, { kind: 'block' }>,
    headers: boolean,
  ): Promise<boolean> => {
    const width = Math.max(1, plan.keys.length);

    const job: CopyJob<T> = {
      keys: plan.keys,
      spans: plan.spans,
      max: Math.max(1, Math.floor(options.limit() / width)),
      lines: [],
      rowAt: options.rowAt,
      span: 0,
      position: plan.spans[0]?.start ?? 0,
    };

    if (spanLength(plan.spans) * width > SYNC_CELLS) {
      const chunk = Math.max(1, Math.floor(CHUNK_CELLS / width));

      busy.value = true;

      while (!advance(job, options.textOf, chunk)) {
        await yieldToHost();
      }
      busy.value = false;
    } else {
      advance(job, options.textOf, Number.POSITIVE_INFINITY);
    }
    return write(headerOf(plan.keys, headers), job.lines, doneOf(job));
  };

  const copy = (headers: boolean): Promise<boolean> => {
    const plan = planOf();

    switch (plan?.kind) {
      case undefined:
        return Promise.resolve(false);
      case 'disjoint':
        options.announce(options.messages.value.copyDisjoint);
        return Promise.resolve(false);
      case 'cell':
        return write(
          headerOf([plan.cell.key], headers),
          [[options.textOf(plan.cell.row, plan.cell.key)]],
          options.messages.value.copied({ count: 1 }),
        );
      case 'block':
        return copyBlock(plan, headers);
    }
  };

  return {
    busy,
    copyable: () => {
      const plan = planOf();
      return plan !== undefined && plan.kind !== 'disjoint';
    },
    copy,
    onKeydown: (event) => {
      const copyable = isCopyKey(event) && isCellTarget(event.target) && !selectsText(event.target);

      if (!copyable || planOf() === undefined) {
        return false;
      }
      event.preventDefault();
      void copy(false);
      return true;
    },
  };
};
