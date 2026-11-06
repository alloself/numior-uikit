import { Key } from '@numior/primitives';
import {
  NuiTableEditMode,
  NuiTableEditMove,
  type NuiTableRanges,
  type TableCellPosition,
} from '@numior/table';
import { computed, ref, shallowRef } from 'vue';
import { formatCell, type CellRange } from '../core';
import type { FormulaBar, FormulaBarOptions, SheetCells } from './sheet.types';
import { targetOf } from './sheet-navigation';

const LINE_BREAK = '\n';

const textOf = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  return typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
};

const commitMoveOf = (event: KeyboardEvent): NuiTableEditMove | undefined => {
  if (event.key === Key.Tab) {
    return event.shiftKey ? NuiTableEditMove.Previous : NuiTableEditMove.Next;
  }
  if (event.key === Key.Enter && !event.altKey) {
    return event.shiftKey ? NuiTableEditMove.Up : NuiTableEditMove.Down;
  }
  return undefined;
};

const inside = (target: EventTarget | null, element: HTMLElement | null): boolean =>
  target instanceof Node && element?.contains(target) === true;

const positionsOf = (
  cells: SheetCells,
  range: CellRange,
): readonly [TableCellPosition, TableCellPosition] => [
  { row: cells.rowNear(range.top), col: cells.colNear(range.left) },
  { row: cells.rowNear(range.bottom), col: cells.colNear(range.right) },
];

export const useFormulaBar = (options: FormulaBarOptions): FormulaBar => {
  const { editing } = options;

  const active = shallowRef<TableCellPosition>();
  const ranges = shallowRef<NuiTableRanges>([]);
  const nameDraft = ref<string>();
  const nameInvalid = ref(false);
  const expanded = ref(false);
  const announcement = ref('');

  const cellName = computed(() => {
    const position = active.value;
    const cells = options.cells();

    return position === undefined || cells === undefined
      ? ''
      : formatCell({ row: cells.rowAt(position.row), col: cells.colAt(position.col) });
  });

  const nameText = computed(() => nameDraft.value ?? cellName.value);

  const formulaText = computed(() => {
    const draft = editing.draft.value;

    if (draft !== undefined) {
      return textOf(draft.value);
    }
    return active.value === undefined ? '' : editing.inputAt(active.value);
  });

  const keepEditing = (target: Element): boolean => inside(target, options.bar.value);

  const toggle = (): void => {
    expanded.value = !expanded.value;
  };

  const backToGrid = (): void => {
    if (active.value !== undefined) {
      options.table.value?.focusCell(active.value);
    }
  };

  const go = (text: string): boolean => {
    const book = options.book();
    const sheet = options.sheet();
    const cells = options.cells();
    const range = sheet === undefined ? undefined : targetOf(book, sheet, text);

    if (range === undefined || cells === undefined) {
      return false;
    }

    const [from, to] = positionsOf(cells, range);

    options.table.value?.focusCell(from);
    ranges.value = from.row === to.row && from.col === to.col ? [] : [{ from, to }];
    return true;
  };

  const onNameFocus = (): void => {
    options.nameField.value?.select();
  };

  const onNameInput = (): void => {
    nameDraft.value = options.nameField.value?.value ?? '';
    nameInvalid.value = false;
  };

  const onNameKeydown = (event: KeyboardEvent): void => {
    if (event.key === Key.Escape) {
      event.preventDefault();
      nameDraft.value = undefined;
      nameInvalid.value = false;
      backToGrid();
      return;
    }
    if (event.key !== Key.Enter) {
      return;
    }
    event.preventDefault();

    const text = options.nameField.value?.value ?? '';

    if (go(text)) {
      nameDraft.value = undefined;
      nameInvalid.value = false;
      announcement.value = '';
      return;
    }
    nameInvalid.value = true;
    announcement.value = options.messages.value.unknownName({ name: text.trim() });
  };

  const onNameBlur = (): void => {
    nameDraft.value = undefined;
    nameInvalid.value = false;
  };

  const onFormulaFocus = (): void => {
    if (!options.readonly() && editing.draft.value === undefined) {
      options.table.value?.startEdit(NuiTableEditMode.Append, { focus: false });
    }
  };

  const onFormulaInput = (): void => {
    const draft = editing.draft.value;
    const field = options.formulaField.value;

    if (draft !== undefined && field !== null) {
      editing.setDraft({ ...draft, value: field.value });
    }
  };

  const breakLine = (): void => {
    const field = options.formulaField.value;

    if (field !== null) {
      field.setRangeText(LINE_BREAK, field.selectionStart, field.selectionEnd, 'end');
      onFormulaInput();
    }
  };

  const onFormulaKeydown = (event: KeyboardEvent): void => {
    const table = options.table.value;
    const move = commitMoveOf(event);

    if (table === null || editing.draft.value === undefined) {
      if (event.key === Key.Escape) {
        event.preventDefault();
        backToGrid();
      }
      return;
    }
    if (event.key === Key.Enter && event.altKey) {
      event.preventDefault();
      breakLine();
    } else if (event.key === Key.Escape) {
      event.preventDefault();
      table.cancelEdit();
    } else if (move !== undefined) {
      event.preventDefault();
      table.commitEdit(move);
    }
  };

  const onFormulaBlur = (event: FocusEvent): void => {
    if (editing.draft.value !== undefined && !inside(event.relatedTarget, options.root.value)) {
      options.table.value?.commitEdit(NuiTableEditMove.Blur);
    }
  };

  return {
    active,
    ranges,
    nameText,
    nameInvalid,
    formulaText,
    expanded,
    announcement,
    keepEditing,
    toggle,
    onNameFocus,
    onNameInput,
    onNameKeydown,
    onNameBlur,
    onFormulaFocus,
    onFormulaInput,
    onFormulaKeydown,
    onFormulaBlur,
  };
};
