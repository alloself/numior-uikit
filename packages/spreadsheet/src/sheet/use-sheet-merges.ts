import { TableCellsMerge, TableCellsSplit } from '@lucide/vue';
import type { NuiMenuEntry } from '@numior/vue';
import { markRaw } from 'vue';
import {
  mergeBlocked,
  mergeCells,
  mergeableRanges,
  mergesMeeting,
  unmergeCells,
  type CellRange,
  type Sheet,
} from '../core';
import {
  NuiSpreadsheetRefusalReason,
  type SheetMerges,
  type SheetMergesOptions,
} from './sheet.types';

interface MergeScope {
  readonly sheet: Sheet;
  readonly ranges: readonly CellRange[];
}

const MERGE_ICON = markRaw(TableCellsMerge);

const UNMERGE_ICON = markRaw(TableCellsSplit);

const meetsMerges = (scope: MergeScope): boolean =>
  scope.ranges.some((range) => mergesMeeting(scope.sheet, range).length > 0);

export const useSheetMerges = (options: SheetMergesOptions): SheetMerges => {
  const scope = (): MergeScope | undefined => {
    const sheet = options.sheet();
    const selection = options.selection.current.value;

    return sheet === undefined || selection === undefined || options.readonly()
      ? undefined
      : { sheet, ranges: selection.ranges };
  };

  const merge = (): boolean => {
    const found = scope();
    const ranges = found === undefined ? [] : mergeableRanges(found.sheet, found.ranges);
    const texts = options.messages.value;

    if (found === undefined || ranges.length === 0) {
      return false;
    }
    if (mergeBlocked(options.book(), found.sheet, ranges)) {
      options.refuse(NuiSpreadsheetRefusalReason.MergeBlocked, texts.mergeBlocked);
      return false;
    }

    const plan = mergeCells(options.book(), options.calculator(), found.sheet, ranges);

    if (!options.editing.apply(plan.steps)) {
      return false;
    }
    if (plan.dropped > 0) {
      options.notify(texts.cellsMergedFirst);
      return true;
    }

    options.announce(texts.cellsMerged);
    return true;
  };

  const unmerge = (): boolean => {
    const found = scope();

    if (found === undefined || !options.editing.apply(unmergeCells(found.sheet, found.ranges))) {
      return false;
    }

    options.announce(options.messages.value.cellsUnmerged);
    return true;
  };

  const tools = (): readonly NuiMenuEntry[] => {
    const found = scope();
    const texts = options.messages.value;
    const entries: NuiMenuEntry[] = [];

    if (found === undefined) {
      return entries;
    }
    if (mergeableRanges(found.sheet, found.ranges).length > 0) {
      entries.push({ key: 'merge', label: texts.mergeCells, icon: MERGE_ICON, onSelect: merge });
    }
    if (meetsMerges(found)) {
      entries.push({
        key: 'unmerge',
        label: texts.unmergeCells,
        icon: UNMERGE_ICON,
        onSelect: unmerge,
      });
    }
    return entries;
  };

  return { merge, unmerge, tools };
};
