import { computed, watch, type ComputedRef, type Ref, type WatchSource } from 'vue';
import { formRulesMessages } from '@numior/forms';
import { useControls, useMessages, type NuiControlRegistry } from '@numior/primitives';
import type { TableNodeId } from '../../engine';
import { createEchoes } from '../table-echoes';
import { editorPlan } from '../table-editors';
import { cellValueOf } from '../table-format';
import type { BooleanTexts } from '../table-format';
import { leaveMergeBy, type TableMergeIndex } from '../table-merges';
import { parseCell } from '../table-parse';
import { sameSpot } from '../table-ranges';
import { ruleFailure } from '../table-rules';
import { useTableCellEditor, type TableCellEditor } from '../use-table-cell-editor';
import type { TableClipboard } from '../use-table-clipboard';
import { useTableEditing, type TableEditing } from '../use-table-editing';
import { useTablePicking, type TablePicking } from '../use-table-picking';
import type { TableRanges } from '../use-table-ranges';
import { nodeIdsOf, useTableRowPlaces } from '../use-table-row-places';
import {
  NuiTableEditRefusalReason,
  type NuiTableCellEditorProps,
  type NuiTableCellPosition,
  type NuiTableCellValue,
  type NuiTableClipboard,
  type NuiTableColumn,
  type NuiTableCommandSink,
  type NuiTableDraft,
  type NuiTableRange,
  type NuiTableRanges,
  type TableRowPlaces,
} from '../table.types';
import type { TableContext } from './table-context';

export interface EditingAreaOptions<T> {
  readonly leaves: () => readonly NuiTableColumn<T>[];
  readonly rows: () => readonly T[];
  readonly getKey: () => ((row: T) => TableNodeId) | undefined;
  readonly nested: () => boolean;
  readonly sourced: () => boolean;
  readonly locale: () => string;
  readonly booleanTexts: () => BooleanTexts;
  readonly controls: () => NuiControlRegistry | undefined;
  readonly grow: () => boolean;
  readonly keep: () => ((target: Element) => boolean) | undefined;
  readonly picking: () => ((draft: NuiTableDraft) => boolean) | undefined;
  readonly hooks: () => NuiTableClipboard<T> | undefined;
  readonly commands: () => NuiTableCommandSink<T> | undefined;
  readonly copyLimit: () => number;
  readonly errorId: () => string;
  readonly draft: Ref<NuiTableDraft | undefined>;
  readonly clipboard: TableClipboard;
  readonly ranges: TableRanges;
  readonly position: () => NuiTableCellPosition | undefined;
  readonly covered: (row: number, col: number) => boolean;
  readonly merges: () => TableMergeIndex;
  readonly whole: (range: NuiTableRange) => NuiTableRange;
  readonly locate: (target: EventTarget | null) => NuiTableCellPosition | undefined;
  readonly focusData: (position: NuiTableCellPosition) => void;
  readonly reveal: (position: NuiTableCellPosition) => boolean;
  readonly move: (position: NuiTableCellPosition) => boolean;
  readonly select: (ranges: NuiTableRanges) => void;
  readonly applied: (keys: readonly string[], changed?: readonly T[]) => void;
  readonly resetOn: WatchSource[];
}

export interface EditingArea<T> {
  readonly canEdit: ComputedRef<boolean>;
  readonly editing: TableEditing<T>;
  readonly cellEditor: TableCellEditor<T>;
  readonly picker: TablePicking;
  readonly rowPlaces: TableRowPlaces<T>;
  readonly editorProps: ComputedRef<NuiTableCellEditorProps | undefined>;
  readonly onEditorUpdate: (value: unknown) => void;
}

const clipboardOf = (): Clipboard | undefined =>
  typeof navigator === 'undefined' || !('clipboard' in navigator) ? undefined : navigator.clipboard;

const readClipboard = async (): Promise<string | null> => {
  try {
    return (await clipboardOf()?.readText()) ?? null;
  } catch {
    return null;
  }
};

export const useEditingArea = <T>(
  table: TableContext<T>,
  own: EditingAreaOptions<T>,
): EditingArea<T> => {
  const draftEchoes = createEchoes<NuiTableDraft | undefined>(Object.is);
  const ruleTexts = useMessages(formRulesMessages, own.locale);
  const kitControls = useControls();

  const canEdit = computed(() =>
    own.leaves().some((column) => column.editable !== undefined && column.editable !== false),
  );

  const editOn = computed(() => !table.loading() && canEdit.value);

  const bounds = (): { rows: number; cols: number } => ({
    rows: table.bodyRows(),
    cols: table.dataKeys().length,
  });

  const editableOf = (row: T, key: string): boolean => {
    const editable = table.columnAt(key).editable;
    return typeof editable === 'function' ? editable(row) : editable === true;
  };

  const rowByKey = computed(() => {
    const getKey = own.getKey();

    return getKey === undefined || own.nested()
      ? undefined
      : new Map(own.rows().map((row) => [getKey(row), row]));
  });

  const resolveRow = (row: T): T | undefined => {
    const getKey = own.getKey();

    return getKey === undefined || own.sourced() || rowByKey.value === undefined
      ? row
      : rowByKey.value.get(getKey(row));
  };

  const ownsCell = (element: Element | null): boolean =>
    element instanceof HTMLElement &&
    element.matches('.nui-table__cell') &&
    table.viewport.value?.contains(element) === true;

  const checkCell = (row: T, key: string, value: NuiTableCellValue): string | undefined => {
    const column = table.columnAt(key);

    return ruleFailure(column, value, {
      name: key,
      label: column.label,
      values: row,
      messages: ruleTexts.value,
    });
  };

  const editing = useTableEditing<T>({
    enabled: () => editOn.value,
    ranges: table.ranges,
    cell: own.position,
    rowAt: table.rowAtPosition,
    keyAt: (col) => table.dataKeys()[col],
    editable: editableOf,
    covered: own.covered,
    valueOf: (row, key) => cellValueOf(table.columnAt(key), row),
    resolve: resolveRow,
    limit: own.copyLimit,
    copy: () => own.clipboard.copy(false),
    emit: (event) => {
      table.emit('edit', event);
    },
    sink: own.commands,
    keys: table.dataKeys,
    applied: (keys, changed) => {
      own.applied(keys, changed);
    },
    parse: (row, key, text) =>
      parseCell(table.columnAt(key), text, row, own.locale(), own.booleanTexts()),
    readBlock: (data, target) => own.hooks()?.parse?.(data, target),
    pasteHook: (data, scope) => own.hooks()?.paste?.(data, scope),
    cutHook: (cutRanges) => own.hooks()?.cut?.(cutRanges) === true,
    check: checkCell,
    bounds,
    select: (next) => {
      own.ranges.replace(next);
    },
    readable: () => typeof clipboardOf()?.readText === 'function',
    read: readClipboard,
    owns: ownsCell,
    messages: table.messages,
    announce: table.announce,
  });

  const cellEditor = useTableCellEditor<T>({
    enabled: () => editOn.value,
    cell: own.position,
    rowAt: table.rowAtPosition,
    keyAt: (col) => table.dataKeys()[col],
    labelOf: (key) => table.columnAt(key).label,
    editable: editableOf,
    valueOf: (row, key) => cellValueOf(table.columnAt(key), row),
    plan: (row, key) =>
      editorPlan(
        table.columnAt(key),
        cellValueOf(table.columnAt(key), row),
        own.controls() ?? kitControls,
        own.locale(),
      ),
    check: checkCell,
    invalid: () => ruleTexts.value.invalid,
    save: (row, key, value) => {
      editing.commitCell(row, key, value);
    },
    fill: (key, value) => {
      const type = table.columnAt(key).type;

      editing.fillCells(value, (target) => table.columnAt(target).type === type);
    },
    share: (next) => {
      draftEchoes.sent(next);
      own.draft.value = next;
    },
    refuse: (row, key, reason) => {
      table.emit('editRefused', { row, key, reason });
    },
    bounds,
    locate: own.locate,
    leave: (from, move) => leaveMergeBy(own.merges(), from, move),
    focus: own.focusData,
    reveal: own.reveal,
    resetOn: own.resetOn,
    messages: table.messages,
    announce: table.announce,
  });

  const picker = useTablePicking({
    active: () => {
      const now = cellEditor.current();
      const picking = own.picking();

      return now !== undefined && picking?.(now) === true;
    },
    origin: () => cellEditor.session.value?.position,
    locate: (target) => {
      const cell =
        target instanceof Element && target.closest('.nui-table__editor') === null
          ? own.locate(target)
          : undefined;

      return sameSpot(cell, cellEditor.session.value?.position) ? undefined : cell;
    },
    cellAt: (x, y) => own.ranges.cellAtPoint(x, y),
    whole: own.whole,
    leave: (from, move) => leaveMergeBy(own.merges(), from, move),
    bounds,
    isRtl: table.isRtl,
    reveal: own.reveal,
    pick: (range) => {
      table.emit('pick', range);
    },
  });

  const pick = (event: KeyboardEvent): boolean => picker.onKeydown(event);
  const attach: NuiTableCellEditorProps['attach'] = (link) => cellEditor.attach(link);
  const commit: NuiTableCellEditorProps['commit'] = (move) => cellEditor.commit(move);

  const cancel = (): void => {
    cellEditor.cancel();
  };

  const composed = (): void => {
    cellEditor.composed();
  };

  const revealEdited = (): boolean => cellEditor.reveal();

  const editorProps = computed((): NuiTableCellEditorProps | undefined => {
    const current = cellEditor.session.value;

    return current === undefined
      ? undefined
      : {
          spec: current.spec,
          value: cellEditor.draft.value,
          label: current.label,
          errorId: own.errorId(),
          error: cellEditor.error.value,
          typed: current.typed,
          passive: current.passive,
          caret: current.caret,
          grow: own.grow(),
          keep: own.keep(),
          pick,
          attach,
          commit,
          cancel,
          composed,
          reveal: revealEdited,
        };
  });

  const onEditorUpdate = (value: unknown): void => {
    picker.reset();
    cellEditor.input(value);
  };

  const bodyPositionsOf = (wanted: readonly T[]): ReadonlyMap<T, number> => {
    const ids = nodeIdsOf(wanted, own.rows(), own.getKey());
    const start = table.pageStart();

    return table.engine.value
      .positionsOf((node) => ids.has(node), ids.size)
      .reduce((found, [node, position]) => {
        const row = ids.get(node);
        const body = position - start;

        if (row !== undefined && body >= 0 && body < table.bodyRows()) {
          found.set(row, body);
        }
        return found;
      }, new Map<T, number>());
  };

  const rowPlaces = useTableRowPlaces<T>({
    active: own.position,
    editing: () => {
      const current = cellEditor.session.value;

      return current === undefined ? undefined : { row: current.row, col: current.position.col };
    },
    ranges: table.ranges,
    rowAt: table.rowAtPosition,
    locate: bodyPositionsOf,
    move: own.move,
    drop: (held) => {
      const key = table.dataKeys()[held.col];

      if (key !== undefined) {
        table.emit('editRefused', {
          row: held.row,
          key,
          reason: NuiTableEditRefusalReason.RowGone,
        });
      }

      cellEditor.reset();
    },
    select: own.select,
  });

  watch(own.draft, (next) => {
    if (draftEchoes.echoed(next)) {
      return;
    }

    cellEditor.receive(next);
  });

  watch(cellEditor.session, () => {
    picker.reset();
  });

  return { canEdit, editing, cellEditor, picker, rowPlaces, editorProps, onEditorUpdate };
};
